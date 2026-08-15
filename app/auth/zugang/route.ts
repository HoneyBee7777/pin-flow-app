import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { gueltigkeitStunden, pruefeZugangsToken } from '@/lib/zugang-token'

// Einstiegspunkt der Zugangsmail nach einem CopeCart-Kauf.
//
// Der Link aus der Mail trägt unser eigenes Token (Gültigkeit standardmäßig
// 72 Stunden). Erst hier wird der eigentliche Supabase-Magic-Link erzeugt und
// direkt an /auth/confirm weitergereicht — dessen enge Gültigkeit spielt so
// keine Rolle, weil zwischen Erzeugung und Einlösung nur Sekunden liegen.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const next = request.nextUrl.searchParams.get('next') ?? '/auth/set-password'

  if (!token) {
    return zumLogin(request, 'Der Zugangslink ist unvollständig.')
  }

  const supabase = createAdminClient()
  const pruefung = await pruefeZugangsToken(supabase, token)

  if (!pruefung.gueltig || !pruefung.email) {
    return zumLogin(request, meldungZu(pruefung.grund))
  }

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: pruefung.email,
    options: { redirectTo: new URL(next, request.nextUrl.origin).toString() },
  })

  if (error || !data?.properties?.hashed_token) {
    console.error(
      `[zugang] Magic-Link für ${pruefung.email} fehlgeschlagen:`,
      error?.message ?? 'kein hashed_token erhalten'
    )
    return zumLogin(
      request,
      'Der Zugang konnte gerade nicht hergestellt werden. Bitte versuche es in ein paar Minuten erneut.'
    )
  }

  const ziel = request.nextUrl.clone()
  ziel.pathname = '/auth/confirm'
  ziel.search = ''
  ziel.searchParams.set('token_hash', data.properties.hashed_token)
  ziel.searchParams.set('type', 'magiclink')
  ziel.searchParams.set('next', next)

  return NextResponse.redirect(ziel)
}

function meldungZu(grund: string | undefined): string {
  const stunden = gueltigkeitStunden()

  switch (grund) {
    case 'abgelaufen':
      return `Dieser Zugangslink war ${stunden} Stunden gültig und ist abgelaufen. Fordere dir unten einfach einen neuen an.`
    case 'entwertet':
      return 'Dieser Zugangslink wurde bereits verwendet. Melde dich mit deiner E-Mail-Adresse und deinem Passwort an.'
    default:
      return 'Dieser Zugangslink ist ungültig. Fordere dir unten einen neuen an.'
  }
}

function zumLogin(request: NextRequest, meldung: string) {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  url.search = '?error=' + encodeURIComponent(meldung)
  return NextResponse.redirect(url)
}
