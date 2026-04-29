import { createClient } from '@/lib/supabase-server'
import StrategieClient from './StrategieClient'
import { STRATEGIE_SELECT, type StrategieRow } from './lib'

export default async function StrategiePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let row: StrategieRow | null = null
  if (user) {
    const { data } = await supabase
      .from('einstellungen')
      .select(STRATEGIE_SELECT)
      .eq('user_id', user.id)
      .maybeSingle()
    row = (data ?? null) as StrategieRow | null
  }

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Strategie &amp; Ausrichtung
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Pinterest-Grundlagen, Strategie-Optionen und Pin-Design – die
          Wissens-Basis für deine eigene Strategie.
        </p>
      </header>

      <StrategieClient strategie={row} />
    </div>
  )
}
