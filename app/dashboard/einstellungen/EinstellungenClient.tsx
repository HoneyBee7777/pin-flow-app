'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition, type FormEvent } from 'react'
import { saveEinstellungen } from './actions'
import { PinKategorieIcon } from '@/components/PinKategorieIcon'
import {
  SIGNALWOERTER,
  parseSignalwoerterListe,
  serializeSignalwoerterListe,
} from '@/lib/signalwoerter'
import type { UserPinBenchmark } from '../analytics/utils'
import type { AccountNicheProfile } from '@/lib/account-niche-profile'

export type InitialPersoenlicheLinks = {
  pinterestAccountUrl: string
  websiteUrl: string
  tailwindUrl: string
}

export default function EinstellungenClient({
  initialProfilName,
  initialEigeneSignalwoerter,
  initialSignalwoerterDeaktiviert,
  initialPinterestAnalyticsUrl,
  initialPersoenlicheLinks,
}: {
  initialProfilName: string
  initialEigeneSignalwoerter: string
  initialSignalwoerterDeaktiviert: string
  initialPinterestAnalyticsUrl: string
  initialPersoenlicheLinks: InitialPersoenlicheLinks
  initialBenchmark: UserPinBenchmark | null
  initialNicheProfile: AccountNicheProfile
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
            className="rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel disabled:opacity-50"
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
          label="Pinterest Account"
          icon="pin"
          name="pinterest_account_url"
          value={pinterestAccount}
          onChange={setPinterestAccount}
          placeholder="https://www.pinterest.de/dein_account/"
        />
        <UrlField
          label="Meine Website"
          icon="url"
          name="website_url"
          value={website}
          onChange={setWebsite}
          placeholder="https://deine-website.de"
        />
        <UrlField
          label="Tailwind"
          icon="kalender"
          name="tailwind_url"
          value={tailwind}
          onChange={setTailwind}
          placeholder="https://www.tailwindapp.com/..."
        />

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel disabled:opacity-50"
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
  icon,
}: {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  // Optionales Linien-Icon links vom Label (Blaugrau, bekannter Stil).
  icon?: string
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className={`text-sm font-medium text-gray-700 ${
          icon ? 'flex items-center gap-2' : 'block'
        }`}
      >
        {icon && (
          <PinKategorieIcon
            name={icon}
            className="h-4 w-4 shrink-0 text-marke-blaugrau"
          />
        )}
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
          className="font-medium text-link underline underline-offset-2"
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
          className="rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel disabled:opacity-50"
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
              className="font-medium text-link underline underline-offset-2"
            >
              Gespeicherten Link öffnen <span aria-hidden>↗</span>
            </a>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel disabled:opacity-50"
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
          className="inline-flex items-center rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel"
        >
          Zur Strategie
        </Link>
      </div>
    </section>
  )
}
