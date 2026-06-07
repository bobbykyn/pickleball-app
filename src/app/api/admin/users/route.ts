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

// Lists all users (auth + profile) for admins to review signups.
export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json()
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 400 })
    }

    const admin = getAdminClient()

    // Verify the requester is an admin
    const { data: requester, error: reqErr } = await admin.auth.getUser(accessToken)
    if (reqErr || !requester?.user || !isAdminEmail(requester.user.email)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // All auth users
    const { data: authData, error: authErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (authErr) throw authErr

    // Profile names / avatars
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, name, avatar_url, google_avatar_url')
    const pmap = new Map((profiles || []).map((p: any) => [p.id, p]))

    const users = (authData?.users || []).map((u) => {
      const p: any = pmap.get(u.id) || {}
      return {
        id: u.id,
        email: u.email || null,
        name: p.name || u.user_metadata?.full_name || u.user_metadata?.name || null,
        avatar_url: p.avatar_url || null,
        google_avatar_url: p.google_avatar_url || u.user_metadata?.avatar_url || null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at || null,
      }
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({ users })
  } catch (e: any) {
    console.error('admin/users error:', e)
    return NextResponse.json({ error: e?.message || 'Internal server error' }, { status: 500 })
  }
}
