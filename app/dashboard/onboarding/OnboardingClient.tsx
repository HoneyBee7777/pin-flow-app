'use client'

// V3.5 — Steuert Schritt-Navigation, Persistenz und die vier interaktiven
// Schritte (Business-Check, Profil-Formular, Strategie, Abschluss).
//
// Persistenz ist „best effort": Schlägt das Speichern fehl (z. B. weil die
// onboarding_state-Spalte noch nicht angelegt ist), bleibt die Navigation
// trotzdem benutzbar — der Fortschritt wird dann eben nicht über Sessions
// hinweg gemerkt.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ONBOARDING_STEPS,
  getOnboardingStep,
} from '@/lib/onboarding-content'
import { ONBOARDING_LAST_STEP } from '@/lib/onboarding-state'
import OnboardingStepIndicator from './OnboardingStepIndicator'
import StepView from './StepView'
import {
  goToOnboardingStep,
  skipOnboarding,
  completeOnboarding,
  saveOnboardingProfile,
} from './actions'

export type CompletionInfo = {
  strategieDone: boolean
  hasAnalytics: boolean
  missing: { label: string; href: string }[]
}

export type ProfileDefaults = {
  profilName: string
  pinterestAccountUrl: string
  pinterestAnalyticsUrl: string
}

export default function OnboardingClient({
  initialStep,
  alreadyCompleted,
  profile,
  completion,
}: {
  initialStep: number
  alreadyCompleted: boolean
  profile: ProfileDefaults
  completion: CompletionInfo
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [current, setCurrent] = useState(initialStep)
  // Übersichts-Modus bei bereits abgeschlossenem Onboarding.
  const [overview, setOverview] = useState(alreadyCompleted)

  // Profil-Formular (Schritt 3)
  const [profilName, setProfilName] = useState(profile.profilName)
  const [accountUrl, setAccountUrl] = useState(profile.pinterestAccountUrl)
  const [analyticsUrl, setAnalyticsUrl] = useState(
    profile.pinterestAnalyticsUrl
  )
  const [savingProfile, setSavingProfile] = useState(false)

  // Business-Account-Check (Schritt 2) — rein lokal, nicht persistiert.
  const [hasBusiness, setHasBusiness] = useState<'ja' | 'nein' | null>(null)

  const step = getOnboardingStep(current)

  function persist(next: number, markDone?: number) {
    startTransition(async () => {
      try {
        await goToOnboardingStep(next, markDone)
      } catch {
        /* best effort */
      }
    })
  }

  function goTo(next: number) {
    const clamped = Math.min(ONBOARDING_LAST_STEP, Math.max(0, next))
    persist(clamped, current)
    setCurrent(clamped)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleNext() {
    // Schritt 3: Profil vor dem Weitergehen speichern.
    if (step.special === 'profile-form') {
      setSavingProfile(true)
      const fd = new FormData()
      fd.set('profil_name', profilName)
      fd.set('pinterest_account_url', accountUrl)
      fd.set('pinterest_analytics_url', analyticsUrl)
      try {
        await saveOnboardingProfile(fd)
      } catch {
        /* best effort — Navigation nicht blockieren */
      }
      setSavingProfile(false)
    }
    goTo(current + 1)
  }

  function handleSkipOnboarding() {
    startTransition(async () => {
      try {
        await skipOnboarding()
      } catch {
        /* best effort */
      }
      router.push('/dashboard')
    })
  }

  function handleComplete() {
    startTransition(async () => {
      try {
        await completeOnboarding()
      } catch {
        /* best effort */
      }
      router.push('/dashboard')
    })
  }

  // -------- Übersichts-Modus (abgeschlossenes Onboarding) --------
  if (overview) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6 sm:p-8">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">
            Dein Setup — Übersicht
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Hier siehst du alle Einrichtungsschritte. Du kannst jeden Schritt
            jederzeit erneut aufrufen.
          </p>
        </header>
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {ONBOARDING_STEPS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setCurrent(s.id)
                  setOverview(false)
                  window.scrollTo({ top: 0 })
                }}
                className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm hover:bg-gray-50"
              >
                <span className="w-6 shrink-0 text-gray-400">{s.id + 1}.</span>
                <span className="flex-1 font-medium text-gray-900">
                  {s.title}
                </span>
                <span className="text-xs text-gray-400">{s.phase.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm font-medium text-red-600 hover:underline"
        >
          ← Zurück zum Dashboard
        </Link>
      </div>
    )
  }

  const isFirst = current === 0
  const isLast = current === ONBOARDING_LAST_STEP

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 sm:p-8">
      <OnboardingStepIndicator step={step} />

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <StepView
          step={step}
          extraCtas={
            step.inlineSkipLabel ? (
              <button
                type="button"
                onClick={() => goTo(current + 1)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {step.inlineSkipLabel}
              </button>
            ) : null
          }
        >
          {step.special === 'business-check' && (
            <BusinessCheck
              value={hasBusiness}
              onChange={setHasBusiness}
              onSkip={() => goTo(current + 1)}
            />
          )}

          {step.special === 'profile-form' && (
            <ProfileForm
              profilName={profilName}
              accountUrl={accountUrl}
              analyticsUrl={analyticsUrl}
              onProfilName={setProfilName}
              onAccountUrl={setAccountUrl}
              onAnalyticsUrl={setAnalyticsUrl}
            />
          )}

          {step.special === 'strategy' && <StrategyCtas />}

          {step.special === 'completion' && (
            <CompletionRecommendation info={completion} />
          )}
        </StepView>

        {step.skipWarning && step.skippable && (
          <p className="mt-5 rounded-md border-l-[3px] border-l-amber-400 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
            {step.skipWarning}
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap items-center gap-3">
        {!isFirst && (
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Zurück
          </button>
        )}

        {isLast ? (
          <button
            type="button"
            onClick={handleComplete}
            className="rounded-md bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Zum Dashboard →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={savingProfile}
            className="rounded-md bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {savingProfile
              ? 'Speichern…'
              : isFirst
                ? "Los geht's →"
                : 'Weiter →'}
          </button>
        )}

        {step.skippable && !isLast && (
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline"
          >
            Diesen Schritt überspringen
          </button>
        )}

        {!isLast && (
          <button
            type="button"
            onClick={handleSkipOnboarding}
            className="ml-auto text-sm font-medium text-gray-400 hover:text-gray-600 hover:underline"
          >
            Onboarding später
          </button>
        )}
      </div>
    </div>
  )
}

// ---------- Schritt 2: Business-Account-Check ----------
function BusinessCheck({
  value,
  onChange,
  onSkip,
}: {
  value: 'ja' | 'nein' | null
  onChange: (v: 'ja' | 'nein') => void
  onSkip: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {(
          [
            ['ja', 'Ja, ich habe einen Business-Account'],
            ['nein', 'Noch nicht - ich stelle jetzt um'],
          ] as const
        ).map(([val, label]) => (
          <label
            key={val}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
          >
            <input
              type="radio"
              name="business-account"
              checked={value === val}
              onChange={() => onChange(val)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Später einrichten - Onboarding fortfahren
      </button>

      {value === 'nein' && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          <p className="font-medium text-gray-900">Anleitung:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Öffne pinterest.com → Einstellungen → Konto verwalten</li>
            <li>Klicke „Zu Business-Account wechseln“</li>
            <li>
              Trage deinen Business-Namen, deine Website und eine kurze
              Beschreibung deiner Inhalte ein - das hilft Pinterest, dich der
              richtigen Zielgruppe zu zeigen.
            </li>
            <li>Komm dann hier zurück</li>
          </ol>
          <p className="mt-3 text-xs text-gray-500">
            Tipps zum Profil-Setup findest du in →{' '}
            <Link
              href="/dashboard/strategie?tab=grundlagen&accordion=profil-setup"
              className="font-medium text-gray-600 hover:text-gray-800 hover:underline"
            >
              Pinterest-Wissen
            </Link>
          </p>
          <a
            href="https://www.pinterest.com/settings/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex font-medium text-red-600 hover:underline"
          >
            → Direkt zu den Pinterest-Einstellungen ↗
          </a>
        </div>
      )}

      <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
        <p className="font-medium text-gray-900">
          Wichtig: Domain verifizieren
        </p>
        <p className="mt-1 leading-relaxed">
          Sobald dein Business-Account steht, verifiziere deine Website-Domain
          bei Pinterest. Das schaltet Pin-Analytics pro URL frei - ohne sie
          funktioniert vieles in Pin-Flow nicht.
        </p>
        <p className="mt-3 text-xs text-gray-500">
          Anleitung dazu in →{' '}
          <Link
            href="/dashboard/strategie?tab=grundlagen&accordion=domain-verifizierung"
            className="font-medium text-gray-600 hover:text-gray-800 hover:underline"
          >
            Pinterest-Wissen
          </Link>
        </p>
      </div>
    </div>
  )
}

// ---------- Schritt 3: Profil-Formular ----------
function ProfileForm({
  profilName,
  accountUrl,
  analyticsUrl,
  onProfilName,
  onAccountUrl,
  onAnalyticsUrl,
}: {
  profilName: string
  accountUrl: string
  analyticsUrl: string
  onProfilName: (v: string) => void
  onAccountUrl: (v: string) => void
  onAnalyticsUrl: (v: string) => void
}) {
  return (
    <div className="space-y-4">
      <Field
        label="Dein Name oder Pinterest-Profilname"
        hint="Wird auf dem Dashboard als Begrüßung verwendet."
        value={profilName}
        onChange={onProfilName}
        placeholder="z. B. Jana"
      />
      <Field
        label="URL zu deinem Pinterest-Account"
        value={accountUrl}
        onChange={onAccountUrl}
        placeholder="https://www.pinterest.com/deinaccount/"
      />
      <Field
        label="URL zu deiner Pinterest-Analytics-Seite"
        hint="Öffne Pinterest-Analytics im Browser und kopiere die URL aus der Adressleiste — so kommst du beim monatlichen Update mit einem Klick dorthin."
        value={analyticsUrl}
        onChange={onAnalyticsUrl}
        placeholder="https://www.pinterest.com/business/..."
      />
      <p className="text-xs text-gray-500">
        Die Angaben werden gespeichert, sobald du auf „Weiter“ klickst.
      </p>
    </div>
  )
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-900">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
      />
      {hint && <span className="mt-1 block text-xs text-gray-500">ⓘ {hint}</span>}
    </label>
  )
}

// ---------- Schritt 9: Strategie-Onboarding-Einstieg ----------
function StrategyCtas() {
  return (
    <div className="flex flex-wrap gap-3 pt-1">
      <Link
        href="/dashboard/strategie?tab=meine&onboarding=true&returnTo=onboarding-step-10"
        className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        Strategie festlegen
      </Link>
      <a
        href="/dashboard/einstellungen"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Einstellungen anschauen ↗
      </a>
    </div>
  )
}

// ---------- Schritt 12: dynamische Empfehlung ----------
function CompletionRecommendation({ info }: { info: CompletionInfo }) {
  const allDone = info.strategieDone && info.hasAnalytics
  return (
    <div className="space-y-4">
    <div className="p-4 text-sm">
      <p className="font-semibold text-gray-900">Deine nächsten Schritte:</p>
      {allDone ? (
        <p className="mt-2 text-gray-700">
          → Schau dir dein Dashboard an. Pin-Flow hat bereits konkrete
          Empfehlungen für dich erstellt.
        </p>
      ) : info.missing.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
          {info.missing.map((m) => (
            <li key={m.href}>
              <Link
                href={m.href}
                className="font-medium text-red-600 hover:underline"
              >
                {m.label}
              </Link>{' '}
              steht noch aus
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-gray-700">
          → Du kannst jederzeit über den Sidebar-Eintrag „Onboarding“
          zurückkehren und offene Schritte nachholen.
        </p>
      )}
    </div>

    <div className="rounded-md border border-sky-200 border-l-[3px] border-l-sky-400 bg-sky-50 p-4 text-sm">
      <p className="font-semibold text-sky-900">
        Setup-Checkliste für den perfekten Start
      </p>
      <p className="mt-1 leading-relaxed text-sky-900">
        In der Sidebar unter „Checkliste“ findest du eine fokussierte
        22-Punkte-Setup-Checkliste, von Domain-Verifizierung bis zur
        ersten Pin-Produktion. Hak ab was du erledigt hast und arbeite
        die Liste in deinem Tempo durch.
      </p>
      <Link
        href="/dashboard/checkliste"
        className="mt-2 inline-flex font-medium text-sky-700 hover:underline"
      >
        → Zur Setup-Checkliste
      </Link>
    </div>
    </div>
  )
}
