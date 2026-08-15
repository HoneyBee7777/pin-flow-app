import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { logout } from '@/app/actions/auth'

export const dynamic = 'force-dynamic'

// Landeseite, wenn die Middleware den Zugang zum Dashboard verweigert.
// Zeigt genau den aktuellen Zustand des Zugangs — keine Aufzählung aller
// denkbaren Zustände.

interface AboZeile {
  status: string | null
  zugang_bis: string | null
  gekuendigt_zum: string | null
  product_name: string | null
}

export default async function ZugangPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data } = await supabase
    .from('abo_status')
    .select('status, zugang_bis, gekuendigt_zum, product_name')
    .eq('user_id', user.id)
    .maybeSingle<AboZeile>()

  const aktiv =
    !data || data.zugang_bis === null || new Date(data.zugang_bis).getTime() > Date.now()

  if (aktiv) redirect('/dashboard')

  const supportMail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL

  return (
    <div className="flex min-h-screen items-center justify-center bg-seite px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-status-schlecht"
          />
          <span className="text-sm font-medium text-status-schlecht-text">
            {etikett(data)}
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dein Zugang ist beendet
          </h1>
          <p className="mt-2 text-sm text-gray-600">{erklaerung(data)}</p>
        </div>

        <div className="rounded-md bg-marke-blaugrau-xhell p-4 text-sm text-gray-700">
          <p>
            Deine Daten bleiben gespeichert. Sobald das Abo wieder läuft, steht
            dir dein Cockpit unverändert zur Verfügung — du musst nichts neu
            anlegen.
          </p>
        </div>

        {supportMail && (
          <p className="text-sm text-gray-600">
            Passt das nicht?{' '}
            <a
              href={`mailto:${supportMail}`}
              className="font-medium text-link underline underline-offset-2"
            >
              Schreib uns
            </a>{' '}
            →
          </p>
        )}

        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel focus:outline-none focus:ring-2 focus:ring-marke-blaugrau focus:ring-offset-2"
          >
            Abmelden
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          <Link
            href="/login"
            className="font-medium text-link underline underline-offset-2"
          >
            Zur Anmeldung
          </Link>{' '}
          →
        </p>
      </div>
    </div>
  )
}

function etikett(zeile: AboZeile | null): string {
  if (zeile?.status === 'gesperrt') return 'Zugang gesperrt'
  if (zeile?.status === 'gekuendigt') return 'Abo beendet'
  return 'Zugang nicht aktiv'
}

function erklaerung(zeile: AboZeile | null): string {
  const produkt = zeile?.product_name?.trim() || 'Pin-Flow'

  if (zeile?.status === 'gesperrt') {
    return `Der Zugang zu ${produkt} wurde gesperrt, weil die Zahlung zurückerstattet oder zurückgebucht wurde.`
  }

  if (zeile?.status === 'gekuendigt') {
    const datum = formatiere(zeile.gekuendigt_zum ?? zeile.zugang_bis)
    return datum
      ? `Dein Abo für ${produkt} wurde gekündigt und lief am ${datum} aus.`
      : `Dein Abo für ${produkt} wurde gekündigt und ist ausgelaufen.`
  }

  const datum = formatiere(zeile?.zugang_bis ?? null)
  return datum
    ? `Dein Zugang zu ${produkt} endete am ${datum}.`
    : `Für dieses Konto ist derzeit kein aktives Abo hinterlegt.`
}

function formatiere(wert: string | null): string | null {
  if (!wert) return null
  const datum = new Date(wert)
  if (Number.isNaN(datum.getTime())) return null

  return datum.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}
