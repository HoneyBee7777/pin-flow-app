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

type DefaultEvent = {
  event_name: string
  month: number
  day: number
  saison_typ: Exclude<SaisonTyp, 'evergreen'>
  suchbeginn_tage: number
  datum_variabel: boolean
}

const DEFAULT_DATED_EVENTS: DefaultEvent[] = [
  { event_name: 'Valentinstag', month: 2, day: 14, saison_typ: 'feiertag', suchbeginn_tage: 45, datum_variabel: false },
  { event_name: 'Frühling', month: 3, day: 20, saison_typ: 'jahreszeit', suchbeginn_tage: 60, datum_variabel: false },
  { event_name: 'Ostern', month: 4, day: 5, saison_typ: 'feiertag', suchbeginn_tage: 45, datum_variabel: true },
  { event_name: 'Muttertag', month: 5, day: 10, saison_typ: 'feiertag', suchbeginn_tage: 45, datum_variabel: true },
  { event_name: 'Vatertag', month: 5, day: 14, saison_typ: 'feiertag', suchbeginn_tage: 45, datum_variabel: true },
  { event_name: 'Sommer', month: 6, day: 21, saison_typ: 'jahreszeit', suchbeginn_tage: 60, datum_variabel: false },
  { event_name: 'Herbst', month: 9, day: 23, saison_typ: 'jahreszeit', suchbeginn_tage: 60, datum_variabel: false },
  { event_name: 'Halloween', month: 10, day: 31, saison_typ: 'feiertag', suchbeginn_tage: 60, datum_variabel: false },
  { event_name: 'Black Friday', month: 11, day: 28, saison_typ: 'shopping_event', suchbeginn_tage: 90, datum_variabel: false },
  { event_name: 'Winter', month: 12, day: 21, saison_typ: 'jahreszeit', suchbeginn_tage: 60, datum_variabel: false },
  { event_name: 'Weihnachten', month: 12, day: 25, saison_typ: 'feiertag', suchbeginn_tage: 90, datum_variabel: false },
  { event_name: 'Silvester', month: 12, day: 31, saison_typ: 'feiertag', suchbeginn_tage: 60, datum_variabel: false },
]

function nextOccurrenceIso(
  month: number,
  day: number,
  todayIsoStr: string
): string {
  const thisYear = parseInt(todayIsoStr.slice(0, 4), 10)
  const candidate = new Date(Date.UTC(thisYear, month - 1, day))
    .toISOString()
    .slice(0, 10)
  if (candidate >= todayIsoStr) return candidate
  return new Date(Date.UTC(thisYear + 1, month - 1, day))
    .toISOString()
    .slice(0, 10)
}

const SELECT_FIELDS =
  'id, event_name, event_datum, saison_typ, suchbeginn_tage, notizen, datum_variabel, created_at'

const REMINDER_TITLE =
  'Bitte prüfe und aktualisiere deine Saison-Events für die nächsten 6 Monate'

type SupabaseInstance = ReturnType<typeof createClient>

function currentHalfYearReminderDate(todayIsoStr: string): string {
  const year = parseInt(todayIsoStr.slice(0, 4), 10)
  const month = parseInt(todayIsoStr.slice(5, 7), 10)
  return month <= 6 ? `${year}-01-31` : `${year}-07-31`
}

async function ensureReminderForCurrentHalfYear(
  supabase: SupabaseInstance,
  userId: string,
  todayIsoStr: string
): Promise<void> {
  const faelligkeitsdatum = currentHalfYearReminderDate(todayIsoStr)

  const { data: existing } = await supabase
    .from('aufgaben')
    .select('id')
    .eq('user_id', userId)
    .eq('titel', REMINDER_TITLE)
    .eq('faelligkeitsdatum', faelligkeitsdatum)
    .limit(1)

  if (existing && existing.length > 0) return

  await supabase.from('aufgaben').insert({
    user_id: userId,
    titel: REMINDER_TITLE,
    faelligkeitsdatum,
    erledigt: false,
  })
}

export default async function SaisonKalenderPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const today = todayIso()

  let { data, error } = await supabase
    .from('saison_events')
    .select(SELECT_FIELDS)
    .order('event_datum', { ascending: true, nullsFirst: false })

  let seedError: string | null = null

  if (!error && (data ?? []).length === 0) {
    const datedRows = DEFAULT_DATED_EVENTS.map((d) => ({
      user_id: user.id,
      event_name: d.event_name,
      event_datum: nextOccurrenceIso(d.month, d.day, today),
      saison_typ: d.saison_typ,
      suchbeginn_tage: d.suchbeginn_tage,
      notizen: null,
      datum_variabel: d.datum_variabel,
    }))
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
    } else {
      const reload = await supabase
        .from('saison_events')
        .select(SELECT_FIELDS)
        .order('event_datum', { ascending: true, nullsFirst: false })
      data = reload.data
      error = reload.error
    }
  }

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
        <p className="mt-1 text-sm text-gray-600">
          Plane deine Saison-Pins rechtzeitig — Status und Countdown werden
          automatisch berechnet.
        </p>
        <p className="mt-1 text-[13px]">
          <span aria-hidden>→ </span>
          <Link
            href="/dashboard/strategie?tab=grundlagen&accordion=saisonalitaet"
            className="text-red-600 underline hover:opacity-80"
          >
            Mehr zur Saisonalität & Pinterest-Timing
          </Link>
        </p>
      </header>

      <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
        <span className="font-medium">Tipp:</span> Events mit ⚠️ haben ein
        variables Datum, das sich jährlich ändert. Nutze den Button „Nächstes
        Jahr planen", um diese Daten vorausschauend zu pflegen.
      </div>

      {loadError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Fehler: {loadError}
        </div>
      )}

      <SaisonClient events={eventsWithStatus} />
    </div>
  )
}
