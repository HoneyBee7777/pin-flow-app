'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition, type FormEvent } from 'react'
import { saveEinstellungen } from './actions'
import {
  SIGNALWOERTER,
  parseSignalwoerterListe,
  serializeSignalwoerterListe,
} from '@/lib/signalwoerter'
import type { UserPinBenchmark } from '../analytics/utils'
import type { AccountNicheProfile } from '@/lib/account-niche-profile'

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

export default function EinstellungenClient({
  initialProfilName,
  initialEigeneSignalwoerter,
  initialSignalwoerterDeaktiviert,
  initialPinterestAnalyticsUrl,
  initialPersoenlicheLinks,
  initialBoardSchwellwerte,
  initialContentPipelineSchwellwerte,
}: {
  initialProfilName: string
  initialEigeneSignalwoerter: string
  initialSignalwoerterDeaktiviert: string
  initialPinterestAnalyticsUrl: string
  initialPersoenlicheLinks: InitialPersoenlicheLinks
  initialSchwellwerte: InitialSchwellwerte
  initialBenchmark: UserPinBenchmark | null
  initialNicheProfile: AccountNicheProfile
  initialBoardSchwellwerte: InitialBoardSchwellwerte
  initialContentPipelineSchwellwerte: InitialContentPipelineSchwellwerte
}) {
  return (
    <div className="space-y-6">
      <ProfilNameSection initial={initialProfilName} />
      <PersoenlicheLinksSection initial={initialPersoenlicheLinks} />
      <AnalyticsLinkSection initial={initialPinterestAnalyticsUrl} />
      <SignalwoerterSection
        initialEigene={initialEigeneSignalwoerter}
        initialDeaktiviert={initialSignalwoerterDeaktiviert}
      />
      <StrategieSection />

      <ErweiterteEinstellungenTrenner />
      <BoardSchwellwerteSection initial={initialBoardSchwellwerte} />
      <ContentPipelineSchwellwerteSection
        initial={initialContentPipelineSchwellwerte}
      />
    </div>
  )
}

