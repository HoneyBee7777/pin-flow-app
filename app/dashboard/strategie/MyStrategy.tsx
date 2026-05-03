'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition, type ReactNode } from 'react'
import {
  BUSINESS_MODELL_OPTIONS,
  HAUPTZIEL_OPTIONS,
  STRATEGIE_DEFAULT_FORMAT_MIX,
  VORHANDEN_OPTIONS,
  adjustProportional,
  computeRecommendation,
  getEmpfehlungstext,
  parseBusinessModelle,
  parseVorhanden,
  serializeBusinessModelle,
  serializeVorhanden,
  type BusinessModell,
  type Hauptziel,
  type StrategieRow,
  type VorhandenItem,
} from './lib'
import {
  restartStrategieOnboarding,
  saveStrategieOnboarding,
} from './actions'

// =====================================================
// Farb-Mapping für Balken (kein dynamisches Tailwind!)
// =====================================================
const BAR_COLORS = {
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  gray: 'bg-gray-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  pink: 'bg-pink-500',
  indigo: 'bg-indigo-500',
  black: 'bg-black',
} as const
const ACCENT_COLORS = {
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
const FILL_HEX = {
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
const TRACK_GRAY = '#e5e7eb' // bg-gray-200
type BarColor = keyof typeof BAR_COLORS

// =====================================================
// Top-Level: A/B/C-Routing
// =====================================================
export default function MyStrategy({
  strategie,
}: {
  strategie: StrategieRow | null
}) {
  const [forceWizard, setForceWizard] = useState(false)

  const isComplete = strategie?.strategie_onboarding_abgeschlossen === true

  if (forceWizard || !isComplete) {
    return <WizardOrWelcome onCancel={() => setForceWizard(false)} />
  }
  return (
    <StrategySummary
      row={strategie}
      onRestart={() => setForceWizard(true)}
    />
  )
}

// =====================================================
// Zustand A: Welcome → Zustand B: Wizard
// =====================================================
function WizardOrWelcome({ onCancel }: { onCancel: () => void }) {
  const [started, setStarted] = useState(false)

  if (!started) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          🎯 Deine Pinterest-Strategie
        </h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-700">
          <p>
            Bevor du loslegst: Eine klare Strategie ist die Grundlage für
            Pinterest-Erfolg. Wer ohne Strategie pinnt, verschwendet Zeit.
          </p>
          <p>Im Onboarding fragen wir dich kurz:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Was ist dein Business-Modell?</li>
            <li>Was willst du primär erreichen?</li>
            <li>Was hast du bereits an Inhalten und Angeboten?</li>
          </ul>
          <p>
            Basierend auf deinen Antworten erhältst du eine empfohlene
            Strategie-Verteilung – die du jederzeit manuell anpassen kannst.
          </p>
          <p className="text-gray-500">Dauer: ca. 3–5 Minuten</p>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Onboarding starten
          </button>
          <Link
            href="/dashboard/einstellungen#strategie"
            className="text-sm font-medium text-red-600 hover:underline"
          >
            Strategie ohne Onboarding manuell festlegen ↗
          </Link>
        </div>
      </div>
    )
  }

  return <Wizard onCancel={onCancel} />
}

// =====================================================
// Zustand B: Wizard
// =====================================================
type Triple = [number, number, number]
type Quad = [number, number, number, number]

