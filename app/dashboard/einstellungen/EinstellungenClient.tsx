'use client'

import Link from 'next/link'
import { useState, useTransition, type FormEvent } from 'react'
import { saveEinstellungen } from './actions'
import { saveStrategieManual } from '../strategie/actions'
import { adjustProportional } from '../strategie/lib'
import type { UserPinBenchmark } from '../analytics/utils'
import type { AccountNicheProfile } from '@/lib/account-niche-profile'
import {
  getEinordnung,
  type Einordnung,
  type Range,
} from '@/lib/niche-benchmarks'

export type InitialSchwellwerte = {
  beobachtung: number | null
  minKlicksTopPerformer: number | null
  minImpCtrUrteil: number | null
  minImpReichweiteStark: number | null
  minKlicksNutzerSignal: number | null
  topPerformerMaxAlter: number | null
  schlafenderGewinnerAlter: number | null
  ctrBoostFaktor: number | null
  fallbackCtr: number | null
}

export type InitialPersoenlicheLinks = {
  pinterestAccountUrl: string
  websiteUrl: string
  tailwindUrl: string
}

export type InitialBoardSchwellwerte = {
  wenigAktiv: number | null
  inaktiv: number | null
  topEr: number | null
  topProzent: number | null
  schwachEr: number | null
  wachstumTrend: number | null
}

export type InitialContentPipelineSchwellwerte = {
  minPinsGesamt: number | null
  minPinsOhneAktuell: number | null
  tageOhnePin: number | null
  minCtrGoldnugget: number | null
  maxPinsGoldnugget: number | null
}

export type InitialStrategie = {
  mix: [number, number, number]
  ziele: [number, number, number]
  format: [number, number, number, number]
  schwelleGelb: number
  schwelleRot: number
  onboardingAbgeschlossen: boolean
}

export type InitialStatusSchwellwerte = {
  intervall: number
  vorwarnung: number
}

export default function EinstellungenClient({
  initialProfilName,
  initialEigeneSignalwoerter,
  initialPinterestAnalyticsUrl,
  initialPersoenlicheLinks,
  initialSchwellwerte,
  initialBenchmark,
  initialNicheProfile,
  initialBoardSchwellwerte,
  initialContentPipelineSchwellwerte,
  initialStatusSchwellwerte,
  initialStrategie,
}: {
  initialProfilName: string
  initialEigeneSignalwoerter: string
  initialPinterestAnalyticsUrl: string
  initialPersoenlicheLinks: InitialPersoenlicheLinks
  initialSchwellwerte: InitialSchwellwerte
  initialBenchmark: UserPinBenchmark | null
  initialNicheProfile: AccountNicheProfile
  initialBoardSchwellwerte: InitialBoardSchwellwerte
  initialContentPipelineSchwellwerte: InitialContentPipelineSchwellwerte
  initialStatusSchwellwerte: InitialStatusSchwellwerte
  initialStrategie: InitialStrategie
}) {
  return (
    <div className="space-y-6">
      <ProfilNameSection initial={initialProfilName} />
      <SignalwoerterSection initial={initialEigeneSignalwoerter} />
      <PersoenlicheLinksSection initial={initialPersoenlicheLinks} />
      <AnalyticsLinkSection initial={initialPinterestAnalyticsUrl} />
      <SchwellwerteSection
        initial={initialSchwellwerte}
        benchmark={initialBenchmark}
        nicheProfile={initialNicheProfile}
      />
      <BoardSchwellwerteSection initial={initialBoardSchwellwerte} />
      <ContentPipelineSchwellwerteSection
        initial={initialContentPipelineSchwellwerte}
      />
      <StatusSchwellwerteSection initial={initialStatusSchwellwerte} />
      <StrategieSection initial={initialStrategie} />
    </div>
  )
}

function ProfilNameSection({ initial }: { initial: string }) {
  const [name, setName] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    saved?: boolean
    error?: string
  }>({})

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setFeedback({})
    startTransition(async () => {
      const result = await saveEinstellungen(formData)
      if (result.error) setFeedback({ error: result.error })
      else setFeedback({ saved: true })
    })
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Mein Profil</h2>
      <p className="mt-1 text-sm text-gray-600">
        Dieser Name wird als Begrüßung auf dem Dashboard angezeigt.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="profil_name"
            className="block text-sm font-medium text-gray-700"
          >
            Dein Name oder Pinterest-Profilname
          </label>
          <input
            id="profil_name"
            name="profil_name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="z.B. Jana"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Speichert…' : 'Speichern'}
          </button>
          {feedback.saved && (
            <span className="text-sm text-green-700">Gespeichert ✓</span>
          )}
          {feedback.error && (
            <span className="text-sm text-red-700">{feedback.error}</span>
          )}
        </div>
      </form>
    </section>
  )
}

function PersoenlicheLinksSection({
  initial,
}: {
  initial: InitialPersoenlicheLinks
}) {
  const [pinterestAccount, setPinterestAccount] = useState(
    initial.pinterestAccountUrl
  )
  const [website, setWebsite] = useState(initial.websiteUrl)
  const [tailwind, setTailwind] = useState(initial.tailwindUrl)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    saved?: boolean
    error?: string
  }>({})

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setFeedback({})
    startTransition(async () => {
      const result = await saveEinstellungen(formData)
      if (result.error) setFeedback({ error: result.error })
      else setFeedback({ saved: true })
    })
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">
        Persönliche Links (Dashboard)
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Diese Links erscheinen als Quick-Buttons auf deinem Dashboard. Lass
        Felder leer, wenn du sie noch nicht hast.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <UrlField
          label="🔗 Pinterest Account"
          name="pinterest_account_url"
          value={pinterestAccount}
          onChange={setPinterestAccount}
          placeholder="https://www.pinterest.de/dein_account/"
        />
        <UrlField
          label="🌐 Meine Website"
          name="website_url"
          value={website}
          onChange={setWebsite}
          placeholder="https://deine-website.de"
        />
        <UrlField
          label="📅 Tailwind"
          name="tailwind_url"
          value={tailwind}
          onChange={setTailwind}
          placeholder="https://www.tailwindapp.com/..."
        />

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Speichert…' : 'Speichern'}
          </button>
          {feedback.saved && (
            <span className="text-sm text-green-700">✓ Gespeichert</span>
          )}
          {feedback.error && (
            <span className="text-sm text-red-700">{feedback.error}</span>
          )}
        </div>
      </form>
    </section>
  )
}

