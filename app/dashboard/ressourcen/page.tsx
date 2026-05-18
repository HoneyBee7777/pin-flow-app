import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { getLatestAudienceSnapshot } from '@/lib/audience-snapshot'
import { loadAccountNicheProfile } from '../analytics/account-niche'
import { germanCategoryName } from '@/lib/audience-translations'
import {
  buildBridgeTopicsPrompt,
  type PromptData,
} from '@/lib/prompts/bridge-topics-prompt'
import BridgeTopicsPrompt from './BridgeTopicsPrompt'

// V3.1 — „Prompts & Vorlagen". Erste Karte: personalisierter
// Brücken-Themen-Prompt, server-seitig mit den echten Account-Daten
// (Hauptnische, Top-3-Affinitäten, Demografie) befüllt.

const STRONG_AFFINITY_THRESHOLD = 1.5

function germanGenderLabel(name: string): string {
  const lower = name.toLowerCase()
  if (lower === 'female') return 'Weiblich'
  if (lower === 'male') return 'Männlich'
  if (lower === 'unspecified & custom') return 'Nicht angegeben & andere'
  if (lower === 'unspecified') return 'Nicht angegeben'
  if (lower === 'custom') return 'Andere'
  return name
}

function topByPercent<T extends { percent: number }>(
  items: ReadonlyArray<T>
): T | null {
  if (items.length === 0) return null
  return items.slice().sort((a, b) => b.percent - a.percent)[0]
}

function pct(value0to1: number): number {
  return Math.round(value0to1 * 100)
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">
          Prompts &amp; Vorlagen
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
          Hier findest du fertige Prompts, die du in ChatGPT, Claude oder
          einer anderen KI verwenden kannst. Jeder Prompt ist bereits mit
          deinen Daten gefüllt — kopiere ihn einfach und füge ihn dort ein.
        </p>
      </header>
      <div className="mt-6 max-w-3xl">{children}</div>
    </div>
  )
}

export default async function RessourcenPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [snapshot, nicheProfile] = await Promise.all([
    getLatestAudienceSnapshot(),
    user
      ? loadAccountNicheProfile(user.id)
      : Promise.resolve(null),
  ])

  // Fallback 1 — kein Audience-Snapshot importiert.
  if (!snapshot) {
    return (
      <PageShell>
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Brücken-Themen-Ideen für deine Zielgruppe
          </h2>
          <p className="mt-3 rounded-md border border-amber-200 border-l-[3px] border-l-amber-400 bg-amber-50 p-3 text-sm text-amber-900">
            ⚠️ Du hast noch keine Zielgruppen-Daten importiert. Importiere
            deine Audience-Insights-CSV im Bereich Analytics &gt; Eingabe, um
            diesen Prompt mit deinen Daten zu personalisieren.
          </p>
          <p className="mt-3 text-sm">
            →{' '}
            <Link
              href="/dashboard/analytics?tab=eingabe"
              className="font-medium text-red-600 hover:underline"
            >
              Zur Zielgruppe-Eingabe
            </Link>
          </p>
        </section>
      </PageShell>
    )
  }

  // Top-3-Affinitäten ≥ 1,5; sonst die drei höchsten als Info-Fallback.
  const sortedInterests = snapshot.data.interests
    .slice()
    .sort((a, b) => b.affinity - a.affinity)
  const strong = sortedInterests.filter(
    (c) => c.affinity >= STRONG_AFFINITY_THRESHOLD
  )
  const lowAffinity = strong.length === 0
  const topAffinities = (lowAffinity ? sortedInterests : strong)
    .slice(0, 3)
    .map((c) => ({
      nameDe: germanCategoryName(c.category),
      nameEn: c.category,
      affinityValue: c.affinity,
    }))

  const gender = topByPercent(snapshot.data.gender)
  const age = topByPercent(snapshot.data.ages)
  const country = topByPercent(snapshot.data.countries)

  const promptData: PromptData = {
    mainNiche:
      nicheProfile?.primaryNiche?.label ?? 'Noch keine Hauptnische erkannt',
    topAffinities,
    demographics: {
      topGender: {
        name: gender ? germanGenderLabel(gender.name) : 'Unbekannt',
        percent: gender ? pct(gender.percent) : 0,
      },
      topAgeRange: {
        range: age ? age.range : 'unbekannt',
        percent: age ? pct(age.percent) : 0,
      },
      topCountry: {
        name: country ? country.name : 'Unbekannt',
        percent: country ? pct(country.percent) : 0,
      },
    },
  }

  return (
    <PageShell>
      <BridgeTopicsPrompt
        promptText={buildBridgeTopicsPrompt(promptData)}
        lowAffinityNotice={lowAffinity}
      />
    </PageShell>
  )
}
