import { createClient } from '@/lib/supabase-server'
import CanvaClient from './CanvaClient'
import type { CanvaVorlage, VorlageWithStats } from './utils'

const SELECT_FIELDS =
  'id, user_id, name, canva_link, vorlagen_typ, farbschema, notizen, created_at'

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
        <p className="mt-1 text-sm text-gray-600">
          Verwalte deine Canva-Vorlagen für Pinterest-Pins. Die Spalte „Pins"
          zeigt, wie oft jede Vorlage bereits verwendet wurde.
        </p>
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