function UrlField({
  label,
  name,
  value,
  onChange,
  placeholder,
}: {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
      />
    </div>
  )
}

function SignalwoerterSection({ initial }: { initial: string }) {
  const [text, setText] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    saved?: boolean
    error?: string
  }>({})

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setFeedback({})
    startTransition(async () => {
      const result = await saveEinstellungen(formData)
      if (result.error) setFeedback({ error: result.error })
      else setFeedback({ saved: true })
    })
  }

  const previewWords = text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">
        Eigene Signalwörter
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Ergänze den Standard-Signalwort-Pool um deine eigenen Wörter. Diese
        werden bei der Pin-Produktion automatisch an den KI-Prompt angehängt.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="eigene_signalwoerter"
            className="block text-sm font-medium text-gray-700"
          >
            Signalwörter (kommagetrennt)
          </label>
          <textarea
            id="eigene_signalwoerter"
            name="eigene_signalwoerter"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="z.B. heimelig, gemütlich, kuschelig, behaglich"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Trenne deine Wörter mit Kommas. Leerzeichen rund um die Kommas
            werden automatisch entfernt.
          </p>
        </div>

        {previewWords.length > 0 && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Erkannt: {previewWords.length}{' '}
              {previewWords.length === 1 ? 'Wort' : 'Wörter'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {previewWords.map((w, i) => (
                <span
                  key={`${w}-${i}`}
                  className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-xs text-gray-700 ring-1 ring-gray-200"
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Speichert…' : 'Speichern'}
          </button>
          {feedback.saved && (
            <span className="text-sm text-green-700">✓ Gespeichert</span>
          )}
          {feedback.error && (
            <span className="text-sm text-red-700">{feedback.error}</span>
          )}
        </div>
      </form>
    </section>
  )
}

function SchwellwerteSection({
  initial,
  benchmark,
  nicheProfile,
}: {
  initial: InitialSchwellwerte
  benchmark: UserPinBenchmark | null
  nicheProfile: AccountNicheProfile
}) {
  const [beobachtung, setBeobachtung] = useState(
    initial.beobachtung !== null ? String(initial.beobachtung) : '65'
  )
  const [minImpCtrUrteil, setMinImpCtrUrteil] = useState(
    initial.minImpCtrUrteil !== null
      ? String(initial.minImpCtrUrteil)
      : '300'
  )
  const [minImpReichweiteStark, setMinImpReichweiteStark] = useState(
    initial.minImpReichweiteStark !== null
      ? String(initial.minImpReichweiteStark)
      : '500'
  )
  const [minKlicksTopPerformer, setMinKlicksTopPerformer] = useState(
    initial.minKlicksTopPerformer !== null
      ? String(initial.minKlicksTopPerformer)
      : '10'
  )
  const [minKlicksNutzerSignal, setMinKlicksNutzerSignal] = useState(
    initial.minKlicksNutzerSignal !== null
      ? String(initial.minKlicksNutzerSignal)
      : '3'
  )
  const [topPerformerMaxAlter, setTopPerformerMaxAlter] = useState(
    initial.topPerformerMaxAlter !== null
      ? String(initial.topPerformerMaxAlter)
      : '90'
  )
  const [schlafenderGewinnerAlter, setSchlafenderGewinnerAlter] = useState(
    initial.schlafenderGewinnerAlter !== null
      ? String(initial.schlafenderGewinnerAlter)
      : '180'
  )
  const [ctrBoostFaktor, setCtrBoostFaktor] = useState(
    initial.ctrBoostFaktor !== null
      ? String(initial.ctrBoostFaktor)
      : '1.2'
  )
  const [fallbackCtr, setFallbackCtr] = useState(
    initial.fallbackCtr !== null ? String(initial.fallbackCtr) : '1.5'
  )
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    saved?: boolean
    error?: string
  }>({})

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setFeedback({})
    startTransition(async () => {
      const result = await saveEinstellungen(formData)
      if (result.error) setFeedback({ error: result.error })
      else setFeedback({ saved: true })
    })
  }

  return (
    <section
      id="pin-schwellwerte"
      className="scroll-mt-24 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-900">
        Pin-Schwellwerte für Analytics
      </h2>
      <div className="mt-1 space-y-2 text-sm text-gray-600">
        <p>
          Diese Werte entscheiden, wann ein Pin als „gut", „schlecht" oder „noch
          zu früh zur Bewertung" gilt.
        </p>
        <p>
          <strong>Wie funktioniert die Bewertung?</strong> Wir vergleichen jeden
          deiner Pins mit deinem eigenen Durchschnitt — performt er besser oder
          schlechter als deine anderen Pins? Damit das fair funktioniert, gibt
          es zusätzliche Sicherheits-Schwellen:
        </p>
        <ul className="ml-4 list-disc space-y-0.5">
          <li>
            <strong>Mindest-Daten:</strong> Bei zu wenig Impressionen sind alle
            Quoten unzuverlässig.
          </li>
          <li>
            <strong>Mindest-Aktivität:</strong> Ein neuer Pin braucht Wochen,
            bevor Pinterest ihn voll ausspielt.
          </li>
        </ul>
        <p>
          <strong>Müssen die Werte geändert werden?</strong> Meistens nein.
          Anpassen lohnt sich nur in Sonderfällen — siehe die Hinweise an jedem
          Feld.
        </p>
      </div>

      <BenchmarkInfoBox benchmark={benchmark} nicheProfile={nicheProfile} />

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <SchwellwertField
          label="Beobachtungszeitraum (Tage)"
          name="schwellwert_beobachtung"
          value={beobachtung}
          onChange={setBeobachtung}
          step={1}
          help={'Wie lange ist ein Pin „zu jung" für eine Bewertung?\nPinterest spielt neue Pins langsam an. Erst nach ~65 Tagen ist eine Aussage stabil.'}
          whenToAdjust={'Niedriger (z. B. 45) → schnellere Diagnose, aber unsicherer.\nHöher (z. B. 90) → vorsichtiger, aber spätere Reaktion.'}
        />
        <SchwellwertField
          label="Mindest-Impressionen für CTR-Urteil"
          name="schwellwert_min_imp_ctr_urteil"
          value={minImpCtrUrteil}
          onChange={setMinImpCtrUrteil}
          step={1}
          help={'Ab wann sind Klickraten verlässlich?\nBeispiel: 1 Klick aus 50 Impressionen wäre 2 % CTR — das wäre Glück, nicht Muster.'}
          whenToAdjust={'Niedriger (z. B. 200) → schnellere Bewertung, aber höheres Fehlrisiko.\nHöher (z. B. 500) → sicherer, aber mehr Pins bleiben länger in „Noch zu früh".'}
        />
        <SchwellwertField
          label="Mindest-Impressionen für starke Reichweite"
          name="schwellwert_min_imp_reichweite_stark"
          value={minImpReichweiteStark}
          onChange={setMinImpReichweiteStark}
          step={1}
          help={'Ab wann gilt ein Pin als „von Pinterest gut ausgespielt"?'}
          whenToAdjust={'Bei kleinem Account (alle Pins unter 200 Impressionen): niedriger setzen, z. B. 200.\nBei großem Account mit viralen Pins: höher setzen, z. B. 1000.'}
        />
        <SchwellwertField
          label="Mindest-Klicks für Top Performer"
          name="schwellwert_min_klicks"
          value={minKlicksTopPerformer}
          onChange={setMinKlicksTopPerformer}
          step={1}
          help={'Wie viele Klicks muss ein Pin mindestens haben, um als Top Performer zu gelten?\nSchutz davor, dass 1-2 Zufalls-Klicks zum Top Performer machen.'}
          whenToAdjust={'Bei großem Account: höher setzen (z. B. 20).\nBei kleinem Account: 5 lassen — ist schon ein Erfolg.'}
        />
        <SchwellwertField
          label="Mindest-Klicks für Nutzer-Signal"
          name="schwellwert_min_klicks_nutzer_signal"
          value={minKlicksNutzerSignal}
          onChange={setMinKlicksNutzerSignal}
          step={1}
          help={'Schutz vor Zufalls-Klicks.\nBei nur 1-2 Klicks könnte das Glück sein. Erst ab diesem Wert reden wir von einem Muster.'}
          whenToAdjust={'Höher → strengere Bewertung. Niedriger nicht empfohlen.'}
        />
        <SchwellwertField
          label="Top Performer Max-Alter (Tage)"
          name="schwellwert_top_performer_max_alter"
          value={topPerformerMaxAlter}
          onChange={setTopPerformerMaxAlter}
          step={1}
          help={'Ab welchem Alter ist ein Top Performer kein „aktiver" Top Performer mehr?\nPinterest-Algorithmus belohnt frische Pins — auch gute alte Pins verlieren irgendwann ihre Sonderbehandlung.'}
          whenToAdjust={'Selten nötig — Standardwert passt für die meisten Accounts.'}
        />
        <SchwellwertField
          label="Eingeschlafener Gewinner ab Alter (Tage)"
          name="schwellwert_schlafender_gewinner_alter"
          value={schlafenderGewinnerAlter}
          onChange={setSchlafenderGewinnerAlter}
          step={1}
          help={'Wann gilt ein historisch starker Pin als Recycling-Kandidat?\nTypische Pinterest-Halbwertszeit für Pins: ca. 6 Monate.'}
          whenToAdjust={'Selten nötig.'}
        />
        <SchwellwertField
          label="CTR-Boost-Faktor"
          name="schwellwert_ctr_boost_faktor"
          value={ctrBoostFaktor}
          onChange={setCtrBoostFaktor}
          step={0.1}
          help={'Wie stark muss die Klickrate über deinem Durchschnitt liegen, um als „stark" zu gelten?\nBeispiel: Bei 1.2 muss ein Pin 20 % über deiner Durchschnitts-CTR liegen.'}
          whenToAdjust={'Niedriger (1.0) → mehr Pins als klickstark erkannt, weniger Trennschärfe.\nHöher (1.5) → nur deutliche Outperformer werden erkannt.'}
        />
        <SchwellwertField
          label="Mindest-CTR (Fallback) (%)"
          name="schwellwert_ctr"
          value={fallbackCtr}
          onChange={setFallbackCtr}
          step={0.1}
          help={'Notfall-Wert für junge Accounts mit weniger als 10 qualifizierten Pins.\nSobald du genug Pins hast, wird dieser Wert automatisch durch deinen eigenen Durchschnitt ersetzt.'}
          whenToAdjust={'Bei sehr neuem Account auf 1.0 setzen, damit überhaupt etwas erkannt wird.'}
        />

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Speichert…' : 'Speichern'}
          </button>
          {feedback.saved && (
            <span className="text-sm text-green-700">
              ✓ Schwellwerte gespeichert — alle Pins wurden neu bewertet.
            </span>
          )}
          {feedback.error && (
            <span className="text-sm text-red-700">{feedback.error}</span>
          )}
        </div>
      </form>
    </section>
  )
}

// Mindestanzahl qualifizierter Pins, ab der die App eine eigene Benchmark
// berechnet — bis dahin greift der Fallback-CTR und die Median-Spalte zeigt
// "noch nicht berechenbar". Spiegelt BENCHMARK_MIN_PINS aus benchmark.ts.
const BENCHMARK_MIN_PINS_FOR_DISPLAY = 10

function BenchmarkInfoBox({
  benchmark,
  nicheProfile,
}: {
  benchmark: UserPinBenchmark | null
  nicheProfile: AccountNicheProfile
}) {
  const niche = nicheProfile.primaryNiche
  const useNicheVergleich =
    niche !== null && !nicheProfile.isMixed
  const qualifiziertePins = benchmark?.qualifiziertePins ?? 0
  const fehlendePins = Math.max(
    0,
    BENCHMARK_MIN_PINS_FOR_DISPLAY - qualifiziertePins
  )

  return (
    <div className="mt-3 rounded-md border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
      <p className="text-base font-semibold">
        Deine aktuelle Benchmark — so performen deine Pins im Schnitt:
      </p>

      <NicheHeader nicheProfile={nicheProfile} />

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <BenchmarkMetricCard
          label="Median CTR"
          value={benchmark?.medianCtr ?? null}
          digits={2}
          unit="%"
          range={useNicheVergleich ? niche!.ctr : null}
          fallbackHint={
            fehlendePins > 0
              ? `Du brauchst noch ${fehlendePins} qualifizierte Pin${fehlendePins === 1 ? '' : 's'} (≥ 100 Imp.) für eine eigene Benchmark.`
              : null
          }
        />
        <BenchmarkMetricCard
          label="Median Save-Rate"
          value={benchmark?.medianSaveRate ?? null}
          digits={2}
          unit="%"
          range={useNicheVergleich ? niche!.save_rate : null}
          fallbackHint={
            fehlendePins > 0
              ? `Du brauchst noch ${fehlendePins} qualifizierte Pin${fehlendePins === 1 ? '' : 's'} (≥ 100 Imp.) für eine eigene Benchmark.`
              : null
          }
        />
        <BenchmarkImpressionsCard
          value={benchmark?.medianImpressionen ?? null}
        />
      </div>

      {niche && useNicheVergleich && niche.hinweis && (
        <p className="mt-3 rounded-md border border-cyan-200 bg-white/60 p-2 text-xs text-cyan-900">
          <strong>{niche.label}-Tipp:</strong> {niche.hinweis}
        </p>
      )}

      <p className="mt-3 text-xs text-cyan-800/80">
        Berechnet aus {qualifiziertePins} deiner Pins (jünger als 90 Tage,
        mind. 100 Impressionen). Diese Werte aktualisieren sich automatisch
        bei jedem Daten-Import.
      </p>
    </div>
  )
}

// Header über den Benchmark-Karten — zeigt Hauptnische + Anteil oder
// "kein klarer Fokus"-Hinweis bei gemischten/uncategorisierten Accounts.
function NicheHeader({ nicheProfile }: { nicheProfile: AccountNicheProfile }) {
  const sharePct = Math.round(nicheProfile.primaryShare * 100)
  if (nicheProfile.unzureichendKategorisiert) {
    return (
      <p className="mt-2 text-xs text-cyan-800/80">
        <strong>Hauptnische:</strong> noch keine Zuordnung möglich — weniger
        als die Hälfte deiner Pins liegt auf kategorisierten Boards.
        Generelle Pinterest-Vergleichswerte werden angezeigt.
      </p>
    )
  }
  if (!nicheProfile.primaryNiche || nicheProfile.isMixed) {
    return (
      <p className="mt-2 text-xs text-cyan-800/80">
        <strong>Hauptnische:</strong> Dein Account hat keine klare Hauptnische
        — generelle Pinterest-Vergleichswerte werden angezeigt.
      </p>
    )
  }
  return (
    <p className="mt-2 text-xs text-cyan-800/80">
      <strong>Hauptnische:</strong> {nicheProfile.primaryNiche.label} (
      {sharePct} % deiner Pins)
    </p>
  )
}

// Eine Karte für CTR oder Save-Rate. Liegt eine Nischen-Range vor, wird die
// Einordnung farbig angezeigt; sonst greift der Fallback-Hinweis (zu wenig
// Pins für eigene Benchmark).
function BenchmarkMetricCard({
  label,
  value,
  digits,
  unit,
  range,
  fallbackHint,
}: {
  label: string
  value: number | null
  digits: number
  unit: string
  range: Range | null
  fallbackHint: string | null
}) {
  const formatted =
    value === null || !Number.isFinite(value)
      ? null
      : value.toFixed(digits).replace('.', ',')
  const einordnung: Einordnung | null =
    value !== null && Number.isFinite(value) && range
      ? getEinordnung(value, range)
      : null

  return (
    <div className="rounded-md border border-cyan-200 bg-white/70 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-cyan-700">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-cyan-900">
        {formatted !== null ? (
          <>
            {formatted}
            {unit}
          </>
        ) : (
          <span className="text-sm font-medium text-gray-500">
            noch nicht berechenbar
          </span>
        )}
      </p>
      {range ? (
        <p className="mt-1 text-xs text-cyan-800/80">
          Branchenschnitt:{' '}
          <span className="tabular-nums">
            {range.schwach.toFixed(1).replace('.', ',')}–
            {range.durchschnitt.toFixed(1).replace('.', ',')}
            {unit}
          </span>
        </p>
      ) : (
        <p className="mt-1 text-xs text-cyan-800/80">
          Allgemeiner Pinterest-Schnitt: 0,3–0,8 % (CTR), 0,2–0,5 %
          (Save-Rate).
        </p>
      )}
      {einordnung ? (
        <p
          className={`mt-1 text-xs font-medium ${EINORDNUNG_TEXT[einordnung.color]}`}
        >
          {einordnung.icon} {einordnungLabel(einordnung.label)}
        </p>
      ) : fallbackHint ? (
        <p className="mt-1 text-xs italic text-gray-500">{fallbackHint}</p>
      ) : null}
    </div>
  )
}

// Impressionen-Karte ohne Nischen-Einordnung — Reichweite ist account-spezifisch.
function BenchmarkImpressionsCard({ value }: { value: number | null }) {
  const formatted =
    value === null || !Number.isFinite(value)
      ? null
      : value.toLocaleString('de-DE')
  return (
    <div className="rounded-md border border-cyan-200 bg-white/70 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-cyan-700">
        Median Impressionen
      </p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-cyan-900">
        {formatted !== null ? (
          formatted
        ) : (
          <span className="text-sm font-medium text-gray-500">
            noch nicht berechenbar
          </span>
        )}
      </p>
      <p className="mt-1 text-xs text-cyan-800/80">
        Nur als Referenzwert — Reichweite ist stark account-spezifisch und
        wird nicht für Branchen-Vergleiche genutzt.
      </p>
    </div>
  )
}

// Tailwind-Mapping für die drei Einordnungs-Farben.
const EINORDNUNG_TEXT = {
  green: 'text-green-700',
  gray: 'text-gray-600',
  orange: 'text-orange-700',
} as const

function einordnungLabel(label: Einordnung['label']): string {
  switch (label) {
    case 'top-performer':
      return 'Top-Performer in deiner Nische'
    case 'überdurchschnittlich':
      return 'Überdurchschnittlich für deine Nische'
    case 'durchschnittlich':
      return 'Durchschnittlich für deine Nische'
    case 'unter-durchschnitt':
      return 'Unter Branchenschnitt'
  }
}


function SchwellwertField({
  label,
  name,
  value,
  onChange,
  step,
  help,
  orientation,
  whenToAdjust,
}: {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  step: number
  help: string
  orientation?: string
  // Optionaler "Wann anpassen?"-Hinweis (Pin-Schwellwerte). Whitespace
  // wird respektiert, damit mehrzeilige Empfehlungen sauber umbrechen.
  whenToAdjust?: string
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 md:max-w-xs"
      />
      <p className="mt-1 whitespace-pre-line text-xs text-gray-500">{help}</p>
      {whenToAdjust && (
        <p className="mt-1 whitespace-pre-line text-xs text-gray-500">
          <span className="font-medium text-gray-600">Wann anpassen?</span>{' '}
          {whenToAdjust}
        </p>
      )}
      {orientation && (
        <p className="mt-0.5 text-xs italic text-gray-400">{orientation}</p>
      )}
    </div>
  )
}

function BoardSchwellwerteSection({
  initial,
}: {
  initial: InitialBoardSchwellwerte
}) {
  const [wenigAktiv, setWenigAktiv] = useState(
    initial.wenigAktiv !== null ? String(initial.wenigAktiv) : '30'
  )
  const [inaktiv, setInaktiv] = useState(
    initial.inaktiv !== null ? String(initial.inaktiv) : '60'
  )
  const [topEr, setTopEr] = useState(
    initial.topEr !== null ? String(initial.topEr) : '3.0'
  )
  const [topProzent, setTopProzent] = useState(
    initial.topProzent !== null ? String(initial.topProzent) : '30.0'
  )
  const [schwachEr, setSchwachEr] = useState(
    initial.schwachEr !== null ? String(initial.schwachEr) : '1.5'
  )
  const [wachstumTrend, setWachstumTrend] = useState(
    initial.wachstumTrend !== null ? String(initial.wachstumTrend) : '20.0'
  )
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    saved?: boolean
    error?: string
  }>({})

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setFeedback({})
    startTransition(async () => {
      const result = await saveEinstellungen(formData)
      if (result.error) setFeedback({ error: result.error })
      else setFeedback({ saved: true })
    })
  }

  return (
    <section
      id="board-schwellwerte"
      className="scroll-mt-24 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-900">
        Board-Schwellwerte für Analytics
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Diese Werte steuern den Board-Status (Aktivität) und Board-Score
        (Performance) im Boards-Tab. Passe sie an die Größe deines Accounts an.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-900">
            Status (Aktivität)
          </p>
          <div className="mt-2 space-y-4">
            <SchwellwertField
              label="Wenig aktiv ab (Tage)"
              name="schwellwert_board_wenig_aktiv"
              value={wenigAktiv}
              onChange={setWenigAktiv}
              step={1}
              help={'Ab wie vielen Tagen ohne neuen Pin gilt ein Board als „wenig aktiv"?'}
              orientation="Orientierung: Anfänger 30 Tage | Erfahren 14 Tage | Profi 7 Tage"
            />
            <SchwellwertField
              label="Inaktiv ab (Tage)"
              name="schwellwert_board_inaktiv"
              value={inaktiv}
              onChange={setInaktiv}
              step={1}
              help={'Ab wie vielen Tagen ohne neuen Pin gilt ein Board als „inaktiv"?'}
              orientation="Orientierung: Anfänger 60 Tage | Erfahren 30 Tage | Profi 14 Tage"
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-900">
            Score (Performance)
          </p>
          <div className="mt-2 space-y-4">
            <SchwellwertField
              label="Top Board ER Schwellwert (%)"
              name="schwellwert_board_top_er"
              value={topEr}
              onChange={setTopEr}
              step={0.1}
              help={'Mindest-Engagement Rate, ab der ein Board als „Top" gelten darf (zusätzlich muss es in den oberen X% des Profils liegen).'}
              orientation="Orientierung: Anfänger 1,5% | Erfahren 3% | Profi 5% — Pinterest Durchschnitt: 0,3-0,8%"
            />
            <SchwellwertField
              label="Top Board Profil-Prozent (%)"
              name="schwellwert_board_top_prozent"
              value={topProzent}
              onChange={setTopProzent}
              step={1}
              help={'Anteil der besten Boards (nach ER), die als „Top" gelten dürfen.'}
              orientation="Orientierung: obere 30% des eigenen Profils — verhindert dass alle Boards als Top markiert werden"
            />
            <SchwellwertField
              label="Schwach ER Schwellwert (%)"
              name="schwellwert_board_schwach_er"
              value={schwachEr}
              onChange={setSchwachEr}
              step={0.1}
              help={'Engagement Rate unter diesem Wert → Board gilt als „Schwach".'}
              orientation="Orientierung: Anfänger 0,8% | Erfahren 1,5% | Profi 2%"
            />
            <SchwellwertField
              label="Wachstums-Trend Schwellwert (%)"
              name="schwellwert_board_wachstum_trend"
              value={wachstumTrend}
              onChange={setWachstumTrend}
              step={1}
              help={'Mindest-Verbesserung der ER zum Vormonat, damit ein Board als „Wachstum" gilt. Gleicher Wert als Verschlechterung → „Schwach" (Trend-Schwach).'}
              orientation="Orientierung: 20% Verbesserung zum Vormonat gilt als Wachstums-Signal"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Speichert…' : 'Speichern'}
          </button>
          {feedback.saved && (
            <span className="text-sm text-green-700">✓ Gespeichert</span>
          )}
          {feedback.error && (
            <span className="text-sm text-red-700">{feedback.error}</span>
          )}
        </div>
      </form>
    </section>
  )
}

