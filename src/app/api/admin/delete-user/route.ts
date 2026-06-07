import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminEmail } from '@/lib/admins'

export const dynamic = 'force-dynamic'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

// Removes a user: their RSVPs, sessions they created, profile, and auth account.
export async function POST(request: NextRequest) {
  try {
    const { userId, accessToken } = await request.json()
    if (!userId || !accessToken) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    const admin = getAdminClient()

    // Verify the requester is an admin
    const { data: requester, error: reqErr } = await admin.auth.getUser(accessToken)
    if (reqErr || !requester?.user || !isAdminEmail(requester.user.email)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Don't let an admin delete themselves
    if (requester.user.id === userId) {
      return NextResponse.json({ error: "You can't remove your own account here." }, { status: 400 })
    }

    // Remove dependent data first (best-effort; in case FKs don't cascade)
    await admin.from('rsvps').delete().eq('user_id', userId)

    const { data: theirSessions } = await admin.from('sessions').select('id').eq('created_by', userId)
    const sessionIds = (theirSessions || []).map((s: any) => s.id)
    if (sessionIds.length > 0) {
      await admin.from('rsvps').delete().in('session_id', sessionIds)
      await admin.from('sessions').delete().eq('created_by', userId)
    }

    await admin.from('profiles').delete().eq('id', userId)

    const { error: delErr } = await admin.auth.admin.deleteUser(userId)
    if (delErr) throw delErr

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('admin/delete-user error:', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}
