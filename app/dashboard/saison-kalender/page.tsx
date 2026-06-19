import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import SaisonClient from './SaisonClient'
import {
  computeStatus,
  todayIso,
  type EventWithStatus,
  type SaisonEvent,
  type SaisonTyp,
} from './utils'

// ---------- Standard-Events fürs Seeding ----------
//
// Pro Event liefert `dateFor(year)` ein konkretes ISO-Datum für das gegebene
// Jahr. Beim Seeding (s. unten) wird das für das aktuelle UND das nächste
// Jahr aufgerufen → der neue Nutzer hat sofort einen 2-Jahres-Ausblick.
//
// `datum_variabel: true` heißt: das Datum verschiebt sich jährlich (Ostern,
// Muttertag, Vatertag, Black Friday). Wir tragen einen korrekt berechneten
// Default ein, markieren das Event aber als variabel, damit die UI das ⚠
// anzeigt und der Nutzer im Zweifel nachjustieren kann.
//
// `suchbeginn_tage` = Tage zwischen Pin-Ende und Event-Datum. Pin-Fenster
// und Produktionsfenster werden in utils.computeStatus daraus abgeleitet
// (Pin-Fenster = 60 Tage vor Pin-Ende, Produktion = 31 Tage davor).

type DefaultEventDef = {
  event_name: string
  saison_typ: Exclude<SaisonTyp, 'evergreen'>
  suchbeginn_tage: number
  datum_variabel: boolean
  dateFor: (year: number) => string
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// n-ter Wochentag im Monat (weekday 0=So…6=Sa, n=1..5).
function nthWeekdayOfMonth(
  year: number,
  monthIdx0: number,
  weekday: number,
  n: number
): number {
  const firstDow = new Date(Date.UTC(year, monthIdx0, 1)).getUTCDay()
  const offset = (weekday - firstDow + 7) % 7
  return 1 + offset + (n - 1) * 7
}

// Letzter Wochentag im Monat (weekday 0=So…6=Sa).
function lastWeekdayOfMonth(
  year: number,
  monthIdx0: number,
  weekday: number
): number {
  const lastDay = new Date(Date.UTC(year, monthIdx0 + 1, 0)).getUTCDate()
  const lastDow = new Date(Date.UTC(year, monthIdx0, lastDay)).getUTCDay()
  const offset = (lastDow - weekday + 7) % 7
  return lastDay - offset
}

// Gauß'sche Osterformel — gibt Ostersonntag-Datum als (month, day) zurück.
function osterSonntag(year: number): { month: number; day: number } {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return { month, day }
}

const DEFAULT_EVENTS: DefaultEventDef[] = [
  // Feste Feiertage
  { event_name: 'Valentinstag',  saison_typ: 'feiertag',       suchbeginn_tage: 14, datum_variabel: false, dateFor: (y) => iso(y, 2, 14) },
  { event_name: 'Ostern',        saison_typ: 'feiertag',       suchbeginn_tage: 14, datum_variabel: true,  dateFor: (y) => { const { month, day } = osterSonntag(y); return iso(y, month, day) } },
  { event_name: 'Muttertag',     saison_typ: 'feiertag',       suchbeginn_tage: 46, datum_variabel: true,  dateFor: (y) => iso(y, 5, nthWeekdayOfMonth(y, 4, 0, 2)) },
  { event_name: 'Vatertag',      saison_typ: 'feiertag',       suchbeginn_tage: 76, datum_variabel: true,  dateFor: (y) => iso(y, 6, nthWeekdayOfMonth(y, 5, 0, 2)) },
  { event_name: 'Halloween',     saison_typ: 'feiertag',       suchbeginn_tage: 60, datum_variabel: false, dateFor: (y) => iso(y, 10, 31) },
  { event_name: 'Black Friday',  saison_typ: 'shopping_event', suchbeginn_tage: 90, datum_variabel: true,  dateFor: (y) => iso(y, 11, lastWeekdayOfMonth(y, 10, 5)) },
  { event_name: 'Weihnachten',   saison_typ: 'feiertag',       suchbeginn_tage: 90, datum_variabel: false, dateFor: (y) => iso(y, 12, 25) },
  { event_name: 'Silvester',     saison_typ: 'feiertag',       suchbeginn_tage: 60, datum_variabel: false, dateFor: (y) => iso(y, 12, 31) },
  // Jahreszeiten
  { event_name: 'Frühling',      saison_typ: 'jahreszeit',     suchbeginn_tage: 60, datum_variabel: false, dateFor: (y) => iso(y, 3, 20) },
  { event_name: 'Sommer',        saison_typ: 'jahreszeit',     suchbeginn_tage: 60, datum_variabel: false, dateFor: (y) => iso(y, 6, 21) },
  { event_name: 'Herbst',        saison_typ: 'jahreszeit',     suchbeginn_tage: 60, datum_variabel: false, dateFor: (y) => iso(y, 9, 23) },
  { event_name: 'Winter',        saison_typ: 'jahreszeit',     suchbeginn_tage: 60, datum_variabel: false, dateFor: (y) => iso(y, 12, 21) },
]

const SELECT_FIELDS =
  'id, event_name, event_datum, saison_typ, suchbeginn_tage, notizen, datum_variabel, created_at'

export default async function SaisonKalenderPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const today = todayIso()

  // Seeding-Gate: explizit pro user_id zählen, NICHT auf RLS verlassen.
  // Wenn der Nutzer schon Events hat (auch nur einen), wird nichts geseedet —
  // sonst würde z. B. das absichtliche Löschen eines Events beim nächsten
  // Aufruf alles wieder zurückbringen.
  const { count: existingCount, error: countError } = await supabase
    .from('saison_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  let seedError: string | null = null

  if (countError) {
    console.error('[saison-kalender] count failed:', countError)
  } else if ((existingCount ?? 0) === 0) {
    const thisYear = parseInt(today.slice(0, 4), 10)
    const nextYear = thisYear + 1

    // Pro Event: ein Eintrag fürs aktuelle, ein Eintrag fürs nächste Jahr.
    // → Nutzer bekommt sofort einen 2-Jahres-Ausblick.
    const datedRows = DEFAULT_EVENTS.flatMap((def) =>
      [thisYear, nextYear].map((year) => ({
        user_id: user.id,
        event_name: def.event_name,
        event_datum: def.dateFor(year),
        saison_typ: def.saison_typ,
        suchbeginn_tage: def.suchbeginn_tage,
        notizen: null,
        datum_variabel: def.datum_variabel,
      }))
    )

    const evergreenRow = {
      user_id: user.id,
      event_name: 'Evergreen',
      event_datum: null,
      saison_typ: 'evergreen' as const,
      suchbeginn_tage: null,
      notizen: null,
      datum_variabel: false,
    }

    const seedResult = await supabase
      .from('saison_events')
      .insert([...datedRows, evergreenRow])

    if (seedResult.error) {
      seedError = seedResult.error.message
      // Auch ins Server-Log, damit der Bug im Vercel-/Dev-Log auftaucht und
      // nicht nur als roter Banner im UI verschwindet.
      console.error('[saison-kalender] seed failed:', seedResult.error)
    }
  }

  // Anschließend immer mit user_id-Filter laden — egal ob geseedet oder
  // existierende Daten. Kein Verlassen auf RLS, kein Risiko fremde Events
  // zu sehen.
  const { data, error } = await supabase
    .from('saison_events')
    .select(SELECT_FIELDS)
    .eq('user_id', user.id)
    .order('event_datum', { ascending: true, nullsFirst: false })

  const events = (data ?? []) as SaisonEvent[]
  const eventsWithStatus: EventWithStatus[] = events
    .map((e) => ({
      ...e,
      statusInfo: computeStatus(
        e.event_datum,
        e.saison_typ,
        e.suchbeginn_tage,
        today
      ),
    }))
    .sort((a, b) => {
      const aDate = a.event_datum ?? ''
      const bDate = b.event_datum ?? ''
      if (!aDate && !bDate)
        return a.event_name.localeCompare(b.event_name, 'de')
      if (!aDate) return 1
      if (!bDate) return -1
      if (aDate === bDate) return a.event_name.localeCompare(b.event_name, 'de')
      return aDate < bDate ? -1 : 1
    })

  const loadError = error?.message ?? seedError ?? null

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Saison-Kalender</h1>
        <p className="mb-4 mt-1 max-w-3xl text-sm leading-relaxed text-gray-600">
          Hier planst du deine saisonalen Pins, von Feiertagen über Jahreszeiten
          bis zu Shopping-Events wie dem Black Friday. Pin-Flow berechnet für
          jedes Event automatisch, wann du produzieren und pinnen solltest, denn
          auf Pinterest brauchst du saisonale Inhalte Wochen im Voraus. Status
          und Countdown zeigen dir auf einen Blick, was als Nächstes ansteht.
        </p>
        <p className="mb-4 text-[13px]">
          <Link
            href="/dashboard/strategie?tab=grundlagen&accordion=saisonalitaet"
            className="font-medium text-red-600 hover:underline"
          >
            Mehr zur Saisonalität & Pinterest-Timing
          </Link>
        </p>
        <details className="group max-w-3xl rounded-lg border border-gray-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-base font-semibold text-gray-900 hover:bg-red-50 [&::-webkit-details-marker]:hidden">
            <span
              className="text-lg leading-none text-gray-400 transition-transform"
              aria-hidden
            >
              <span className="inline group-open:hidden">▸</span>
              <span className="hidden group-open:inline">▾</span>
            </span>
            <span className="flex-1">So funktioniert diese Seite</span>
          </summary>
          <div className="space-y-4 border-t border-gray-100 px-5 py-5 text-sm leading-relaxed text-gray-700">
            <div>
              <p className="font-semibold text-gray-900">Status verstehen</p>
              <p>
                Pin-Flow rechnet rückwärts vom Event-Datum: erst die
                Produktionsphase, dann das Pin-Fenster, dann die Hochphase kurz
                vor dem Event. Der Status sagt dir, in welcher Phase du gerade
                bist, der Countdown, wie viel Zeit bleibt.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                Einmal im Jahr vorausplanen
              </p>
              <p>
                Plane einmal im Jahr voraus. Events mit wechselndem Datum
                (Ostern, Muttertag) musst du für die kommenden Jahre pflegen,
                sonst kann Pin-Flow Status und Countdown nicht rechtzeitig
                berechnen. Diese Events erkennst du am Warnsymbol, über
                „Nächstes Jahr planen“ pflegst du ihre Daten.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Auch auf dem Dashboard</p>
              <p>
                Die anstehenden Events findest du auch auf deinem Dashboard,
                damit du immer rechtzeitig erinnert wirst, was als Nächstes
                produziert werden muss.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                Events für deine Nische finden
              </p>
              <p>
                Über „KI-Prompt für Saison-Events“ erzeugst du einen Prompt, mit
                dem dir deine KI passende saisonale Anlässe für dein Thema
                vorschlägt.
              </p>
            </div>
          </div>
        </details>
      </header>

      {loadError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Fehler: {loadError}
        </div>
      )}

      <SaisonClient events={eventsWithStatus} />
    </div>
  )
}