function AnalyticsLinkSection({ initial }: { initial: string }) {
  const [url, setUrl] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    saved?: boolean
    error?: string
  }>({})

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setFeedback({})
    startTransition(async () => {
      const result = await saveEinstellungen(formData)
      if (result.error) setFeedback({ error: result.error })
      else setFeedback({ saved: true })
    })
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">
        Pinterest Analytics Link
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Füge den direkten Link zu deiner Pinterest Analytics Seite ein. So
        kommst du mit einem Klick dorthin, wenn du deine monatlichen Zahlen
        einträgst.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="pinterest_analytics_url"
            className="block text-sm font-medium text-gray-700"
          >
            URL zur Pinterest Analytics Seite
          </label>
          <input
            id="pinterest_analytics_url"
            name="pinterest_analytics_url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://analytics.pinterest.com/de/..."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        {url && /^https?:\/\//i.test(url) && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-red-600 hover:underline"
            >
              ↗ Gespeicherten Link öffnen
            </a>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Speichert…' : 'Speichern'}
          </button>
          {feedback.saved && (
            <span className="text-sm text-green-700">✓ Gespeichert</span>
          )}
          {feedback.error && (
            <span className="text-sm text-red-700">{feedback.error}</span>
          )}
        </div>
      </form>
    </section>
  )
}

