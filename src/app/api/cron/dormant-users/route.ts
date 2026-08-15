import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { APP_URL } from '@/lib/config'

export const dynamic = 'force-dynamic'

const DORMANT_DAYS = 90 // ~3 months

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

function dormantEmailHtml(name: string | null) {
  const hi = name ? name : 'there'
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background:#0D1B2A; color:#F2E7D6; border-radius:12px;">
      <h1 style="color:#C0392B; text-align:center; letter-spacing:1px; margin:0 0 4px;">匹克廚房 · PICKLE KITCHEN</h1>
      <p style="text-align:center; color:#2A6A5A; font-size:12px; letter-spacing:2px; margin:0 0 24px;">GEAR UP. PLAY WELL. LIVE MORE.</p>
      <div style="background:#16222F; border-radius:8px; padding:20px;">
        <h2 style="color:#F2E7D6; margin-top:0;">We've paused your game alerts 😴</h2>
        <p style="color:#cdbfa9; line-height:1.6;">
          Hi ${hi}, we haven't seen you in the kitchen for a while. To keep your inbox clean,
          we've <strong>paused email notifications</strong> for new games.
        </p>
        <p style="color:#cdbfa9; line-height:1.6;">
          Want back in? Just <strong>log in again</strong> and we'll switch your new-game alerts right back on.
        </p>
        <div style="text-align:center; margin:28px 0 8px;">
          <a href="${APP_URL}" style="background:#C0392B; color:#fff; padding:14px 28px; text-decoration:none; border-radius:8px; font-weight:bold; display:inline-block; letter-spacing:1px;">
            LOG IN TO RESUME
          </a>
        </div>
      </div>
      <p style="text-align:center; color:#687280; font-size:11px; margin-top:16px;">
        You're receiving this because notifications were on but the account has been inactive for 3 months.
      </p>
    </div>
  `
}

async function runDormancyCheck() {
  const admin = getAdminClient()
  const resend = new Resend(process.env.RESEND_API_KEY)
  const cutoff = Date.now() - DORMANT_DAYS * 24 * 60 * 60 * 1000

  // All auth users (id, email, activity timestamps)
  const { data: authData, error: authErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (authErr) throw authErr

  // Profile data including last in-app activity
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, name, wants_notifications, notifications_suspended, last_active_at')
  const pmap = new Map((profiles || []).map((p: any) => [p.id, p]))

  // Dormant = latest of (in-app activity, last sign-in, account creation) is older than cutoff
  const dormant = (authData?.users || []).filter((u) => {
    const p: any = pmap.get(u.id)
    const stamps = [p?.last_active_at, u.last_sign_in_at, u.created_at]
      .filter(Boolean)
      .map((s) => new Date(s as string).getTime())
    const lastActivity = stamps.length ? Math.max(...stamps) : 0
    return lastActivity > 0 && lastActivity < cutoff
  })
  if (dormant.length === 0) {
    return { checked: authData?.users?.length || 0, dormant: 0, suspended: 0, emails: [] as string[] }
  }

  const suspendedEmails: string[] = []

  for (const u of dormant) {
    const p: any = pmap.get(u.id)
    // Only act on users who currently get alerts and aren't already suspended
    if (!u.email || !p || p.wants_notifications !== true || p.notifications_suspended === true) continue

    try {
      await resend.emails.send({
        from: 'Pickle Kitchen <bobby.ng@unpredikable.com>',
        to: u.email,
        subject: '😴 We\'ve paused your Pickle Kitchen game alerts',
        html: dormantEmailHtml(p.name),
      })
      await admin
        .from('profiles')
        .update({ wants_notifications: false, notifications_suspended: true })
        .eq('id', u.id)
      suspendedEmails.push(u.email)
    } catch (e) {
      console.error('Dormancy email/suspend failed for', u.email, e)
    }

    // Respect Resend rate limits
    await new Promise((r) => setTimeout(r, 600))
  }

  return {
    checked: authData?.users?.length || 0,
    dormant: dormant.length,
    suspended: suspendedEmails.length,
    emails: suspendedEmails,
  }
}

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get('authorization')
  const qp = new URL(request.url).searchParams.get('secret')
  return header === `Bearer ${secret}` || qp === secret
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runDormancyCheck()
    return NextResponse.json({ success: true, ...result })
  } catch (e: any) {
    console.error('dormant-users cron error:', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}
