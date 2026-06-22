'use client'

// Phase B — Strategie-Setup-Wizard (4 Bausteine + Abschluss).
// Baut auf der reinen Logik in lib.ts auf und speichert über
// saveStrategieOnboarding (actions.ts). Direkter Einstieg mit Baustein 1.

import { useMemo, useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ANGEBOTSART_LABEL,
  BUSINESS_MODELL_OPTIONS,
  HAUPTNISCHE_OPTIONS,
  HAUPTNISCHE_SONSTIGE,
  PINNING_FREQUENZ_OPTIONS,
  ZIELFLAECHEN,
  adjustProportional,
  empfohleneFrequenz,
  empfohlenerAngebotsMix,
  leereZielflaechen,
  parseStrategieRow,
  type Angebotsart,
  type BusinessModell,
  type PinningFrequenz,
  type StrategieRow,
  type Zielflaeche,
  type ZielflaechenVerteilung,
} from './lib'
import {
  restartStrategieOnboarding,
  saveStrategieOnboarding,
} from './actions'

// Welche Zielflächen passen zu welchem Business-Modell (Baustein 2 blendet
// die Slider entsprechend ein; mehrere Modelle ergeben die Vereinigung).
const MODELL_ZIELFLAECHEN: Record<BusinessModell, Zielflaeche[]> = {
  blog: ['blog', 'landingpage', 'newsletter'],
  shop: ['shop', 'etsy'],
  dienstleistung: ['buchung', 'landingpage', 'newsletter'],
  affiliate: ['affiliate'],
}

const ANGEBOTSART_KEYS: Angebotsart[] = [
  'blog_content',
  'affiliate',
  'produkt',
  'dienstleistung',
]

// n ganze Zahlen, die in Summe 100 ergeben (für die Erst-Verteilung).
function gleichVerteilung(n: number): number[] {
  if (n <= 0) return []
  const base = Math.floor(100 / n)
  const rest = 100 - base * n
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0))
}

function hauptnischeLabel(value: string | null): string {
  if (!value) return 'Nicht angegeben'
  if (value === HAUPTNISCHE_SONSTIGE) return 'Andere Nische'
  return HAUPTNISCHE_OPTIONS.find((o) => o.value === value)?.label ?? value
}

const primaryBtn =
  'rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel disabled:cursor-not-allowed disabled:opacity-50'
const secondaryBtn =
  'rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'

