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

    // DEBUG: Also get all profiles to see what's in the database
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('profiles')
      .select('id, name, wants_notifications')
    
    console.log('DEBUG - All profiles in database:', allProfiles)
    console.log('DEBUG - Profiles with wants_notifications=true:', profiles)
    console.log('DEBUG - Session creator ID:', session.created_by)

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
    
    // Send emails with rate limiting (2 requests per second max)
    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      console.log('Sending email to:', user.email)
      
      try {
        await resend.emails.send({
          from: 'Pickle Time <bobby.ng@unpredikable.com>',
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
        console.log('✅ Email sent successfully to:', user.email)
      } catch (emailError) {
        console.error('❌ Failed to send email to:', user.email, emailError)
      }
      
      // Add delay between emails to respect rate limits (2 per second = 500ms delay)
      if (i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 600)) // 600ms delay
      }
    }
    
    return NextResponse.json({ success: true, emailsSent: users.length })
  } catch (error: any) {
    console.error('Error in send-session-email:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}