function ContentPipelineSchwellwerteSection({
  initial,
}: {
  initial: InitialContentPipelineSchwellwerte
}) {
  const [minPinsGesamt, setMinPinsGesamt] = useState(
    initial.minPinsGesamt !== null ? String(initial.minPinsGesamt) : '3'
  )
  const [minPinsOhneAktuell, setMinPinsOhneAktuell] = useState(
    initial.minPinsOhneAktuell !== null
      ? String(initial.minPinsOhneAktuell)
      : '3'
  )
  const [tageOhnePin, setTageOhnePin] = useState(
    initial.tageOhnePin !== null ? String(initial.tageOhnePin) : '30'
  )
  const [minCtrGoldnugget, setMinCtrGoldnugget] = useState(
    initial.minCtrGoldnugget !== null
      ? String(initial.minCtrGoldnugget)
      : '1.5'
  )
  const [maxPinsGoldnugget, setMaxPinsGoldnugget] = useState(
    initial.maxPinsGoldnugget !== null
      ? String(initial.maxPinsGoldnugget)
      : '5'
  )
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    saved?: boolean
    error?: string
  }>({})

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setFeedback({})
    startTransition(async () => {
      const result = await saveEinstellungen(formData)
      if (result.error) setFeedback({ error: result.error })
      else setFeedback({ saved: true })
    })
  }

  return (
    <section
      id="content-pipeline-schwellwerte"
      className="scroll-mt-24 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-900">
        Content-Pipeline-Schwellwerte
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Diese Werte steuern, welche Inhalte und URLs in der Content-Pipeline auf
        dem Dashboard als handlungsbedürftig markiert werden.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-900">
            Inhalte mit zu wenigen Pins
          </p>
          <div className="mt-2">
            <SchwellwertField
              label="Mindest-Pin-Anzahl pro Inhalt"
              name="cp_min_pins_gesamt"
              value={minPinsGesamt}
              onChange={setMinPinsGesamt}
              step={1}
              help={'Inhalte mit weniger Pins werden in „Neue Pins produzieren" als „zu wenig bepinnt" markiert.'}
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-900">
            Inhalte ohne aktuellen Pin
          </p>
          <div className="mt-2 space-y-4">
            <SchwellwertField
              label={'Mindest-Pin-Anzahl für Sub-Liste „Ohne aktuellen Pin"'}
              name="cp_min_pins_ohne_aktuell"
              value={minPinsOhneAktuell}
              onChange={setMinPinsOhneAktuell}
              step={1}
              help="Inhalte mit weniger Pins erscheinen in der ersten Sub-Liste, nicht hier."
            />
            <SchwellwertField
              label="Tage seit letztem Pin"
              name="cp_tage_ohne_pin"
              value={tageOhnePin}
              onChange={setTageOhnePin}
              step={1}
              help={'Inhalte ohne neuen Pin in dieser Anzahl Tagen werden als „kontinuierliche Pin-Produktion fehlt" markiert.'}
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-900">
            URLs mit Potenzial (Goldnuggets)
          </p>
          <div className="mt-2 space-y-4">
            <SchwellwertField
              label="Mindest-CTR für Goldnugget-URLs (%)"
              name="cp_min_ctr_goldnugget"
              value={minCtrGoldnugget}
              onChange={setMinCtrGoldnugget}
              step={0.1}
              help="URLs mit überdurchschnittlicher CTR werden als Goldnuggets markiert. Pinterest-Durchschnitt liegt bei 0,3-0,8%."
            />
            <SchwellwertField
              label="Maximale Pin-Anzahl für Goldnugget-URLs"
              name="cp_max_pins_goldnugget"
              value={maxPinsGoldnugget}
              onChange={setMaxPinsGoldnugget}
              step={1}
              help="Goldnugget-URLs sind solche mit hoher CTR aber noch wenig Pins."
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Speichert…' : 'Speichern'}
          </button>
          {feedback.saved && (
            <span className="text-sm text-green-700">✓ Gespeichert</span>
          )}
          {feedback.error && (
            <span className="text-sm text-red-700">{feedback.error}</span>
          )}
        </div>
      </form>
    </section>
  )
}

