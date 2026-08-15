import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { APP_URL } from '@/lib/config'

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
      return NextResponse.json({ success: true, message: 'Notifications disabled' })
    }

    const { sessionId, addedUserIds, addedByName } = await request.json()

    if (!Array.isArray(addedUserIds) || addedUserIds.length === 0) {
      return NextResponse.json({ success: true, message: 'No users to notify' })
    }

    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, wants_notifications')
      .in('id', addedUserIds)

    const recipients: Array<{ email: string; name: string }> = []
    for (const profile of profiles || []) {
      if (profile.wants_notifications === false) continue
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
      if (authUser?.user?.email) {
        recipients.push({ email: authUser.user.email, name: profile.name })
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json({ success: true, message: 'No reachable recipients' })
    }

    const formattedDate = new Date(session.date_time).toLocaleString('en-US', {
      timeZone: 'Asia/Hong_Kong',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i]
      try {
        await resend.emails.send({
          from: 'Pickle Time <bobby.ng@unpredikable.com>',
          to: r.email,
          subject: `🏓 ${addedByName} added you to ${session.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #0f766e; text-align: center;">You're In!</h1>
              <p>Hi ${r.name},</p>
              <p><strong>${addedByName}</strong> added you to a pickleball session.</p>
              <div style="background: #f0fdfa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h2 style="color: #134e4a; margin-top: 0;">${session.title}</h2>
                <p>📅 <strong>When:</strong> ${formattedDate} (HKT)</p>
                <p>📍 <strong>Where:</strong> ${session.location}</p>
                ${session.notes ? `<p>📝 <strong>Notes:</strong> ${session.notes}</p>` : ''}
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}"
                   style="background: #0f766e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  View Session
                </a>
              </div>
              <p style="font-size: 12px; color: #888;">If you can't make it, open the app and tap Cancel.</p>
            </div>
          `
        })
      } catch (emailError) {
        console.error('❌ Failed to send added-to-session email to:', r.email, emailError)
      }
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 600))
      }
    }

    return NextResponse.json({ success: true, emailsSent: recipients.length })
  } catch (error: any) {
    console.error('Error in send-added-to-session-email:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
