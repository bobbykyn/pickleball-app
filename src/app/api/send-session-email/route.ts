import { NextRequest, NextResponse } from 'next/server'
import { sendSessionCreatedEmail } from '@/lib/email'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    // Get session details with creator info
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        profiles:created_by(name)
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get all user emails who want notifications
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('wants_notifications', true)

    if (profilesError) {
      return NextResponse.json({ error: 'Failed to get recipients' }, { status: 500 })
    }

    // Filter out the creator (they don't need to email themselves)
    const recipients = profiles
      ?.filter(profile => profile.id !== session.created_by)
      ?.map(profile => profile.email)
      ?.filter(Boolean) || []

    if (recipients.length === 0) {
      return NextResponse.json({ message: 'No recipients found' })
    }

    // Send email
    const emailResult = await sendSessionCreatedEmail(recipients, {
      title: session.title,
      dateTime: session.date_time,
      location: session.location,
      creatorName: session.profiles?.name || 'Someone',
      costPerPerson: session.total_cost || 0,
      sessionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://pickleball-app-1.vercel.app'}`
    })

    if (!emailResult.success) {
      return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Emails sent to ${recipients.length} recipients` 
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}