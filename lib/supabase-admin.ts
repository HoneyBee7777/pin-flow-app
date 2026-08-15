import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Server-seitiger Supabase-Client mit Service-Role-Key.
//
// ACHTUNG: Umgeht Row Level Security vollständig. Nur in Server-Code
// verwenden, der niemals im Browser landet (API-Routes, Server Actions) —
// NIE in Client Components und nie in eine NEXT_PUBLIC_-Variable schreiben.

let cached: SupabaseClient | null = null

export function createAdminClient(): SupabaseClient {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ist nicht gesetzt.')
  }
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY ist nicht gesetzt. In Vercel unter ' +
        'Settings → Environment Variables hinterlegen (nicht NEXT_PUBLIC_!).'
    )
  }

  cached = createClient(url, serviceRoleKey, {
    auth: {
      // Kein Session-Handling: die Route läuft zustandslos pro Request.
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return cached
}