// ============================================================
// Strategie & Ausrichtung — manuelle Anpassung
// ============================================================

const STRATEGIE_ACCENTS = {
  blue: 'accent-blue-500',
  purple: 'accent-purple-500',
  green: 'accent-green-500',
  orange: 'accent-orange-500',
  gray: 'accent-gray-500',
  red: 'accent-red-500',
  yellow: 'accent-yellow-400',
  pink: 'accent-pink-500',
  indigo: 'accent-indigo-500',
  black: 'accent-black',
} as const
const STRATEGIE_FILL_HEX = {
  blue: '#3b82f6',
  purple: '#a855f7',
  green: '#22c55e',
  orange: '#f97316',
  gray: '#6b7280',
  red: '#ef4444',
  yellow: '#facc15',
  pink: '#ec4899',
  indigo: '#6366f1',
  black: '#000000',
} as const
const STRATEGIE_TRACK_GRAY = '#e5e7eb' // bg-gray-200
type StrategieAccent = keyof typeof STRATEGIE_ACCENTS

function StatusSchwellwerteSection({
  initial,
}: {
  initial: InitialStatusSchwellwerte
}) {
  const [intervall, setIntervall] = useState<string>(
    String(initial.intervall)
  )
  const [vorwarnung, setVorwarnung] = useState<string>(
    String(initial.vorwarnung)
  )
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    saved?: boolean
    error?: string
  }>({})

  const intervallN = Number(intervall)
  const vorwarnungN = Number(vorwarnung)
  const validationErr =
    !Number.isInteger(intervallN) || intervallN < 7 || intervallN > 60
      ? 'Update-Intervall muss eine ganze Zahl zwischen 7 und 60 sein.'
      : !Number.isInteger(vorwarnungN) ||
          vorwarnungN < 1 ||
          vorwarnungN > 14
        ? 'Update-Vorwarnung muss eine ganze Zahl zwischen 1 und 14 sein.'
        : vorwarnungN >= intervallN
          ? 'Update-Vorwarnung muss kleiner sein als das Update-Intervall.'
          : null

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFeedback({})
    if (validationErr) {
      setFeedback({ error: validationErr })
      return
    }
    const formData = new FormData()
    formData.set('status_update_intervall', String(intervallN))
    formData.set('status_update_vorwarnung', String(vorwarnungN))
    startTransition(async () => {
      const result = await saveEinstellungen(formData)
      if (result.error) setFeedback({ error: result.error })
      else setFeedback({ saved: true })
    })
  }

  return (
    <section
      id="status-schwellwerte"
      className="scroll-mt-24 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-900">
        Status-Schwellwerte
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Diese Werte steuern den Analytics-Status (grün/gelb/rot) auf dem
        Dashboard. Der Status wechselt automatisch je nach Tagen seit deinem
        letzten Analytics-Update.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="status_update_intervall"
            className="block text-sm font-medium text-gray-700"
          >
            Update-Intervall (Tage)
          </label>
          <input
            id="status_update_intervall"
            name="status_update_intervall"
            type="number"
            min={7}
            max={60}
            step={1}
            value={intervall}
            onChange={(e) => setIntervall(e.target.value)}
            className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Nach dieser Anzahl Tage gilt ein Analytics-Update als überfällig.
            Standard: 31. Min: 7, Max: 60.
          </p>
        </div>

        <div>
          <label
            htmlFor="status_update_vorwarnung"
            className="block text-sm font-medium text-gray-700"
          >
            Update-Vorwarnung (Tage)
          </label>
          <input
            id="status_update_vorwarnung"
            name="status_update_vorwarnung"
            type="number"
            min={1}
            max={14}
            step={1}
            value={vorwarnung}
            onChange={(e) => setVorwarnung(e.target.value)}
            className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            So viele Tage vor Fälligkeit wechselt der Status auf Gelb. Muss
            kleiner sein als das Update-Intervall. Standard: 7. Min: 1, Max:
            14.
          </p>
        </div>

        {validationErr && (
          <p className="text-xs text-red-700">{validationErr}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending || !!validationErr}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Speichert…' : 'Speichern'}
          </button>
          {feedback.saved && (
            <span className="text-sm text-green-700">✓ Gespeichert</span>
          )}
          {feedback.error && (
            <span className="text-sm text-red-700">{feedback.error}</span>
          )}
        </div>
      </form>
    </section>
  )
}

