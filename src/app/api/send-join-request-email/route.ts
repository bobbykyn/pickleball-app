import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getServiceSupabase } from '@/lib/serverSupabase'
import { APP_URL } from '@/lib/config'

// Tells the session host that someone asked to join. Admins are not emailed;
// they approve from the session card in the app.
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    if (process.env.DISABLE_EMAIL_NOTIFICATIONS === 'true') {
      return NextResponse.json({ success: true, message: 'Notifications disabled' })
    }
    const { sessionId, requesterName } = await request.json()
    const db = getServiceSupabase()

    const { data: session } = await db
      .from('sessions')
      .select('id, title, date_time, location, created_by')
      .eq('id', sessionId)
      .single()
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const { data: host } = await db.auth.admin.getUserById(session.created_by)
    const email = host?.user?.email
    if (!email) return NextResponse.json({ success: true, message: 'Host has no email' })

    const when = new Date(session.date_time).toLocaleString('en-US', {
      timeZone: 'Asia/Hong_Kong', weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    const who = String(requesterName || 'Someone')

    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: 'Pickle Time <bobby.ng@unpredikable.com>',
      to: email,
      subject: `🙋 ${who} wants to join ${session.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="margin-top: 0;">Join request</h2>
          <p><strong>${who}</strong> asked to join your session.</p>
          <p>📅 ${when} (HKT)<br>📍 ${session.location}</p>
          <p style="margin: 28px 0;">
            <a href="${APP_URL}/" style="background: #0f766e; color: white; padding: 14px 26px; text-decoration: none; border-radius: 8px; font-weight: bold;">Approve or decline</a>
          </p>
          <p style="font-size: 12px; color: #888;">Open the session card in the app — pending requests are listed there.</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('send-join-request-email error:', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}
