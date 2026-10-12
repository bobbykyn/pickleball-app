import { createClient } from '@supabase/supabase-js'

/** Service-key client for API routes only (never import into client components). */
export function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