function StrategieSection({ initial }: { initial: InitialStrategie }) {
  const [mix, setMix] = useState<[number, number, number]>(initial.mix)
  const [ziele, setZiele] = useState<[number, number, number]>(initial.ziele)
  const [format, setFormat] = useState<[number, number, number, number]>(
    initial.format
  )
  const [schwelleGelb, setSchwelleGelb] = useState<string>(
    String(initial.schwelleGelb)
  )
  const [schwelleRot, setSchwelleRot] = useState<string>(
    String(initial.schwelleRot)
  )
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    saved?: boolean
    error?: string
  }>({})

  const mixSum = mix[0] + mix[1] + mix[2]
  const zieleSum = ziele[0] + ziele[1] + ziele[2]
  const formatSum = format[0] + format[1] + format[2] + format[3]
  const allOk = mixSum === 100 && zieleSum === 100 && formatSum === 100

  const gelbN = Number(schwelleGelb)
  const rotN = Number(schwelleRot)
  const schwelleErr =
    !Number.isInteger(gelbN) || gelbN < 0 || gelbN > 100
      ? 'Diff-Schwelle Gelb muss eine ganze Zahl zwischen 0 und 100 sein.'
      : !Number.isInteger(rotN) || rotN < 0 || rotN > 100
        ? 'Diff-Schwelle Rot muss eine ganze Zahl zwischen 0 und 100 sein.'
        : rotN <= gelbN
          ? 'Diff-Schwelle Rot muss größer sein als Gelb.'
          : null

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFeedback({})
    if (!allOk) {
      setFeedback({
        error: 'Alle drei Gruppen müssen jeweils 100% ergeben.',
      })
      return
    }
    if (schwelleErr) {
      setFeedback({ error: schwelleErr })
      return
    }
    const formData = new FormData()
    formData.set('strategie_soll_blog', String(mix[0]))
    formData.set('strategie_soll_affiliate', String(mix[1]))
    formData.set('strategie_soll_produkt', String(mix[2]))
    formData.set('ziel_soll_traffic', String(ziele[0]))
    formData.set('ziel_soll_lead', String(ziele[1]))
    formData.set('ziel_soll_sales', String(ziele[2]))
    formData.set('format_soll_standard', String(format[0]))
    formData.set('format_soll_video', String(format[1]))
    formData.set('format_soll_collage', String(format[2]))
    formData.set('format_soll_carousel', String(format[3]))
    formData.set('strategie_check_schwelle_gelb', String(gelbN))
    formData.set('strategie_check_schwelle_rot', String(rotN))
    startTransition(async () => {
      const result = await saveStrategieManual(formData)
      if (result.error) setFeedback({ error: result.error })
      else setFeedback({ saved: true })
    })
  }

  return (
    <section
      id="strategie"
      className="scroll-mt-24 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-900">
        Strategie &amp; Ausrichtung
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Hier kannst du deine Pinterest-Strategie manuell anpassen. Beim
        Speichern wird automatisch ein Snapshot deiner vorherigen Strategie
        archiviert.
      </p>
      {!initial.onboardingAbgeschlossen && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Du hast das geführte Onboarding noch nicht durchlaufen.{' '}
          <Link
            href="/dashboard/strategie"
            className="font-medium underline hover:text-amber-700"
          >
            Onboarding jetzt starten ↗
          </Link>
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-4 space-y-6">
        <StrategieSliderGroup
          title="Strategie-Mix"
          channels={[
            { label: 'Blog/Content', color: 'blue' },
            { label: 'Affiliate', color: 'purple' },
            { label: 'Produkt', color: 'green' },
          ]}
          values={mix as unknown as number[]}
          onChange={(v) =>
            setMix(v as unknown as [number, number, number])
          }
        />

        <StrategieSliderGroup
          title="Conversion-Ziele"
          channels={[
            { label: 'Traffic', color: 'blue' },
            { label: 'Lead', color: 'orange' },
            { label: 'Sales', color: 'green' },
          ]}
          values={ziele as unknown as number[]}
          onChange={(v) =>
            setZiele(v as unknown as [number, number, number])
          }
        />

        <StrategieSliderGroup
          title="Pin-Format-Mix"
          channels={[
            { label: 'Standard', color: 'black' },
            { label: 'Video', color: 'red' },
            { label: 'Collage', color: 'yellow' },
            { label: 'Carousel', color: 'pink' },
          ]}
          values={format as unknown as number[]}
          onChange={(v) =>
            setFormat(v as unknown as [number, number, number, number])
          }
        />

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
            Diff-Schwellen für Strategie-Check
          </h3>
          <p className="mt-1 text-xs text-gray-600">
            Steuert die Farb-Bewertung im Strategie-Check auf dem Dashboard.
            Abweichung |Ist − Soll| in Prozentpunkten.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="strategie_check_schwelle_gelb"
                className="block text-sm font-medium text-gray-700"
              >
                Diff-Schwelle Gelb (%)
              </label>
              <input
                id="strategie_check_schwelle_gelb"
                type="number"
                min={0}
                max={100}
                step={1}
                value={schwelleGelb}
                onChange={(e) => setSchwelleGelb(e.target.value)}
                className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Ab dieser Abweichung wird der Wert gelb markiert (leicht außer
                Plan). Standard: 5.
              </p>
            </div>
            <div>
              <label
                htmlFor="strategie_check_schwelle_rot"
                className="block text-sm font-medium text-gray-700"
              >
                Diff-Schwelle Rot (%)
              </label>
              <input
                id="strategie_check_schwelle_rot"
                type="number"
                min={0}
                max={100}
                step={1}
                value={schwelleRot}
                onChange={(e) => setSchwelleRot(e.target.value)}
                className="mt-1 block w-32 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Ab dieser Abweichung wird der Wert rot markiert (deutlich außer
                Plan). Muss größer sein als die gelbe Schwelle. Standard: 15.
              </p>
            </div>
          </div>
          {schwelleErr && (
            <p className="mt-2 text-xs text-red-700">{schwelleErr}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending || !allOk || !!schwelleErr}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Speichert…' : 'Strategie speichern'}
          </button>
          <Link
            href="/dashboard/strategie"
            className="text-sm font-medium text-red-600 hover:underline"
          >
            Onboarding wiederholen ↗
          </Link>
          {feedback.saved && (
            <span className="text-sm text-green-700">
              ✓ Gespeichert (Snapshot archiviert)
            </span>
          )}
          {feedback.error && (
            <span className="text-sm text-red-700">{feedback.error}</span>
          )}
        </div>
      </form>
    </section>
  )
}

