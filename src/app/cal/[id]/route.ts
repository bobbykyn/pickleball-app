import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildSessionIcs } from '@/lib/ics'

// Serves /cal/<sessionId>.ics — iPhone Safari opens this straight into
// Apple Calendar's "Add Event" sheet.
export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params
  const id = raw.replace(/\.ics$/i, '')

  // Session ids are UUIDs — reject anything else before touching the database.
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 })
  }

  const { data: session, error } = await getSupabase()
    .from('sessions')
    .select('id, title, date_time, duration_hours, location, courts, notes, profiles:created_by(name)')
    .eq('id', id)
    .single()

  if (error || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const ics = buildSessionIcs(session as any)

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="pickle-kitchen-${id.slice(0, 8)}.ics"`,
      'Cache-Control': 'no-store',
    },
  })
}