export default function MyStrategy({
  strategie,
  boardKategorien,
  urlCount,
}: {
  strategie: StrategieRow | null
  boardKategorien: string[]
  urlCount: number
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const onboardingReturn =
    searchParams?.get('onboarding') === 'true' &&
    searchParams?.get('returnTo') === 'onboarding-step-10'

  const initial = useMemo(() => parseStrategieRow(strategie), [strategie])
  const isComplete = strategie?.strategie_onboarding_abgeschlossen === true
  const empfohlen = empfohleneFrequenz(urlCount)

  const [mode, setMode] = useState<'summary' | 'wizard'>(
    isComplete ? 'summary' : 'wizard'
  )
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)

  const [businessModell, setBusinessModell] = useState<BusinessModell[]>(
    initial.businessModell
  )
  const [hauptnische, setHauptnische] = useState<string>(
    initial.hauptnische ?? ''
  )
  const initialZielSumme = ZIELFLAECHEN.reduce(
    (s, z) => s + initial.zielflaechen[z.value],
    0
  )
  const [zielflaechen, setZielflaechen] = useState<ZielflaechenVerteilung>(
    initialZielSumme === 100 ? initial.zielflaechen : leereZielflaechen()
  )
  const [contentSaeulen, setContentSaeulen] = useState<string[]>(
    initial.contentSaeulen.length > 0 ? initial.contentSaeulen : boardKategorien
  )
  const [pinningFrequenz, setPinningFrequenz] = useState<PinningFrequenz>(
    initial.pinningFrequenz ?? empfohlen
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const sichtbareFlaechen = useMemo<Zielflaeche[]>(
    () =>
      ZIELFLAECHEN.map((z) => z.value).filter((v) =>
        businessModell.some((m) => MODELL_ZIELFLAECHEN[m].includes(v))
      ),
    [businessModell]
  )
  const sichtbareSumme = sichtbareFlaechen.reduce(
    (s, v) => s + zielflaechen[v],
    0
  )

  const angebotsMix = empfohlenerAngebotsMix(businessModell, zielflaechen)

  function toggleModell(m: BusinessModell) {
    setBusinessModell((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    )
  }

  function toggleSaeule(k: string) {
    setContentSaeulen((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
    )
  }

  // Beim Wechsel in Baustein 2: Werte der noch sichtbaren Flächen behalten,
  // unsichtbare auf 0, und falls die Summe nicht stimmt, gleich verteilen.
  function vorbereitenZielflaechen(
    prev: ZielflaechenVerteilung,
    sichtbar: Zielflaeche[]
  ): ZielflaechenVerteilung {
    const next = leereZielflaechen()
    let sum = 0
    for (const v of sichtbar) {
      next[v] = prev[v]
      sum += prev[v]
    }
    if (sum !== 100) {
      const eq = gleichVerteilung(sichtbar.length)
      sichtbar.forEach((v, i) => {
        next[v] = eq[i]
      })
    }
    return next
  }

  function onSlider(flaeche: Zielflaeche, neu: number) {
    const werte = sichtbareFlaechen.map((v) => zielflaechen[v])
    const idx = sichtbareFlaechen.indexOf(flaeche)
    const angepasst = adjustProportional(werte, idx, neu)
    const next = leereZielflaechen()
    sichtbareFlaechen.forEach((v, i) => {
      next[v] = angepasst[i]
    })
    setZielflaechen(next)
  }

  function goBack() {
    setError(null)
    setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4 | 5) : s))
  }

  function goNext() {
    setError(null)
    if (step === 1) {
      if (businessModell.length === 0) {
        setError('Bitte mindestens ein Business-Modell wählen.')
        return
      }
      if (!hauptnische) {
        setError('Bitte deine Hauptnische wählen.')
        return
      }
      setZielflaechen((prev) =>
        vorbereitenZielflaechen(prev, sichtbareFlaechen)
      )
      setStep(2)
      return
    }
    if (step === 2) {
      if (sichtbareSumme !== 100) {
        setError('Bitte verteile genau 100 Prozent.')
        return
      }
      setStep(3)
      return
    }
    if (step < 5) setStep((s) => ((s + 1) as 1 | 2 | 3 | 4 | 5))
  }

  function handleCancel() {
    if (onboardingReturn) {
      router.push('/dashboard/onboarding?step=9')
      return
    }
    if (isComplete) {
      setStep(1)
      setMode('summary')
      return
    }
    router.push('/dashboard')
  }

  function handleSave() {
    setError(null)
    if (businessModell.length === 0) {
      setError('Bitte mindestens ein Business-Modell wählen.')
      return
    }
    if (sichtbareSumme !== 100) {
      setError('Bitte verteile in Baustein 2 genau 100 Prozent.')
      return
    }
    const fd = new FormData()
    businessModell.forEach((m) => fd.append('business_modell', m))
    fd.set('hauptnische', hauptnische)
    for (const z of ZIELFLAECHEN) {
      fd.set(`ziel_soll_${z.value}`, String(zielflaechen[z.value]))
    }
    contentSaeulen.forEach((s) => fd.append('content_saeule', s))
    fd.set('pinning_frequenz', pinningFrequenz)

    startTransition(async () => {
      const res = await saveStrategieOnboarding(fd)
      if (res.error) {
        setError(res.error)
        return
      }
      if (onboardingReturn) {
        router.push('/dashboard/onboarding?step=10')
        return
      }
      router.refresh()
      setMode('summary')
    })
  }

  function handleRestart() {
    setError(null)
    startTransition(async () => {
      await restartStrategieOnboarding()
      router.refresh()
      setStep(1)
      setMode('wizard')
    })
  }

  // =====================================================
  // Zusammenfassung (Tab-Startseite, wenn Strategie bereits steht)
  // =====================================================
  if (mode === 'summary') {
    return (
      <div className="space-y-4">
        {onboardingReturn && <OnboardingHint />}
        <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Deine Strategie steht
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Dein Startpunkt für die kommenden Monate. Du kannst sie jederzeit
              anpassen.
            </p>
          </div>

          <ZusammenfassungInhalt
            businessModell={businessModell}
            hauptnische={hauptnische}
            zielflaechen={zielflaechen}
            contentSaeulen={contentSaeulen}
            pinningFrequenz={pinningFrequenz}
            angebotsMix={angebotsMix}
          />

          <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => {
                setStep(1)
                setMode('wizard')
              }}
              className={primaryBtn}
            >
              Strategie anpassen
            </button>
            <button
              type="button"
              onClick={handleRestart}
              disabled={isPending}
              className={secondaryBtn}
            >
              Neu festlegen
            </button>
            {onboardingReturn && (
              <button
                type="button"
                onClick={() => router.push('/dashboard/onboarding?step=10')}
                className="text-sm font-medium text-link underline underline-offset-2"
              >
                Zurück zum Onboarding
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // =====================================================
  // Wizard
  // =====================================================
  const canAdvance =
    step === 1
      ? businessModell.length > 0 && hauptnische !== ''
      : step === 2
        ? sichtbareSumme === 100
        : true

  return (
    <div className="space-y-4">
      {onboardingReturn && <OnboardingHint />}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <Fortschritt step={step} />

        {step === 1 && (
          <div className="mt-5 space-y-5">
            <p className="rounded-md bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700">
              Diese vier Antworten formen deine Pinterest-Strategie. Sie legen
              fest, worauf du deine Zeit konzentrierst, damit jeder Pin auf ein
              Ziel einzahlt: mehr Menschen auf deine Seite, mehr Sichtbarkeit,
              am Ende mehr Umsatz.
            </p>

            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Baustein 1 von 4: Was beschreibt dein Business am besten?
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Mehrfachauswahl möglich. Daraus leitet Pin-Flow ab, welche Art
                von Pins für dich sinnvoll ist.
              </p>
            </div>

            <div className="space-y-2">
              {BUSINESS_MODELL_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 px-4 py-2.5 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={businessModell.includes(o.value)}
                    onChange={() => toggleModell(o.value)}
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-gray-900">{o.label}</span>
                </label>
              ))}
            </div>

            <div>
              <label
                htmlFor="hauptnische"
                className="block text-sm font-medium text-gray-700"
              >
                Deine Hauptnische
              </label>
              <select
                id="hauptnische"
                value={hauptnische}
                onChange={(e) => setHauptnische(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="" disabled>
                  Bitte wählen…
                </option>
                {HAUPTNISCHE_OPTIONS.filter(
                  (o) => o.value !== 'sonstiges'
                ).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
                <option value={HAUPTNISCHE_SONSTIGE}>
                  Meine Nische ist nicht dabei
                </option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Wähle das Themenfeld, in dem du unterwegs bist. Pin-Flow
                vergleicht deine Zahlen später mit typischen Werten dieser
                Nische.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-5 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Baustein 2 von 4: Wohin sollen deine Pins die Menschen führen?
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                Stell dir Pinterest wie eine Suchmaschine vor, die Menschen zu
                dir schickt. Aber wohin genau? Auf deinen Blog? In deinen Shop?
                Zu deinem Newsletter? Lege fest, wie viel von deiner
                Pinterest-Arbeit auf welches Ziel einzahlen soll. Verteile 100
                Prozent auf die Flächen, die für dich zählen.
              </p>
            </div>

            <div className="space-y-3">
              {sichtbareFlaechen.map((v) => {
                const label =
                  ZIELFLAECHEN.find((z) => z.value === v)?.label ?? v
                return (
                  <div key={v} className="space-y-1">
                    <div className="grid items-center gap-2 sm:grid-cols-[200px_1fr_56px]">
                      <span className="text-sm font-medium text-gray-700">
                        {label}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={zielflaechen[v]}
                        onChange={(e) => onSlider(v, Number(e.target.value))}
                        className="w-full accent-red-600"
                        aria-label={label}
                      />
                      <span className="text-right text-sm tabular-nums text-gray-900">
                        {zielflaechen[v]} %
                      </span>
                    </div>
                    {v === 'affiliate' && (
                      <p className="text-xs leading-relaxed text-gray-500">
                        Gemeint sind Pins, die direkt auf eine Affiliate-Seite
                        führen, zum Beispiel ein Amazon-Produktlink ohne eigene
                        Website dazwischen. Wenn deine Affiliate-Links in einem
                        Blogartikel stehen, wähle stattdessen „Blog", denn
                        dorthin führt der Pin.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            <p
              className={`text-sm font-medium ${
                sichtbareSumme === 100 ? 'text-green-700' : 'text-red-700'
              }`}
            >
              Summe: {sichtbareSumme} %{' '}
              {sichtbareSumme === 100
                ? '(passt)'
                : '(bitte auf 100 Prozent bringen)'}
            </p>

            <p className="text-xs text-gray-500">
              Jeder Pin verlinkt auf genau eine dieser Flächen. Pin-Flow prüft
              später Monat für Monat, ob deine echten Pins zu dieser Verteilung
              passen.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="mt-5 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Baustein 3 von 4: Deine thematischen Schwerpunkte
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                Pinterest will verstehen, worum es bei dir geht. Wenn du immer
                wieder zu denselben Themen pinnst, ordnet Pinterest dich klarer
                ein und zeigt dich den richtigen Menschen. Deine
                Themen-Schwerpunkte sind genau das: die paar großen Themen, um
                die sich bei dir alles dreht.
              </p>
            </div>

            {boardKategorien.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  Du hast deine Themen bereits festgelegt, als du deine Boards
                  angelegt hast. Hier sind sie:
                </p>
                <div className="space-y-2">
                  {boardKategorien.map((k) => (
                    <label
                      key={k}
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={contentSaeulen.includes(k)}
                        onChange={() => toggleSaeule(k)}
                        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-gray-900">{k}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Ideen für sinnvolle Themen-Schwerpunkte findest du unter
                  Prompts und Vorlagen.
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-600">
                Du hast noch keine Boards angelegt. Sobald du das tust,
                erscheinen deine Themen-Schwerpunkte automatisch hier.{' '}
                →{' '}
                <Link
                  href="/dashboard/boards"
                  className="font-medium text-link underline underline-offset-2"
                >
                  Boards anlegen
                </Link>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="mt-5 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Baustein 4 von 4: Wie oft willst du pinnen?
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                Es gibt keine offizielle Zahl. Pinterest selbst sagt nur: poste
                regelmäßig frischen Inhalt. Wichtiger als die Menge ist, dass du
                dranbleibst. Lieber jeden Tag ein guter Pin als zwanzig auf
                einmal und dann zwei Wochen nichts.
              </p>
            </div>

            <p className="rounded-md border-l-[3px] border-l-sky-400 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              Pin-Flow hat dir eine Frequenz vorgeschlagen, die zu deiner Anzahl
              an Inhalten passt. Du kannst sie anpassen.
            </p>

            <div className="space-y-2">
              {PINNING_FREQUENZ_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 px-4 py-3 text-sm hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="pinning_frequenz"
                    checked={pinningFrequenz === o.value}
                    onChange={() => setPinningFrequenz(o.value)}
                    className="mt-0.5 h-4 w-4 border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {o.label}
                      </span>
                      {o.value === empfohlen && (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                          Vorgeschlagen
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-gray-600">
                      {o.beschreibung}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-gray-500">
                Eine Faustregel: Bleib unter 15 Pins pro Tag, und pinne dieselbe
                Seite nicht öfter als alle paar Tage. Qualität und
                Regelmäßigkeit schlagen Masse.
              </p>
              <p className="text-xs text-gray-500">
                Du musst dafür nicht täglich online sein. Mit einem Scheduler
                wie Tailwind oder dem Pinterest-eigenen Planer kannst du deine
                Pins im Voraus einplanen, zum Beispiel an einem Tag im Monat für
                die kommenden Wochen.
              </p>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="mt-5 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Deine Strategie steht
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Prüfe deine Angaben und speichere, um loszulegen.
              </p>
            </div>

            <ZusammenfassungInhalt
              businessModell={businessModell}
              hauptnische={hauptnische}
              zielflaechen={zielflaechen}
              contentSaeulen={contentSaeulen}
              pinningFrequenz={pinningFrequenz}
              angebotsMix={angebotsMix}
            />

            <p className="rounded-md bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700">
              Das ist dein Startpunkt, kein starres Gesetz. Ab jetzt vergleicht
              Pin-Flow Monat für Monat deine tatsächliche Arbeit mit dieser
              Strategie und zeigt dir, wo du gut liegst und wo du nachsteuern
              kannst. So bleibst du auf Kurs, ohne raten zu müssen.
            </p>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
          {step > 1 && (
            <button type="button" onClick={goBack} className={secondaryBtn}>
              Zurück
            </button>
          )}
          {step < 5 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canAdvance}
              className={primaryBtn}
            >
              Weiter
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className={primaryBtn}
            >
              {isPending ? 'Speichert…' : 'Strategie speichern'}
            </button>
          )}
          <button
            type="button"
            onClick={handleCancel}
            className="ml-auto text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// Hilfs-Komponenten
// =====================================================
function OnboardingHint() {
  return (
    <div className="rounded-md border-l-[3px] border-l-sky-400 bg-sky-50 px-4 py-3 text-sm text-sky-900">
      Teil deines Gesamt-Onboardings: <strong>Schritt 9 von 13</strong>. Nach
      Abschluss geht es dort automatisch weiter.
    </div>
  )
}

function Fortschritt({ step }: { step: 1 | 2 | 3 | 4 | 5 }) {
  const label = step <= 4 ? `Baustein ${step} von 4` : 'Abschluss'
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full ${
              step > 4 || step >= i ? 'bg-red-600' : 'bg-gray-200'
            }`}
            aria-hidden
          />
        ))}
      </div>
    </div>
  )
}

export function ZusammenfassungInhalt({
  businessModell,
  hauptnische,
  zielflaechen,
  contentSaeulen,
  pinningFrequenz,
  angebotsMix,
}: {
  businessModell: BusinessModell[]
  hauptnische: string
  zielflaechen: ZielflaechenVerteilung
  contentSaeulen: string[]
  pinningFrequenz: PinningFrequenz
  angebotsMix: Record<Angebotsart, number>
}) {
  const modellLabels = businessModell.map(
    (m) => BUSINESS_MODELL_OPTIONS.find((o) => o.value === m)?.label ?? m
  )
  const frequenz = PINNING_FREQUENZ_OPTIONS.find(
    (o) => o.value === pinningFrequenz
  )
  const aktiveFlaechen = ZIELFLAECHEN.filter((z) => zielflaechen[z.value] > 0)

  return (
    <div className="space-y-5 text-sm">
      <Block titel="Business-Modell">
        {modellLabels.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {modellLabels.map((l) => (
              <span
                key={l}
                className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700"
              >
                {l}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">Nicht angegeben</span>
        )}
      </Block>

      <Block titel="Hauptnische">
        <span className="text-gray-900">{hauptnischeLabel(hauptnische)}</span>
      </Block>

      <Block
        titel="Pin-Ziel-Verteilung"
        untertitel="Wohin deine Pins die Menschen führen sollen"
      >
        {aktiveFlaechen.length > 0 ? (
          <div className="space-y-1.5">
            {aktiveFlaechen.map((z) => (
              <div key={z.value} className="flex items-center gap-3">
                <span className="w-52 shrink-0 text-gray-700">{z.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-red-500"
                    style={{ width: `${zielflaechen[z.value]}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right tabular-nums text-gray-900">
                  {zielflaechen[z.value]} %
                </span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">Noch nicht verteilt</span>
        )}
      </Block>

      <Block titel="Themen-Schwerpunkte">
        {contentSaeulen.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {contentSaeulen.map((s) => (
              <span
                key={s}
                className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700"
              >
                {s}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">Noch keine festgelegt</span>
        )}
      </Block>

      <Block titel="Pinning-Rhythmus">
        <span className="text-gray-900">
          {frequenz ? `${frequenz.label} (${frequenz.beschreibung})` : '—'}
        </span>
      </Block>

      <Block
        titel="Empfohlener Angebotsart-Mix"
        untertitel="Welches Angebot am Ziel deiner Pins steht"
      >
        <div className="space-y-1.5">
          {ANGEBOTSART_KEYS.map((k) => (
            <div key={k} className="flex items-center gap-3">
              <span className="w-52 shrink-0 text-gray-700">
                {ANGEBOTSART_LABEL[k]}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-slate-500"
                  style={{ width: `${angebotsMix[k]}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right tabular-nums text-gray-900">
                {angebotsMix[k]} %
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Abgeleiteter Vorschlag aus deinen Pin-Zielen. Damit vergleicht
          Pin-Flow später die tatsächliche Angebotsart deiner Pins.
        </p>
      </Block>
    </div>
  )
}

function Block({
  titel,
  untertitel,
  children,
}: {
  titel: string
  untertitel?: string
  children: ReactNode
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-900">{titel}</p>
      {untertitel && (
        <p className="mt-0.5 text-xs text-gray-500">{untertitel}</p>
      )}
      <div className="mt-1.5">{children}</div>
    </div>
  )
}
