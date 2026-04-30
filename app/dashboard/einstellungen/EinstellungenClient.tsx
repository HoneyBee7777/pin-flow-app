'use client'

import Link from 'next/link'
import { useState, useTransition, type FormEvent } from 'react'
import { saveEinstellungen } from './actions'
import { saveStrategieManual } from '../strategie/actions'
import { adjustProportional } from '../strategie/lib'

export type InitialSchwellwerte = {
  beobachtung: number | null
  minKlicks: number | null
  alterRecycling: number | null
  ctr: number | null
  impressionen: number | null
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
      <SchwellwerteSection initial={initialSchwellwerte} />
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
}: {
  initial: InitialSchwellwerte
}) {
  const [beobachtung, setBeobachtung] = useState(
    initial.beobachtung !== null ? String(initial.beobachtung) : '60'
  )
  const [minKlicks, setMinKlicks] = useState(
    initial.minKlicks !== null ? String(initial.minKlicks) : '15'
  )
  const [alterRecycling, setAlterRecycling] = useState(
    initial.alterRecycling !== null ? String(initial.alterRecycling) : '70'
  )
  const [ctr, setCtr] = useState(
    initial.ctr !== null ? String(initial.ctr) : '1.5'
  )
  const [impressionen, setImpressionen] = useState(
    initial.impressionen !== null ? String(initial.impressionen) : '1000'
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
      <p className="mt-1 text-sm text-gray-600">
        Diese Werte steuern die Diagnose-Logik im Pin-Analytics-Tab. Passe sie
        an die Größe deines Accounts an.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <SchwellwertField
          label="Beobachtungszeitraum (Tage)"
          name="schwellwert_beobachtung"
          value={beobachtung}
          onChange={setBeobachtung}
          step={1}
          help="Wie lange gilt ein Pin als zu jung für die Bewertung?"
        />
        <SchwellwertField
          label="Mindest-Klicks für Top Performer"
          name="schwellwert_min_klicks"
          value={minKlicks}
          onChange={setMinKlicks}
          step={1}
          help="Ab wie vielen Klicks gilt ein Pin als Top Performer? Bei kleinen Accounts empfehlen wir 5, bei großen 20+."
        />
        <SchwellwertField
          label="Mindest-Alter für Recycling (Tage)"
          name="schwellwert_alter_recycling"
          value={alterRecycling}
          onChange={setAlterRecycling}
          step={1}
          help="Ab wann gilt ein eingeschlafener Pin als Recycling-Kandidat?"
        />
        <SchwellwertField
          label="Mindest-CTR für Hidden Gem (%)"
          name="schwellwert_ctr"
          value={ctr}
          onChange={setCtr}
          step={0.1}
          help="Ab welcher CTR gilt ein Pin mit wenig Reichweite als Hidden Gem?"
        />
        <SchwellwertField
          label="Mindest-Impressionen für Optimierungspotenzial"
          name="schwellwert_impressionen"
          value={impressionen}
          onChange={setImpressionen}
          step={1}
          help="Ab wie vielen Impressionen prüfen wir, ob der Hook optimiert werden sollte?"
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

function SchwellwertField({
  label,
  name,
  value,
  onChange,
  step,
  help,
  orientation,
}: {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  step: number
  help: string
  orientation?: string
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
      <p className="mt-1 text-xs text-gray-500">{help}</p>
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
              help={'Inhalte mit weniger Pins werden in der Content Pipeline als „zu wenig bepinnt" markiert.'}
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
