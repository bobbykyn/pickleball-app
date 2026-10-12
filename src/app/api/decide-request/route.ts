import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/serverSupabase'
import { isAdminEmail } from '@/lib/admins'

// Host or admin approves / declines a pending join request.
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { accessToken, sessionId, userId, decision } = await request.json()
    if (!accessToken || !sessionId || !userId || !['yes', 'no'].includes(decision)) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 })
    }
    const db = getServiceSupabase()

    const { data: auth, error: authErr } = await db.auth.getUser(accessToken)
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const { data: session } = await db
      .from('sessions')
      .select('id, created_by, max_players, rsvps(user_id, status, guest_count)')
      .eq('id', sessionId)
      .single()
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const allowed = session.created_by === auth.user.id || isAdminEmail(auth.user.email)
    if (!allowed) return NextResponse.json({ error: 'Only the host or an admin can decide' }, { status: 403 })

    const rsvps: any[] = (session as any).rsvps || []
    const req = rsvps.find((r) => r.user_id === userId && r.status === 'pending')
    if (!req) return NextResponse.json({ error: 'No pending request from this player' }, { status: 404 })

    if (decision === 'yes') {
      const taken = rsvps
        .filter((r) => r.status === 'yes')
        .reduce((sum, r) => sum + 1 + (r.guest_count || 0), 0)
      const needed = 1 + (req.guest_count || 0)
      if (taken + needed > (session.max_players || 8)) {
        return NextResponse.json({ error: `Not enough spots — ${Math.max(0, (session.max_players || 8) - taken)} left, request needs ${needed}.` }, { status: 409 })
      }
    }

    const { error } = await db
      .from('rsvps')
      .update({ status: decision })
      .eq('session_id', sessionId)
      .eq('user_id', userId)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('decide-request error:', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}