// Dezenter Abschnitts-Trenner: bündelt die technischen Schwellwert-Sektionen
// unten als „Erweiterte Einstellungen".
function ErweiterteEinstellungenTrenner() {
  return (
    <div className="pt-4">
      <h2 className="text-lg font-semibold text-gray-900">
        Erweiterte Einstellungen
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Diese Werte sind bereits sinnvoll voreingestellt. Du musst sie nur
        anpassen, wenn du die Auswertung fein justieren willst.
      </p>
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

function SignalwoerterChip({
  label,
  onRemove,
  variant,
}: {
  label: string
  onRemove: () => void
  variant: 'standard' | 'eigen'
}) {
  const tone =
    variant === 'eigen'
      ? 'bg-red-50 text-red-700 ring-red-200'
      : 'bg-white text-gray-700 ring-gray-200'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ring-1 ${tone}`}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`„${label}" entfernen`}
        title={`„${label}" entfernen`}
        className="leading-none opacity-60 hover:opacity-100"
      >
        ×
      </button>
    </span>
  )
}

function SignalwoerterSection({
  initialEigene,
  initialDeaktiviert,
}: {
  initialEigene: string
  initialDeaktiviert: string
}) {
  const [eigene, setEigene] = useState<string[]>(() =>
    parseSignalwoerterListe(initialEigene)
  )
  const [deaktiviert, setDeaktiviert] = useState<string[]>(() =>
    parseSignalwoerterListe(initialDeaktiviert)
  )
  const [newWord, setNewWord] = useState('')
  const [hint, setHint] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    saved?: boolean
    error?: string
  }>({})

  const deaktiviertSet = useMemo(
    () => new Set(deaktiviert.map((w) => w.toLowerCase())),
    [deaktiviert]
  )
  // Aktive Standardwörter = alle außer den abgewählten; abgewählte separat.
  const aktiveStandard = useMemo(
    () => SIGNALWOERTER.filter((w) => !deaktiviertSet.has(w.toLowerCase())),
    [deaktiviertSet]
  )
  const abgewaehlt = useMemo(
    () => SIGNALWOERTER.filter((w) => deaktiviertSet.has(w.toLowerCase())),
    [deaktiviertSet]
  )
  const standardLower = useMemo(
    () => new Set(SIGNALWOERTER.map((w) => w.toLowerCase())),
    []
  )
  const eigeneLower = useMemo(
    () => new Set(eigene.map((w) => w.toLowerCase())),
    [eigene]
  )

  const aktiveAnzahl = aktiveStandard.length + eigene.length

  function abwaehlenStandard(w: string) {
    setHint(null)
    setDeaktiviert((prev) =>
      prev.some((d) => d.toLowerCase() === w.toLowerCase())
        ? prev
        : [...prev, w]
    )
  }

  function reaktivierenStandard(w: string) {
    setHint(null)
    setDeaktiviert((prev) =>
      prev.filter((d) => d.toLowerCase() !== w.toLowerCase())
    )
  }

  function entferneEigenes(w: string) {
    setHint(null)
    setEigene((prev) => prev.filter((e) => e !== w))
  }

  function addWord() {
    const wort = newWord.trim()
    if (!wort) return
    const lower = wort.toLowerCase()
    // Standardwort: schon aktiv → Hinweis, abgewählt → wieder aufnehmen.
    if (standardLower.has(lower)) {
      if (deaktiviertSet.has(lower)) {
        setDeaktiviert((prev) =>
          prev.filter((d) => d.toLowerCase() !== lower)
        )
        setNewWord('')
        setHint(`„${wort}" war abgewählt und ist jetzt wieder aktiv.`)
        return
      }
      setHint(`„${wort}" ist bereits als Standardwort enthalten.`)
      return
    }
    if (eigeneLower.has(lower)) {
      setHint(`„${wort}" steht schon in deiner Liste.`)
      return
    }
    setEigene((prev) => [...prev, wort])
    setNewWord('')
    setHint(null)
  }

  function onSave() {
    setFeedback({})
    const formData = new FormData()
    formData.set('eigene_signalwoerter', serializeSignalwoerterListe(eigene))
    formData.set(
      'signalwoerter_deaktiviert',
      serializeSignalwoerterListe(deaktiviert)
    )
    startTransition(async () => {
      const result = await saveEinstellungen(formData)
      if (result.error) setFeedback({ error: result.error })
      else setFeedback({ saved: true })
    })
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Signalwörter</h2>
      <p className="mt-1 text-sm text-gray-600">
        Signalwörter sind Begriffe, die beim Betrachter sofort eine Reaktion
        auslösen: Neugier, Dringlichkeit oder Vertrauen. Pin-Flow baut sie in
        den KI-Vorschlag ein, wenn du auf der Pins-Seite neue Pins erstellst. So
        werden deine Pin-Titel und Beschreibungen klickstärker. Diese Liste
        steuert, welche Wörter dabei verwendet werden: entferne, was nicht zu
        dir passt, oder ergänze eigene.
      </p>
      <p className="mt-2 text-sm">
        <Link
          href="/dashboard/strategie?tab=design&accordion=signalwoerter"
          className="font-medium text-red-600 hover:underline"
        >
          Mehr dazu, wie Signalwörter wirken, im Pinterest-Wissen.
        </Link>
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={newWord}
          onChange={(e) => {
            setNewWord(e.target.value)
            setHint(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addWord()
            }
          }}
          placeholder="Eigenes Signalwort hinzufügen"
          className="block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        <button
          type="button"
          onClick={addWord}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Hinzufügen
        </button>
      </div>
      {hint && <p className="mt-2 text-xs text-gray-500">{hint}</p>}

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
          Aktive Signalwörter ({aktiveAnzahl})
        </p>
        <div className="flex flex-wrap gap-1.5">
          {aktiveStandard.map((w) => (
            <SignalwoerterChip
              key={`std-${w}`}
              label={w}
              variant="standard"
              onRemove={() => abwaehlenStandard(w)}
            />
          ))}
          {eigene.map((w) => (
            <SignalwoerterChip
              key={`own-${w}`}
              label={w}
              variant="eigen"
              onRemove={() => entferneEigenes(w)}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Helle Chips sind Standardwörter, rot markierte sind deine eigenen.
          Mit dem „×" wählst du ein Wort ab.
        </p>
      </div>

      {abgewaehlt.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-gray-700 hover:text-gray-900">
            Abgewählte Wörter ({abgewaehlt.length})
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {abgewaehlt.map((w) => (
              <button
                key={`off-${w}`}
                type="button"
                onClick={() => reaktivierenStandard(w)}
                title={`„${w}" wieder aktivieren`}
                aria-label={`„${w}" wieder aktivieren`}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-400 ring-1 ring-gray-200 hover:bg-gray-200 hover:text-gray-600"
              >
                {w}
                <span aria-hidden className="font-semibold">
                  +
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Tippe ein Wort an, um es wieder in die aktive Liste aufzunehmen.
          </p>
        </details>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
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
    </section>
  )
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

function StrategieSection() {
  return (
    <section
      id="strategie"
      className="scroll-mt-24 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-900">
        Deine Pinterest-Strategie
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Deine Strategie legst du im geführten Setup fest: Business-Modell,
        Pin-Ziele, Themen-Schwerpunkte und Pinning-Rhythmus. Dort bekommst du
        auch eine Empfehlung, die du jederzeit anpassen kannst.
      </p>
      <div className="mt-4">
        <Link
          href="/dashboard/strategie?tab=meine"
          className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Zur Strategie
        </Link>
      </div>
    </section>
  )
}
