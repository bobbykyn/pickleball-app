import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

// Lazy init so env vars aren't required at build time (page-data collection).
export const dynamic = 'force-dynamic'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }
  )
}

export async function POST(request: Request) {
  try {
    const resend = getResend()
    const supabase = getSupabase()

    if (process.env.DISABLE_EMAIL_NOTIFICATIONS === 'true') {
      console.log('Update email notifications disabled via environment variable')
      return NextResponse.json({ success: true, message: 'Notifications disabled' })
    }

    const { sessionId } = await request.json()
    
    // Get session details and participant RSVPs
    const { data: session } = await supabase
      .from('sessions')
      .select('*, rsvps(*, profiles(*))')
      .eq('id', sessionId)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Notify all participants with status 'yes' or 'maybe'
    const participants = session.rsvps?.filter((r: any) => r.status === 'yes' || r.status === 'maybe') || []
    
    const users = []
    for (const rsvp of participants) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(rsvp.user_id)
      if (!authError && authUser?.user?.email) {
        users.push({
          email: authUser.user.email,
          name: rsvp.profiles?.name || 'Player'
        })
      }
    }

    if (users.length === 0) {
      return NextResponse.json({ success: true, message: 'No participants to notify' })
    }

    // Send update email in HK timezone
    const formattedDate = new Date(session.date_time).toLocaleString('en-US', {
      timeZone: 'Asia/Hong_Kong',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      try {
        await resend.emails.send({
          from: 'Pickle Time <bobby.ng@unpredikable.com>',
          to: user.email,
          subject: `🔄 Game Updated: ${session.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #0f766e; text-align: center;">🔄 Session Details Updated!</h1>
              <p>Hi ${user.name},</p>
              <p>The details for the pickleball session <strong>"${session.title}"</strong> have been updated.</p>
              
              <div style="background: #f0fdfa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #134e4a; margin-top: 0;">New Details:</h3>
                <p>📅 <strong>When:</strong> ${formattedDate} (HKT)</p>
                <p>📍 <strong>Where:</strong> ${session.location}</p>
                ${session.notes ? `<p>📝 <strong>Notes:</strong> ${session.notes}</p>` : ''}
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://pickleball-app-1.vercel.app" 
                   style="background: #0f766e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  View Session
                </a>
              </div>
            </div>
          `
        })
        console.log('✅ Update email sent to:', user.email)
      } catch (emailError) {
        console.error('❌ Failed to send update email to:', user.email, emailError)
      }

      if (i < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 600))
      }
    }

    return NextResponse.json({ success: true, emailsSent: users.length })
  } catch (error: any) {
    console.error('Error in send-session-update-email:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
