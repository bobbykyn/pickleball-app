import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
)

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json()
    
    // Get session details
    const { data: session } = await supabase
      .from('sessions')
      .select('*, profiles:created_by(name)')
      .eq('id', sessionId)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    
    // Get ALL users to notify (excluding creator)
    // First get all profile IDs except the creator
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, wants_notifications')
      .neq('id', session.created_by)
      .eq('wants_notifications', true)

    if (profilesError || !profiles || profiles.length === 0) {
      console.log('No profiles found or error:', profilesError)
      return NextResponse.json({ 
        error: 'No users to notify',
        debug: { profilesError, profilesCount: profiles?.length || 0 }
      })
    }

    // Get emails from auth.users for each profile
    const users = []
    for (const profile of profiles) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.id)
      if (!authError && authUser?.user?.email) {
        users.push({
          email: authUser.user.email,
          name: profile.name
        })
      } else {
        console.log(`Could not get email for user ${profile.id}:`, authError)
      }
    }

    // DEBUGGING
    console.log('Found users:', users)
    console.log('Number of users found:', users?.length || 0)
    console.log('Sending to these emails:', users?.map(u => u.email))

    if (!users || users.length === 0) {
      console.log('DEBUG - No users found to notify')
      console.log('DEBUG - Session creator ID:', session.created_by)
      
      return NextResponse.json({ 
        error: 'No users to notify',
        debug: {
          usersCount: users?.length || 0,
          creatorId: session.created_by
        }
      })
    }
    
    // Send emails
    for (const user of users) {
      console.log('Sending email to:', user.email)
      await resend.emails.send({
        from: 'Pickle Time <noreply@resend.dev>',
        to: user.email,
        subject: `Let's Pickle Time! @ 雞仔Pickle: ${session.title}`,
        html: `
          <h2>New session created!</h2>
          <p><strong>${session.title}</strong></p>
          <p>📅 ${new Date(session.date_time).toLocaleString()}</p>
          <p>📍 ${session.location}</p>
          <a href="https://pickleball-app-1.vercel.app">Join Now</a>
        `
      })
    }
    
    return NextResponse.json({ success: true, emailsSent: users.length })
  } catch (error: any) {
    console.error('Error in send-session-email:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}