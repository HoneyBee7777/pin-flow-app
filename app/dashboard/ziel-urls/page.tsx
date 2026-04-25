import { createClient } from '@/lib/supabase-server'
import ZielUrlsClient, { type ZielUrl } from './ZielUrlsClient'

export default async function ZielUrlsPage() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('ziel_urls')
    .select('id, url, titel, typ, prioritaet, notizen, created_at')
    .order('created_at', { ascending: false })

  const urls = (data ?? []) as ZielUrl[]

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Ziel-URLs</h1>
        <p className="mt-1 text-sm text-gray-600">
          Sammle und priorisiere alle URLs, auf die deine Pins verlinken sollen.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Konnte URLs nicht laden: {error.message}
        </div>
      )}

      <ZielUrlsClient urls={urls} />
    </div>
  )
}
