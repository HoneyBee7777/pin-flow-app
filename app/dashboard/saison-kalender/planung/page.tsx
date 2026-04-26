import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import PlanungClient, { type PlanungEvent } from './PlanungClient'

export default async function PlanungPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const aktuellesJahr = new Date().getUTCFullYear()
  const jahrPlus1 = aktuellesJahr + 1
  const jahrPlus2 = aktuellesJahr + 2

  const { data: events, error: eventsError } = await supabase
    .from('saison_events')
    .select('id, event_name, event_datum')
    .eq('datum_variabel', true)
    .order('event_datum', { ascending: true, nullsFirst: false })

  const eventIds = (events ?? []).map((e) => e.id)

  let jahresdaten: Array<{ event_id: string; jahr: number; datum: string }> = []
  let jahresdatenError: string | null = null

  if (eventIds.length > 0) {
    const { data, error } = await supabase
      .from('saison_event_jahresdaten')
      .select('event_id, jahr, datum')
      .in('event_id', eventIds)
      .in('jahr', [jahrPlus1, jahrPlus2])

    if (error) jahresdatenError = error.message
    else jahresdaten = data ?? []
  }

  const planungEvents: PlanungEvent[] = (events ?? []).map((ev) => {
    const plus1 = jahresdaten.find(
      (j) => j.event_id === ev.id && j.jahr === jahrPlus1
    )
    const plus2 = jahresdaten.find(
      (j) => j.event_id === ev.id && j.jahr === jahrPlus2
    )
    return {
      id: ev.id,
      event_name: ev.event_name,
      event_datum: ev.event_datum,
      datum_jahr_plus_1: plus1?.datum ?? null,
      datum_jahr_plus_2: plus2?.datum ?? null,
    }
  })

  const loadError = eventsError?.message ?? jahresdatenError ?? null

  return (
    <div className="p-8">
      <div className="mb-4">
        <Link
          href="/dashboard/saison-kalender"
          className="text-sm text-red-600 hover:underline"
        >
          ← Zurück zum Saison-Kalender
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Nächstes Jahr planen
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Trage hier die Daten für Events mit variablem Datum (z.B. Ostern,
          Muttertag, Vatertag) für die kommenden Jahre ein. Feste Daten wie
          Weihnachten oder Halloween erscheinen hier nicht.
        </p>
      </header>

      {loadError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Fehler: {loadError}
        </div>
      )}

      {planungEvents.length === 0 ? (
        <div className="rounded-md border border-gray-200 bg-white p-6 text-sm text-gray-600">
          Keine Events mit variablem Datum vorhanden. Markiere ein Event in der
          Bearbeitungsmaske als „Datum ändert sich jährlich", damit es hier
          erscheint.
        </div>
      ) : (
        <PlanungClient
          events={planungEvents}
          aktuellesJahr={aktuellesJahr}
          jahrPlus1={jahrPlus1}
          jahrPlus2={jahrPlus2}
        />
      )}
    </div>
  )
}