function Wizard({ onCancel }: { onCancel: () => void }) {
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4 | 5>(0)
  const [modelle, setModelle] = useState<BusinessModell[]>([])
  const [hauptziel, setHauptziel] = useState<Hauptziel | null>(null)
  const [vorhanden, setVorhanden] = useState<VorhandenItem[]>([])
  const [strategieMix, setStrategieMix] = useState<Triple>([50, 30, 20])
  const [ziele, setZiele] = useState<Triple>([50, 30, 20])
  const [formatMix, setFormatMix] = useState<Quad>([
    STRATEGIE_DEFAULT_FORMAT_MIX.standard,
    STRATEGIE_DEFAULT_FORMAT_MIX.video,
    STRATEGIE_DEFAULT_FORMAT_MIX.collage,
    STRATEGIE_DEFAULT_FORMAT_MIX.carousel,
  ])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const recommendation = useMemo(() => {
    if (modelle.length === 0 || !hauptziel) return null
    return computeRecommendation(modelle, hauptziel, vorhanden)
  }, [modelle, hauptziel, vorhanden])

  // Beim Übergang Schritt 4 → 5 die Empfehlung in die Slider übernehmen.
  function adoptRecommendation() {
    if (!recommendation) return
    setStrategieMix([
      recommendation.mix.blog,
      recommendation.mix.affiliate,
      recommendation.mix.produkt,
    ])
    setZiele([
      recommendation.ziele.traffic,
      recommendation.ziele.lead,
      recommendation.ziele.sales,
    ])
    setStep(5)
  }

  function handleSave() {
    setError(null)
    if (modelle.length === 0 || !hauptziel) {
      setError('Bitte alle Schritte ausfüllen.')
      return
    }
    const formData = new FormData()
    formData.set('strategie_business_modell', serializeBusinessModelle(modelle))
    formData.set('strategie_hauptziel', hauptziel)
    formData.set('strategie_vorhanden', serializeVorhanden(vorhanden))
    formData.set('strategie_soll_blog', String(strategieMix[0]))
    formData.set('strategie_soll_affiliate', String(strategieMix[1]))
    formData.set('strategie_soll_produkt', String(strategieMix[2]))
    formData.set('ziel_soll_traffic', String(ziele[0]))
    formData.set('ziel_soll_lead', String(ziele[1]))
    formData.set('ziel_soll_sales', String(ziele[2]))
    formData.set('format_soll_standard', String(formatMix[0]))
    formData.set('format_soll_video', String(formatMix[1]))
    formData.set('format_soll_collage', String(formatMix[2]))
    formData.set('format_soll_carousel', String(formatMix[3]))

    startTransition(async () => {
      const result = await saveStrategieOnboarding(formData)
      if (result.error) setError(result.error)
      // Erfolg → Server-Revalidate liefert isComplete=true → Summary erscheint.
    })
  }

  return (
    <div className="space-y-4">
      <ProgressIndicator step={step} />

      {step === 0 && (
        <Step0
          onNext={() => setStep(1)}
          onCancel={onCancel}
        />
      )}
      {step === 1 && (
        <Step1
          value={modelle}
          onChange={setModelle}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <Step2
          value={hauptziel}
          onChange={setHauptziel}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <Step3
          value={vorhanden}
          onChange={setVorhanden}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
        />
      )}
      {step === 4 && recommendation && (
        <Step4
          modellLabel={modelle
            .map(
              (m) =>
                BUSINESS_MODELL_OPTIONS.find((o) => o.value === m)?.label ?? ''
            )
            .filter(Boolean)
            .join(' · ')}
          hauptzielLabel={
            HAUPTZIEL_OPTIONS.find((o) => o.value === hauptziel)?.label ?? ''
          }
          mix={recommendation.mix}
          ziele={recommendation.ziele}
          begruendung={recommendation.begruendung}
          onBack={() => setStep(3)}
          onAccept={adoptRecommendation}
        />
      )}
      {step === 5 && (
        <Step5
          formatMix={formatMix}
          onFormatMixChange={setFormatMix}
          strategieMix={strategieMix}
          onStrategieMixChange={setStrategieMix}
          ziele={ziele}
          onZieleChange={setZiele}
          error={error}
          isPending={isPending}
          onBack={() => setStep(4)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

// ----- Sub-Komponenten Wizard -----

function ProgressIndicator({ step }: { step: 0 | 1 | 2 | 3 | 4 | 5 }) {
  const labels = ['Hinweis', 'Business', 'Ziel', 'Vorhanden', 'Empfehlung', 'Anpassen']
  return (
    <ol className="flex flex-wrap gap-2 text-xs">
      {labels.map((label, i) => {
        const active = i === step
        const done = i < step
        return (
          <li
            key={i}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${
              active
                ? 'bg-red-600 text-white'
                : done
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-500'
            }`}
          >
            <span>{i}</span>
            <span>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

function StepCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

function NavRow({
  onBack,
  onNext,
  nextLabel = 'Weiter →',
  nextDisabled = false,
  showCancel = false,
  onCancel,
}: {
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  showCancel?: boolean
  onCancel?: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Zurück
        </button>
      )}
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {nextLabel}
        </button>
      )}
      {showCancel && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-gray-500 hover:underline"
        >
          Abbrechen
        </button>
      )}
    </div>
  )
}

// ----- Step 0 -----
function Step0({
  onNext,
  onCancel,
}: {
  onNext: () => void
  onCancel: () => void
}) {
  return (
    <StepCard title="🎯 Schritt 0 von 5: Was passiert hier?">
      <p>
        In den nächsten 5 Schritten lernen wir dein Business kennen. Daraus
        generieren wir eine empfohlene Pinterest-Strategie:
      </p>
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          Wie viel Prozent deiner Pins sollten zu welchem Strategie-Typ gehören
          (Blog, Affiliate, Produkt)?
        </li>
        <li>
          Welche Conversion-Ziele verfolgst du wie stark (Traffic, Lead,
          Sales)?
        </li>
        <li>Welche Pin-Formate solltest du in welchem Verhältnis nutzen?</li>
      </ol>
      <p>
        Du kannst die Empfehlung danach jederzeit anpassen. Es gibt kein
        Richtig oder Falsch – die Empfehlung ist ein Startpunkt, kein Gesetz.
      </p>
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>Wichtig:</strong> Deine bisherigen Pins werden ab Aktivierung
        dieser Strategie gegen deine neuen Soll-Werte bewertet. Wenn du später
        deine Strategie änderst, archivieren wir die vorherige Version – für
        zukünftige Vergleiche.
      </div>
      <NavRow
        onNext={onNext}
        nextLabel="Los geht's →"
        showCancel
        onCancel={onCancel}
      />
    </StepCard>
  )
}

// ----- Step 1 -----
function Step1({
  value,
  onChange,
  onBack,
  onNext,
}: {
  value: BusinessModell[]
  onChange: (v: BusinessModell[]) => void
  onBack: () => void
  onNext: () => void
}) {
  function toggle(item: BusinessModell) {
    if (value.includes(item)) {
      onChange(value.filter((v) => v !== item))
    } else {
      onChange([...value, item])
    }
  }
  return (
    <StepCard title="🎯 Schritt 1 von 5: Was beschreibt dein Business am besten?">
      <p className="text-xs text-gray-500">
        Mehrere Auswahlen möglich – wähle alle Bereiche, die auf dich zutreffen.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {BUSINESS_MODELL_OPTIONS.map((o) => (
          <CheckboxCard
            key={o.value}
            selected={value.includes(o.value)}
            onClick={() => toggle(o.value)}
            label={o.label}
          />
        ))}
      </div>
      <NavRow
        onBack={onBack}
        onNext={onNext}
        nextDisabled={value.length === 0}
      />
    </StepCard>
  )
}

// ----- Step 2 -----
function Step2({
  value,
  onChange,
  onBack,
  onNext,
}: {
  value: Hauptziel | null
  onChange: (v: Hauptziel) => void
  onBack: () => void
  onNext: () => void
}) {
  return (
    <StepCard title="🎯 Schritt 2 von 5: Was ist dein primäres Pinterest-Ziel?">
      <div className="grid gap-2 sm:grid-cols-2">
        {HAUPTZIEL_OPTIONS.map((o) => (
          <SelectCard
            key={o.value}
            selected={value === o.value}
            onClick={() => onChange(o.value)}
            label={o.label}
          />
        ))}
      </div>
      <NavRow onBack={onBack} onNext={onNext} nextDisabled={!value} />
    </StepCard>
  )
}

// ----- Step 3 -----
function Step3({
  value,
  onChange,
  onBack,
  onNext,
}: {
  value: VorhandenItem[]
  onChange: (v: VorhandenItem[]) => void
  onBack: () => void
  onNext: () => void
}) {
  function toggle(item: VorhandenItem) {
    if (item === 'nichts') {
      onChange(value.includes('nichts') ? [] : ['nichts'])
      return
    }
    const without = value.filter((v) => v !== 'nichts')
    if (without.includes(item)) {
      onChange(without.filter((v) => v !== item))
    } else {
      onChange([...without, item])
    }
  }
  return (
    <StepCard title="🎯 Schritt 3 von 5: Welche Inhalte und Angebote hast du schon?">
      <p className="text-xs text-gray-500">Mehrere Auswahlen möglich.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {VORHANDEN_OPTIONS.map((o) => (
          <SelectCard
            key={o.value}
            selected={value.includes(o.value)}
            onClick={() => toggle(o.value)}
            label={o.label}
          />
        ))}
      </div>
      <NavRow
        onBack={onBack}
        onNext={onNext}
        nextDisabled={value.length === 0}
      />
    </StepCard>
  )
}

// ----- Step 4 -----
function Step4({
  modellLabel,
  hauptzielLabel,
  mix,
  ziele,
  begruendung,
  onBack,
  onAccept,
}: {
  modellLabel: string
  hauptzielLabel: string
  mix: { blog: number; affiliate: number; produkt: number }
  ziele: { traffic: number; lead: number; sales: number }
  begruendung: string
  onBack: () => void
  onAccept: () => void
}) {
  return (
    <StepCard title="🎯 Schritt 4 von 5: Deine empfohlene Strategie">
      <p className="text-xs text-gray-500">
        Modell: <strong>{modellLabel}</strong> · Ziel:{' '}
        <strong>{hauptzielLabel}</strong>
      </p>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
          Strategie-Mix
        </h3>
        <div className="mt-2 space-y-2">
          <Bar label="Blog/Content" value={mix.blog} color="blue" />
          <Bar label="Affiliate" value={mix.affiliate} color="purple" />
          <Bar label="Produkt" value={mix.produkt} color="green" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
          Conversion-Ziele
        </h3>
        <div className="mt-2 space-y-2">
          <Bar label="Traffic" value={ziele.traffic} color="blue" />
          <Bar label="Lead" value={ziele.lead} color="orange" />
          <Bar label="Sales" value={ziele.sales} color="green" />
        </div>
      </div>

      <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        {begruendung}
      </p>

      <NavRow
        onBack={onBack}
        onNext={onAccept}
        nextLabel="Empfehlung übernehmen und anpassen →"
      />
    </StepCard>
  )
}

// ----- Step 5 -----
function Step5({
  formatMix,
  onFormatMixChange,
  strategieMix,
  onStrategieMixChange,
  ziele,
  onZieleChange,
  error,
  isPending,
  onBack,
  onSave,
}: {
  formatMix: Quad
  onFormatMixChange: (v: Quad) => void
  strategieMix: Triple
  onStrategieMixChange: (v: Triple) => void
  ziele: Triple
  onZieleChange: (v: Triple) => void
  error: string | null
  isPending: boolean
  onBack: () => void
  onSave: () => void
}) {
  return (
    <StepCard title="🎯 Schritt 5 von 5: Format-Mix und Feinabstimmung">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
          Pin-Format-Mix
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          Pinterest-Empfehlung: 60/20/10/10. Passe die Werte an, falls du z.B.
          mehr auf Video setzen möchtest.
        </p>
        <div className="mt-3">
          <SliderGroup
            channels={[
              { label: 'Standard Pins', color: 'black' },
              { label: 'Video Pins', color: 'red' },
              { label: 'Collage Pins', color: 'yellow' },
              { label: 'Carousel Pins', color: 'pink' },
            ]}
            values={formatMix as unknown as number[]}
            onChange={(next) =>
              onFormatMixChange(next as unknown as Quad)
            }
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
          Strategie-Mix anpassen
        </h3>
        <div className="mt-3">
          <SliderGroup
            channels={[
              { label: 'Blog/Content', color: 'blue' },
              { label: 'Affiliate', color: 'purple' },
              { label: 'Produkt', color: 'green' },
            ]}
            values={strategieMix as unknown as number[]}
            onChange={(next) =>
              onStrategieMixChange(next as unknown as Triple)
            }
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
          Conversion-Ziele anpassen
        </h3>
        <div className="mt-3">
          <SliderGroup
            channels={[
              { label: 'Traffic', color: 'blue' },
              { label: 'Lead', color: 'orange' },
              { label: 'Sales', color: 'green' },
            ]}
            values={ziele as unknown as number[]}
            onChange={(next) => onZieleChange(next as unknown as Triple)}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Zurück
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isPending}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isPending ? 'Speichert…' : 'Strategie speichern und aktivieren →'}
        </button>
      </div>
    </StepCard>
  )
}

// =====================================================
// Slider-Gruppe mit proportionaler Auto-Anpassung
// =====================================================
export function SliderGroup({
  channels,
  values,
  onChange,
}: {
  channels: Array<{ label: string; color: BarColor }>
  values: number[]
  onChange: (next: number[]) => void
}) {
  const sum = values.reduce((a, b) => a + b, 0)
  const sumOk = sum === 100
  return (
    <div className="space-y-3">
      {channels.map((c, i) => (
        <div key={c.label} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">{c.label}</span>
            <span className="font-semibold tabular-nums text-gray-900">
              {values[i]}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={values[i]}
            onChange={(e) =>
              onChange(adjustProportional(values, i, Number(e.target.value)))
            }
            className={`pf-slider w-full ${ACCENT_COLORS[c.color]}`}
            style={{
              background: `linear-gradient(to right, ${FILL_HEX[c.color]} 0%, ${FILL_HEX[c.color]} ${values[i]}%, ${TRACK_GRAY} ${values[i]}%, ${TRACK_GRAY} 100%)`,
              borderRadius: '9999px',
              color: FILL_HEX[c.color],
            }}
            aria-label={c.label}
          />
        </div>
      ))}
      <p
        className={`text-xs font-medium ${sumOk ? 'text-green-700' : 'text-red-700'}`}
      >
        Summe: {sum}% {sumOk ? '✓' : '— bitte auf 100% anpassen'}
      </p>
    </div>
  )
}

// =====================================================
// Reusable Bar
// =====================================================
function Bar({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: BarColor
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="font-semibold tabular-nums text-gray-900">
          {value}%
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${BAR_COLORS[color]}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

// =====================================================
// SelectCard
// =====================================================
function SelectCard({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
        selected
          ? 'border-red-600 bg-red-50 text-red-900'
          : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400 hover:bg-gray-50'
      }`}
      aria-pressed={selected}
    >
      <span>{label}</span>
      {selected && (
        <span className="shrink-0 text-red-600" aria-hidden>
          ✓
        </span>
      )}
    </button>
  )
}

// Checkbox-Variante: explizit mit Checkbox-Symbol für Multi-Select.
function CheckboxCard({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
        selected
          ? 'border-red-600 bg-red-50 text-red-900'
          : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400 hover:bg-gray-50'
      }`}
      role="checkbox"
      aria-checked={selected}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          selected
            ? 'border-red-600 bg-red-600 text-white'
            : 'border-gray-400 bg-white'
        }`}
        aria-hidden
      >
        {selected && <span className="text-[10px] leading-none">✓</span>}
      </span>
      <span className="flex-1">{label}</span>
    </button>
  )
}

// =====================================================
// Zustand C: Summary
// =====================================================
function StrategySummary({
  row,
  onRestart,
}: {
  row: StrategieRow
  onRestart: () => void
}) {
  const [showRestartModal, setShowRestartModal] = useState(false)
  const [restartError, setRestartError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const blog = row.strategie_soll_blog ?? 0
  const affiliate = row.strategie_soll_affiliate ?? 0
  const produkt = row.strategie_soll_produkt ?? 0
  const traffic = row.ziel_soll_traffic ?? 0
  const lead = row.ziel_soll_lead ?? 0
  const sales = row.ziel_soll_sales ?? 0
  const fStandard = row.format_soll_standard ?? 0
  const fVideo = row.format_soll_video ?? 0
  const fCollage = row.format_soll_collage ?? 0
  const fCarousel = row.format_soll_carousel ?? 0

  const empfehlung = getEmpfehlungstext(blog, affiliate, produkt)

  const modellLabels = parseBusinessModelle(row.strategie_business_modell).map(
    (m) => BUSINESS_MODELL_OPTIONS.find((o) => o.value === m)?.label ?? m
  )
  const modellLabel = modellLabels.length === 0 ? '—' : modellLabels.join(' · ')
  const hauptzielLabel =
    HAUPTZIEL_OPTIONS.find((o) => o.value === row.strategie_hauptziel)
      ?.label ?? '—'
  const vorhandenLabels = parseVorhanden(row.strategie_vorhanden).map(
    (v) => VORHANDEN_OPTIONS.find((o) => o.value === v)?.label ?? v
  )

  function handleRestartConfirm() {
    setRestartError(null)
    startTransition(async () => {
      const result = await restartStrategieOnboarding()
      if (result.error) {
        setRestartError(result.error)
        return
      }
      setShowRestartModal(false)
      onRestart()
    })
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              🎯 Deine Pinterest-Strategie
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Letzte Änderung:{' '}
              {row.strategie_letzte_aenderung
                ? formatDateDe(row.strategie_letzte_aenderung)
                : '—'}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
              Strategie-Mix
            </h3>
            <div className="mt-2 space-y-2">
              <Bar label="Blog/Content" value={blog} color="blue" />
              <Bar label="Affiliate" value={affiliate} color="purple" />
              <Bar label="Produkt" value={produkt} color="green" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
              Conversion-Ziele
            </h3>
            <div className="mt-2 space-y-2">
              <Bar label="Traffic" value={traffic} color="blue" />
              <Bar label="Lead" value={lead} color="orange" />
              <Bar label="Sales" value={sales} color="green" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
              Pin-Format-Mix
            </h3>
            <div className="mt-2 space-y-2">
              <Bar label="Standard" value={fStandard} color="black" />
              <Bar label="Video" value={fVideo} color="red" />
              <Bar label="Collage" value={fCollage} color="yellow" />
              <Bar label="Carousel" value={fCarousel} color="pink" />
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-md border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
            Deine Business-Einordnung
          </h3>
          <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Business-Modell</dt>
              <dd className="font-medium text-gray-900">{modellLabel}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Hauptziel</dt>
              <dd className="font-medium text-gray-900">{hauptzielLabel}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Vorhanden</dt>
              <dd className="text-gray-900">
                {vorhandenLabels.length === 0
                  ? '—'
                  : vorhandenLabels.join(' · ')}
              </dd>
            </div>
          </dl>
        </div>

        {empfehlung && (
          <p className="mt-4 rounded-md border border-purple-200 border-l-[3px] border-l-purple-400 bg-purple-50 p-3 text-sm text-purple-900">
            🎯 <strong>Empfehlung:</strong> {empfehlung}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/einstellungen#strategie"
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Strategie anpassen
          </Link>
          <button
            type="button"
            onClick={() => setShowRestartModal(true)}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Onboarding wiederholen
          </button>
        </div>
      </section>

      {showRestartModal && (
        <RestartModal
          isPending={isPending}
          error={restartError}
          onCancel={() => setShowRestartModal(false)}
          onConfirm={handleRestartConfirm}
        />
      )}
    </div>
  )
}

function RestartModal({
  isPending,
  error,
  onCancel,
  onConfirm,
}: {
  isPending: boolean
  error: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal
      aria-labelledby="restart-title"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 id="restart-title" className="text-base font-semibold text-gray-900">
          Onboarding wiederholen?
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          Beim erneuten Durchlauf wird eine neue Empfehlung generiert. Deine
          bisherige Strategie wird automatisch archiviert – sie bleibt
          erhalten und kann später für Vergleiche genutzt werden.
        </p>
        <p className="mt-2 text-sm text-gray-700">
          Möchtest du das Onboarding wirklich neu starten?
        </p>
        {error && (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Wird zurückgesetzt…' : 'Ja, neu starten'}
          </button>
        </div>
      </div>
    </div>
  )
}

function formatDateDe(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}
