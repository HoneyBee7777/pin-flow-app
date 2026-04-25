import { createClient } from '@/lib/supabase-server'
import KeywordsClient, { type Keyword } from './KeywordsClient'

export default async function KeywordsPage() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('keywords')
    .select('id, keyword, typ, saison_peak, notizen, created_at')
    .order('created_at', { ascending: false })

  const keywords = (data ?? []) as Keyword[]

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Keywords</h1>
        <p className="mt-1 text-sm text-gray-600">
          Verwalte deine Pinterest-Keywords nach Typ und Saison.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Konnte Keywords nicht laden: {error.message}
        </div>
      )}

      <KeywordsClient keywords={keywords} />
    </div>
  )
}
