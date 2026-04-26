'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { saveEinstellungen } from './actions'

export type InitialSchwellwerte = {
  beobachtung: number | null
  minKlicks: number | null
  alterRecycling: number | null
  ctr: number | null
  impressionen: number | null
}

export type InitialBoardSchwellwerte = {
  wenigAktiv: number | null
  inaktiv: number | null
  minImpressionenTop: number | null
  minEngagementTop: number | null
  minImpressionenWachstum: number | null
  minImpressionenBeobachten: number | null
}

export default function EinstellungenClient({
  initialEigeneSignalwoerter,
  initialPinterestAnalyticsUrl,
  initialSchwellwerte,
  initialBoardSchwellwerte,
}: {
  initialEigeneSignalwoerter: string
  initialPinterestAnalyticsUrl: string
  initialSchwellwerte: InitialSchwellwerte
  initialBoardSchwellwerte: InitialBoardSchwellwerte
}) {
  return (
    <div className="space-y-6">
      <SignalwoerterSection initial={initialEigeneSignalwoerter} />
      <AnalyticsLinkSection initial={initialPinterestAnalyticsUrl} />
      <SchwellwerteSection initial={initialSchwellwerte} />
      <BoardSchwellwerteSection initial={initialBoardSchwellwerte} />
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
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">
        Analytics-Schwellwerte
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
}: {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  step: number
  help: string
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
  const [minImpTop, setMinImpTop] = useState(
    initial.minImpressionenTop !== null
      ? String(initial.minImpressionenTop)
      : '1000'
  )
  const [minEngTop, setMinEngTop] = useState(
    initial.minEngagementTop !== null ? String(initial.minEngagementTop) : '2.0'
  )
  const [minImpWachstum, setMinImpWachstum] = useState(
    initial.minImpressionenWachstum !== null
      ? String(initial.minImpressionenWachstum)
      : '500'
  )
  const [minImpBeobachten, setMinImpBeobachten] = useState(
    initial.minImpressionenBeobachten !== null
      ? String(initial.minImpressionenBeobachten)
      : '100'
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
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">
        Board-Schwellwerte
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
            />
            <SchwellwertField
              label="Inaktiv ab (Tage)"
              name="schwellwert_board_inaktiv"
              value={inaktiv}
              onChange={setInaktiv}
              step={1}
              help={'Ab wie vielen Tagen ohne neuen Pin gilt ein Board als „inaktiv"?'}
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-900">
            Score (Performance)
          </p>
          <div className="mt-2 space-y-4">
            <SchwellwertField
              label="Mindest-Impressionen für Top Board"
              name="schwellwert_board_min_impressionen_top"
              value={minImpTop}
              onChange={setMinImpTop}
              step={1}
              help={'Ab wie vielen Impressionen kann ein Board „Top" werden? (zusätzlich muss Engagement Rate hoch genug sein)'}
            />
            <SchwellwertField
              label="Mindest-Engagement Rate für Top Board (%)"
              name="schwellwert_board_min_engagement_top"
              value={minEngTop}
              onChange={setMinEngTop}
              step={0.1}
              help={'Ab welcher Engagement Rate gilt ein Board als „Top"? Engagement Rate = (Interaktionen ÷ Impressionen) × 100.'}
            />
            <SchwellwertField
              label="Mindest-Impressionen für Wachstum"
              name="schwellwert_board_min_impressionen_wachstum"
              value={minImpWachstum}
              onChange={setMinImpWachstum}
              step={1}
              help={'Ab wie vielen Impressionen gilt ein Board als „Wachstum"?'}
            />
            <SchwellwertField
              label="Mindest-Impressionen für Beobachten"
              name="schwellwert_board_min_impressionen_beobachten"
              value={minImpBeobachten}
              onChange={setMinImpBeobachten}
              step={1}
              help={'Ab wie vielen Impressionen gilt ein Board als „Beobachten"? Darunter zählt es als „Schwach".'}
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
