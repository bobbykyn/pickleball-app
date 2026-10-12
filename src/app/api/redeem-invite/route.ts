import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/serverSupabase'

// A player opened an invite link (/?invite=<token>). Record them on that
// session's invited list so the Join button unlocks for them.
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { accessToken, token } = await request.json()
    if (!accessToken || !token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }
    const db = getServiceSupabase()

    const { data: auth, error: authErr } = await db.auth.getUser(accessToken)
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const { data: session } = await db
      .from('sessions')
      .select('id, invited_users, date_time')
      .eq('invite_token', String(token))
      .eq('invite_only', true)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'This invite link is not valid any more' }, { status: 404 })
    }

    const current: string[] = Array.isArray(session.invited_users) ? session.invited_users.map(String) : []
    if (!current.includes(auth.user.id)) {
      const { error } = await db
        .from('sessions')
        .update({ invited_users: [...current, auth.user.id] })
        .eq('id', session.id)
      if (error) throw error
    }

    return NextResponse.json({ sessionId: session.id })
  } catch (e: any) {
    console.error('redeem-invite error:', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}
