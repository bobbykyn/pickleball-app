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
    // Check if notifications are disabled
    if (process.env.DISABLE_EMAIL_NOTIFICATIONS === 'true') {
      console.log('Email notifications disabled via environment variable')
      return NextResponse.json({ success: true, message: 'Notifications disabled' })
    }

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
    
    // Determine who to notify based on session type
    let profiles: any[] = []
    let profilesError: any = null

    if (session.is_private) {
      // For private sessions, only notify invited users
      if (session.invited_users && session.invited_users.length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, wants_notifications')
          .in('id', session.invited_users)
          .eq('wants_notifications', true)
        
        profiles = data || []
        profilesError = error
        
        // After line 51, ADD this:
        // Debug check - log what would be sent
if (process.env.DISABLE_EMAIL_NOTIFICATIONS === 'true') {
  console.log('📧 EMAIL DEBUG - Session:', session.title)
  console.log('Is Private:', session.is_private)
  console.log('Invited Users:', session.invited_users)
  console.log('Found profiles to notify:', profiles)
  // Don't return here - let it continue to gather users for debugging
}
      }
    } else {
      // For public sessions, notify all users except creator
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, wants_notifications')
        .neq('id', session.created_by)
        .eq('wants_notifications', true)
      
      profiles = data || []
      profilesError = error
    }

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
    
// Check if notifications are disabled and log debug info
if (process.env.DISABLE_EMAIL_NOTIFICATIONS === 'true') {
  console.log('📧 EMAIL DEBUG - Would send to:', users.map(u => u.email))
  console.log('Session type:', session.is_private ? 'private' : 'public')
  console.log('Invited users:', session.invited_users)
  return NextResponse.json({ 
    success: true, 
    message: 'Notifications disabled - check Vercel logs',
    debug: { 
      wouldNotify: users.map(u => ({ email: u.email, name: u.name })),
      sessionType: session.is_private ? 'private' : 'public',
      invitedUsers: session.invited_users
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