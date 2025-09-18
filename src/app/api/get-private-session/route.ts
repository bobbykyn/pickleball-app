import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const privateKey = searchParams.get('key')

    if (!privateKey) {
      return NextResponse.json({ error: 'Private key required' }, { status: 400 })
    }

    // Find session by private key
    const { data: session, error } = await supabase
      .from('sessions')
      .select(`
        *,
        profiles:created_by(name),
        rsvps(
          *,
          profiles(name)
        )
      `)
      .eq('private_key', privateKey)
      .eq('is_private', true)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found or invalid key' }, { status: 404 })
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Error fetching private session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
