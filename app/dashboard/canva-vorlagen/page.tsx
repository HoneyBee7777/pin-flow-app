import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import CanvaClient from './CanvaClient'
import type { CanvaVorlage, VorlageWithStats } from './utils'

const SELECT_FIELDS =
  'id, user_id, name, canva_link, vorlagen_typ, notizen, created_at'

type PinRow = {
  canva_vorlage_id: string | null
  ziel_url_id: string | null
}

export default async function CanvaVorlagenPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: vorlagenData, error: vorlagenError } = await supabase
    .from('canva_vorlagen')
    .select(SELECT_FIELDS)
    .order('created_at', { ascending: true })

  const { data: pinsData, error: pinsError } = await supabase
    .from('pins')
    .select('canva_vorlage_id, ziel_url_id')
    .not('canva_vorlage_id', 'is', null)

  const pins = (pinsData ?? []) as PinRow[]

  const pinCounts = new Map<string, number>()
  const comboCounts = new Map<string, number>()

  for (const p of pins) {
    if (!p.canva_vorlage_id) continue
    pinCounts.set(
      p.canva_vorlage_id,
      (pinCounts.get(p.canva_vorlage_id) ?? 0) + 1
    )
    if (p.ziel_url_id) {
      const key = `${p.canva_vorlage_id}|${p.ziel_url_id}`
      comboCounts.set(key, (comboCounts.get(key) ?? 0) + 1)
    }
  }

  const vorlageHasDuplicate = new Set<string>()
  comboCounts.forEach((count, key) => {
    if (count > 3) {
      const [vorlageId] = key.split('|')
      vorlageHasDuplicate.add(vorlageId)
    }
  })

  const vorlagen = (vorlagenData ?? []) as CanvaVorlage[]
  const vorlagenWithStats: VorlageWithStats[] = vorlagen.map((v) => ({
    ...v,
    pinCount: pinCounts.get(v.id) ?? 0,
    hasDuplicate: vorlageHasDuplicate.has(v.id),
  }))

  const loadError = vorlagenError?.message ?? pinsError?.message ?? null

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Canva-Vorlagen</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-600">
          Hier sammelst du deine Canva-Vorlagen für Pinterest-Pins. Beim Anlegen
          eines Pins wählst du die passende Vorlage aus, und die Spalte „Pins"
          zeigt dir, wie oft jede Vorlage schon im Einsatz war. Ein eigenes,
          wiedererkennbares Design ist auf Pinterest ein echter Vorteil: Wer
          deine Pins im Feed sofort erkennt, klickt eher.
        </p>
        <details className="group overflow-hidden mt-4 max-w-3xl rounded-lg border border-gray-200 bg-white shadow-sm">
          <summary className="group/sum flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-base font-semibold text-gray-900 hover:bg-marke-blaugrau [&::-webkit-details-marker]:hidden">
            <span
              className="text-lg leading-none text-gray-400 transition-transform group-hover/sum:text-white"
              aria-hidden
            >
              <span className="inline group-open:hidden">▸</span>
              <span className="hidden group-open:inline">▾</span>
            </span>
            <span className="flex-1 group-hover/sum:text-white">So funktioniert diese Seite</span>
          </summary>
          <div className="space-y-4 border-t border-gray-100 px-5 py-5 text-sm leading-relaxed text-gray-700">
            <div>
              <p className="font-semibold text-gray-900">Was du einträgst</p>
              <p>
                Pro Vorlage einen Namen, optional den Canva-Link zum direkten
                Öffnen, den Vorlagen-Typ als grobe Einordnung und eine Notiz. Nur
                der Name ist Pflicht.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                Dein Branding macht den Unterschied
              </p>
              <p>
                Das Wichtigste an deinen Vorlagen ist ein einheitlicher Look.
                Verwende überall dieselben Farben, dieselbe Schrift und dein
                Logo, passend zu deiner Website. So entsteht Wiedererkennung:
                Menschen sehen einen Pin und wissen sofort, dass er von dir ist.
                Das baut Vertrauen auf und hebt dich von austauschbaren Pins ab.
                Lege dir am besten ein festes Set aus wenigen Vorlagen an und
                bleib dabei, statt jeden Pin neu zu gestalten.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                Wie Vorlage und Pin zusammenhängen
              </p>
              <p>
                Beim Anlegen eines Pins wählst du seine Vorlage aus. Die Spalte
                „Pins" zählt, wie viele deiner Pins eine Vorlage nutzen. So
                siehst du, welche Vorlagen du wirklich einsetzt und welche
                brachliegen.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                Aus einer Vorlage viele Pins
              </p>
              <p>
                Mit einer guten Vorlage machst du aus einem einzigen Foto schnell
                mehrere unterschiedliche Pins. Wie das effizient geht, zeigt dir
                die{' '}
                <Link
                  href="/dashboard/strategie?tab=design&accordion=effiziente-pin-produktion"
                  className="font-medium text-link underline underline-offset-2"
                >
                  Anleitung zur effizienten Pin-Produktion
                </Link>
                .
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

      <CanvaClient vorlagen={vorlagenWithStats} />
    </div>
  )
}