function StrategieSliderGroup({
  title,
  channels,
  values,
  onChange,
}: {
  title: string
  channels: Array<{ label: string; color: StrategieAccent }>
  values: number[]
  onChange: (next: number[]) => void
}) {
  const sum = values.reduce((a, b) => a + b, 0)
  const ok = sum === 100
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
        {title}
      </h3>
      <div className="mt-3 space-y-3">
        {channels.map((c, i) => (
          <div
            key={c.label}
            className="grid items-center gap-2 sm:grid-cols-[140px_1fr_80px]"
          >
            <span className="text-sm font-medium text-gray-700">
              {c.label}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={values[i]}
              onChange={(e) =>
                onChange(
                  adjustProportional(values, i, Number(e.target.value))
                )
              }
              className={`pf-slider w-full ${STRATEGIE_ACCENTS[c.color]}`}
              style={{
                background: `linear-gradient(to right, ${STRATEGIE_FILL_HEX[c.color]} 0%, ${STRATEGIE_FILL_HEX[c.color]} ${values[i]}%, ${STRATEGIE_TRACK_GRAY} ${values[i]}%, ${STRATEGIE_TRACK_GRAY} 100%)`,
                borderRadius: '9999px',
                color: STRATEGIE_FILL_HEX[c.color],
              }}
              aria-label={c.label}
            />
            <div className="relative w-20">
              <input
                type="number"
                min={0}
                max={100}
                step={5}
                value={values[i]}
                onChange={(e) =>
                  onChange(
                    adjustProportional(values, i, Number(e.target.value))
                  )
                }
                className="w-full rounded-md border border-gray-300 py-1 pl-2 pr-6 text-right text-sm tabular-nums shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                aria-label={`${c.label} Prozent`}
              />
              <span
                className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-sm text-gray-500"
                aria-hidden
              >
                %
              </span>
            </div>
          </div>
        ))}
      </div>
      <p
        className={`mt-2 text-xs font-medium ${ok ? 'text-green-700' : 'text-red-700'}`}
      >
        Summe: {sum}% {ok ? '✓' : '— bitte auf 100% anpassen'}
      </p>
    </div>
  )
}
