import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// Verarbeitet Einladungs- und Magic-Links von Supabase.
// Erwartet `token_hash` und `type` als Query-Parameter (so verschickt Supabase
// die Links per E-Mail). Bei Erfolg wird eine Session gesetzt und der Nutzer
// landet auf /auth/set-password (überschreibbar via ?next=).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/auth/set-password'

  if (!token_hash || !type) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search =
      '?error=' + encodeURIComponent('Ungültiger oder unvollständiger Link.')
    return NextResponse.redirect(url)
  }

  const supabase = createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search =
      '?error=' +
      encodeURIComponent(
        'Einladungslink ungültig oder abgelaufen. Bitte neu anfordern.'
      )
    return NextResponse.redirect(url)
  }

  const url = request.nextUrl.clone()
  url.pathname = next
  url.search = ''
  return NextResponse.redirect(url)
}
