'use client'

import { useEffect, useMemo, useState, useTransition, type FormEvent } from 'react'
import { deleteProfilAnalytics, saveProfilAnalytics } from './actions'
import NextZeitraumHint from './NextZeitraumHint'
import {
  addDays,
  calcCtr,
  calcEngagement,
  calcGrowth,
  diffDays,
  effectiveZeitraum,
  formatDateDe,
  formatNumber,
  formatPercent,
  formatZahl,
  formatZeitraumKurz,
  todayIso,
  type ProfilAnalyticsWithGrowth,
} from './utils'

const inputCls =
  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500'

// Tsd.-Eingabe: Nutzer schreibt "5,5" (oder "5.5"), wird × 1000 als
// absolute Zahl gespeichert. Tausender-Punkte werden vor dem Parsen entfernt,
// damit z.B. "5.500" als 5500 verstanden wird (statt × 1000 = 5.500.000).
function parseTsdInput(s: string): number {
  const trimmed = s.trim()
  if (!trimmed) return 0
  const normalized = trimmed.replace(/\./g, '').replace(',', '.')
  const n = Number(normalized)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.round(n * 1000))
}

function formatTsdInput(n: number): string {
  if (!Number.isFinite(n)) return ''
  if (n === 0) return '0'
  const v = n / 1000
  // Bis zu 3 Nachkommastellen, kein trailing zero, deutsches Komma.
  return v.toLocaleString('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })
}

const TSD_FIELDS = [
  'impressionen',
  'gesamte_zielgruppe',
  'interagierende_zielgruppe',
] as const

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
      <path
        fillRule="evenodd"
        d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export default function ProfilTab({
  profilAnalytics,
  latestZeitraumBis,
}: {
  profilAnalytics: ProfilAnalyticsWithGrowth[]
  // Einheitliche Datumsquelle aus AnalyticsClient (MAX über profil_analytics
  // + pins_analytics) — beide Tabs zeigen denselben „nächster Zeitraum"-
  // Vorschlag.
  latestZeitraumBis: string | null
}) {

  const [zeitraumVon, setZeitraumVon] = useState('')
  const [zeitraumBis, setZeitraumBis] = useState('')
  const [impressionen, setImpressionen] = useState('')
  const [klicks, setKlicks] = useState('')
  const [saves, setSaves] = useState('')
  const [zielgruppe, setZielgruppe] = useState('')
  const [interagierend, setInteragierend] = useState('')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    saved?: boolean
    error?: string
  }>({})

  useEffect(() => {
    // Initiales Prefill nach Mount.
    // zeitraum_von = letztes zeitraum_bis + 1 Tag (sonst Überlappung).
    const yesterday = addDays(todayIso(), -1)
    setZeitraumBis((prev) => prev || yesterday)
    setZeitraumVon(
      (prev) =>
        prev || (latestZeitraumBis ? addDays(latestZeitraumBis, 1) : '')
    )
  }, [latestZeitraumBis])

  // Impressionen kommen als Tsd.-Eingabe ("5,5" → 5500), Klicks/Saves
  // sind absolute Werte.
  const impN = parseTsdInput(impressionen)
  const klicksN = Number(klicks) || 0
  const savesN = Number(saves) || 0
  const ctr = calcCtr(klicksN, impN)
  const engagement = calcEngagement(klicksN, savesN, impN)

  const existingForBis = useMemo(
    () => profilAnalytics.find((r) => r.datum === zeitraumBis) ?? null,
    [profilAnalytics, zeitraumBis]
  )

  const aktuellerStand = profilAnalytics[0] ?? null

  // "Seit Pin-Start": Summe ALLER Zeiträume (kein Jahresfilter).
  // CTR/ER als gewichteter Durchschnitt — sauberer als arithmetisches
  // Mittel über unterschiedlich große Zeiträume.
  const gesamtAggregate = useMemo(() => {
    if (profilAnalytics.length === 0) return null
    let imp = 0
    let kl = 0
    let sv = 0
    for (const r of profilAnalytics) {
      imp += r.impressionen
      kl += r.ausgehende_klicks
      sv += r.saves
    }
    // profilAnalytics ist DESC sortiert → letzter Index = ältester Eintrag
    const aeltester = profilAnalytics[profilAnalytics.length - 1]
    const startDatum = effectiveZeitraum(aeltester).von
    return {
      impressionen: imp,
      klicks: kl,
      saves: sv,
      ctr: calcCtr(kl, imp),
      engagement: calcEngagement(kl, sv, imp),
      anzahlZeitraeume: profilAnalytics.length,
      startDatum,
    }
  }, [profilAnalytics])

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFeedback({})
    const formData = new FormData(e.currentTarget)
    // Tsd.-Felder zu absoluten Zahlen umrechnen, bevor an die Server-Action.
    for (const key of TSD_FIELDS) {
      const raw = String(formData.get(key) ?? '')
      formData.set(key, String(parseTsdInput(raw)))
    }
    // Den gerade abgeschickten zeitraum_bis merken — wird nach erfolgreichem
    // Speichern als neuer zeitraum_von verwendet.
    const submittedBis = String(formData.get('zeitraum_bis') ?? '')
    startTransition(async () => {
      const result = await saveProfilAnalytics(formData)
      if (result.error) {
        setFeedback({ error: result.error })
        return
      }
      setFeedback({ saved: true })
      // Felder leeren und Datumsfelder für den nächsten Zeitraum vorbereiten.
      // Neuer zeitraum_von = gerade gespeichertes zeitraum_bis + 1 Tag.
      setImpressionen('')
      setKlicks('')
      setSaves('')
      setZielgruppe('')
      setInteragierend('')
      setZeitraumVon(submittedBis ? addDays(submittedBis, 1) : todayIso())
      setZeitraumBis(addDays(todayIso(), -1))
    })
  }

  function onDelete(id: string) {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('id', id)
      await deleteProfilAnalytics(fd)
    })
  }

  function startEdit(row: ProfilAnalyticsWithGrowth) {
    const eff = effectiveZeitraum(row)
    setZeitraumVon(eff.von)
    setZeitraumBis(eff.bis)
    // Tsd.-Felder rückkonvertieren (5500 → "5,5") für die Eingabe.
    setImpressionen(formatTsdInput(row.impressionen))
    setKlicks(String(row.ausgehende_klicks))
    setSaves(String(row.saves))
    setZielgruppe(formatTsdInput(row.gesamte_zielgruppe))
    setInteragierend(formatTsdInput(row.interagierende_zielgruppe))
    setFeedback({})
    if (typeof window !== 'undefined') {
      const el = document.getElementById('analytics-form')
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="space-y-6">
      <p style={{ color: '#111827', fontWeight: '600', fontSize: '14px' }}>
        Die Gesamt-Performance zeigt alle deine Pins zusammen — so wie
        Pinterest sie ausweist. Tracke diese Zahlen monatlich um die
        Entwicklung deines Profils zu beobachten.
      </p>

      <details className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
        <summary className="cursor-pointer font-medium text-gray-900">
          So findest du deine Zahlen
        </summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-gray-600">
          <li>Pinterest öffnen → linkes Menü → Analytics → Übersicht</li>
          <li>
            Zeitraum oben rechts: „Benutzerdefiniert" wählen → den Zeitraum
            aus dem türkisen Feld unten eingeben (Von:{' '}
            <strong>{zeitraumVon ? formatDateDe(zeitraumVon) : '—'}</strong>{' '}
            bis Bis:{' '}
            <strong>{zeitraumBis ? formatDateDe(zeitraumBis) : '—'}</strong>)
          </li>
          <li>
            Direkt unter der Datumsauswahl erscheint die Gesamt-Performance —
            diese Werte übertragen:
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              <li>
                Impressionen → Feld <strong>„Impressionen (Tsd.)"</strong>
              </li>
              <li>
                Ausgehende Klicks → Feld <strong>„Ausgehende Klicks"</strong>
              </li>
              <li>
                Saves → Feld <strong>„Saves"</strong>
              </li>
              <li>
                Gesamte Zielgruppe → Feld{' '}
                <strong>„Gesamte Zielgruppe (Tsd.)"</strong>
              </li>
              <li>
                Interagierende Zielgruppe → Feld{' '}
                <strong>„Interagierende Zielgruppe (Tsd.)"</strong>
              </li>
            </ul>
          </li>
        </ol>
      </details>

      {/* Sektion 1: Aktuelle Daten */}
      <KpiSection
        compact
        title="Deine aktuellen Daten"
        zeitraum={
          aktuellerStand
            ? (() => {
                const eff = effectiveZeitraum(aktuellerStand)
                const tage = diffDays(eff.von, eff.bis) + 1
                return `${formatZeitraumKurz(eff.von, eff.bis)} (${tage} Tage)`
              })()
            : null
        }
        zeitraumLabel="Zeitraum"
        zeitraumExtra={
          profilAnalytics[1]
            ? (() => {
                const eff = effectiveZeitraum(profilAnalytics[1])
                const tage = diffDays(eff.von, eff.bis) + 1
                return `vs. Vorperiode: ${formatZeitraumKurz(eff.von, eff.bis)} (${tage} Tage)`
              })()
            : null
        }
        kpis={
          aktuellerStand
            ? [
                {
                  label: 'Impressionen',
                  value: formatZahl(aktuellerStand.impressionen),
                  title: formatNumber(aktuellerStand.impressionen),
                  growth: aktuellerStand.impressionen_growth,
                },
                {
                  label: 'Ausgehende Klicks',
                  value: formatZahl(aktuellerStand.ausgehende_klicks),
                  title: formatNumber(aktuellerStand.ausgehende_klicks),
                  growth: aktuellerStand.klicks_growth,
                },
                {
                  label: 'Saves',
                  value: formatZahl(aktuellerStand.saves),
                  title: formatNumber(aktuellerStand.saves),
                  growth: aktuellerStand.saves_growth,
                },
                {
                  label: 'Ø CTR',
                  value: formatPercent(aktuellerStand.ctr),
                  growth: aktuellerStand.ctr_growth,
                },
                {
                  label: 'Ø Engagement Rate',
                  value: formatPercent(aktuellerStand.engagement),
                  growth: aktuellerStand.engagement_growth,
                },
              ]
            : null
        }
        emptyText="Noch keine Daten erfasst — trage unten deinen ersten Zeitraum ein."
      />

      {/* Sektion 2: Seit Pin-Start (Summen über alle Zeiträume) */}
      <KpiSection
        compact
        title="Seit Pin-Start"
        zeitraum={
          gesamtAggregate
            ? `Alle Zeiträume seit ${formatDateDe(gesamtAggregate.startDatum)} (${gesamtAggregate.anzahlZeitraeume} Eintrag${gesamtAggregate.anzahlZeitraeume === 1 ? '' : 'e'})`
            : null
        }
        zeitraumLabel=""
        kpis={
          gesamtAggregate
            ? [
                {
                  label: 'Impressionen',
                  value: formatZahl(gesamtAggregate.impressionen),
                  title: formatNumber(gesamtAggregate.impressionen),
                },
                {
                  label: 'Ausgehende Klicks',
                  value: formatZahl(gesamtAggregate.klicks),
                  title: formatNumber(gesamtAggregate.klicks),
                },
                {
                  label: 'Saves',
                  value: formatZahl(gesamtAggregate.saves),
                  title: formatNumber(gesamtAggregate.saves),
                },
                { label: 'Ø CTR', value: formatPercent(gesamtAggregate.ctr) },
                {
                  label: 'Ø Engagement Rate',
                  value: formatPercent(gesamtAggregate.engagement),
                },
              ]
            : null
        }
        emptyText="Noch keine Einträge erfasst."
      />

      <NextZeitraumHint von={zeitraumVon || null} bis={zeitraumBis || null} />

      {/* Eingabe-Bereich */}
      <form
        id="analytics-form"
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm scroll-mt-6"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Gesamt-Performance
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Trage deine Pinterest-Zahlen für den unten gewählten Zeitraum ein.
            Pinterest speichert Analytics nur 6 Monate (180 Tage) — am besten
            monatlich aktualisieren.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Von" htmlFor="zeitraum_von">
            <input
              id="zeitraum_von"
              name="zeitraum_von"
              type="date"
              required
              value={zeitraumVon}
              onChange={(e) => setZeitraumVon(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Bis" htmlFor="zeitraum_bis">
            <input
              id="zeitraum_bis"
              name="zeitraum_bis"
              type="date"
              required
              value={zeitraumBis}
              onChange={(e) => setZeitraumBis(e.target.value)}
              className={inputCls}
            />
            {existingForBis && (
              <p className="mt-1 text-xs text-amber-700">
                ⚠️ Eintrag mit diesem End-Datum existiert bereits — wird
                überschrieben.
              </p>
            )}
          </Field>

          <div className="md:col-span-2 lg:col-span-1 md:flex md:items-end">
            <p className="text-xs text-gray-500">
              Zeitraum wird automatisch berechnet: vom letzten Update bis
              gestern. Passe die Daten in Pinterest Analytics entsprechend an.
            </p>
          </div>

          <Field label="Impressionen (Tsd.)" htmlFor="impressionen">
            <input
              id="impressionen"
              name="impressionen"
              type="text"
              inputMode="decimal"
              required
              placeholder="5,5"
              value={impressionen}
              onChange={(e) => setImpressionen(e.target.value)}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-gray-500">
              Angabe in Tsd. — z.B. 5,5 für 5.500
            </p>
          </Field>

          <Field label="Ausgehende Klicks" htmlFor="ausgehende_klicks">
            <input
              id="ausgehende_klicks"
              name="ausgehende_klicks"
              type="number"
              min={0}
              step={1}
              required
              value={klicks}
              onChange={(e) => setKlicks(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Saves" htmlFor="saves">
            <input
              id="saves"
              name="saves"
              type="number"
              min={0}
              step={1}
              required
              value={saves}
              onChange={(e) => setSaves(e.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Gesamte Zielgruppe (Tsd.)" htmlFor="gesamte_zielgruppe">
            <input
              id="gesamte_zielgruppe"
              name="gesamte_zielgruppe"
              type="text"
              inputMode="decimal"
              required
              placeholder="5,5"
              value={zielgruppe}
              onChange={(e) => setZielgruppe(e.target.value)}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-gray-500">
              Angabe in Tsd. — z.B. 5,5 für 5.500
            </p>
          </Field>

          <Field
            label="Interagierende Zielgruppe (Tsd.)"
            htmlFor="interagierende_zielgruppe"
          >
            <input
              id="interagierende_zielgruppe"
              name="interagierende_zielgruppe"
              type="text"
              inputMode="decimal"
              required
              placeholder="5,5"
              value={interagierend}
              onChange={(e) => setInteragierend(e.target.value)}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-gray-500">
              Angabe in Tsd. — z.B. 5,5 für 5.500
            </p>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-md border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
          <ComputedValue
            label="CTR"
            value={formatPercent(ctr)}
            hint="Klicks ÷ Impressionen"
          />
          <ComputedValue
            label="Engagement Rate"
            value={formatPercent(engagement)}
            hint="(Klicks + Saves) ÷ Impressionen"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Speichert…' : 'Analytics speichern'}
          </button>
          {feedback.saved && (
            <span className="text-sm text-green-700">✓ Gespeichert</span>
          )}
          {feedback.error && (
            <span className="text-sm text-red-700">{feedback.error}</span>
          )}
        </div>
      </form>

      {/* Verlaufs-Tabelle */}
      <HistoryTable
        rows={profilAnalytics}
        onEdit={startEdit}
        onDelete={onDelete}
        deleteDisabled={isPending}
      />
    </div>
  )
}

// ===========================================================
// KPI-Sektion (5 Kacheln + Zeitraum-Footer)
// ===========================================================
type Kpi = {
  label: string
  value: string
  title?: string
  // growth = relative Veränderung in % vs. Vorperiode. null = kein
  // Vergleichswert (z.B. erste Periode), undefined = Sektion zeigt
  // generell keine Deltas (z.B. „Seit Pin-Start").
  growth?: number | null
}

function KpiSection({
  title,
  zeitraum,
  zeitraumLabel,
  zeitraumExtra,
  kpis,
  emptyText,
  compact = false,
}: {
  title: string
  zeitraum: string | null
  zeitraumLabel: string
  // Optionale zweite Footer-Zeile (z.B. „vs. Vorperiode …"). Wird unter der
  // primären Zeitraum-Zeile gerendert, wenn gesetzt.
  zeitraumExtra?: string | null
  kpis: Kpi[] | null
  emptyText: string
  // compact: kleinere Höhen / Schriften für „Deine aktuellen Daten" —
  // soll dezent unter der Headline sitzen, nicht dominant.
  compact?: boolean
}) {
  const sectionPad = compact ? 'px-6 py-3' : 'p-6'
  const gridMt = compact ? 'mt-2' : 'mt-4'
  const labelStyle = compact
    ? { fontSize: '10px' }
    : undefined
  const valueStyle = compact
    ? { fontSize: '20px' }
    : undefined
  const footerMt = compact ? 'mt-2' : 'mt-4'
  return (
    <section
      className={`rounded-lg border border-gray-200 bg-white shadow-sm ${sectionPad}`}
    >
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {kpis ? (
        <>
          <div className={`${gridMt} grid grid-cols-2 gap-4 md:grid-cols-5`}>
            {kpis.map((k) => (
              <div key={k.label}>
                <p
                  className="text-xs font-medium uppercase tracking-wide text-gray-500"
                  style={labelStyle}
                >
                  {k.label}
                </p>
                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                  <p
                    className="text-xl font-semibold text-gray-900"
                    style={valueStyle}
                    title={k.title}
                  >
                    {k.value}
                  </p>
                  {k.growth !== undefined && k.growth !== null && (
                    <GrowthInline value={k.growth} />
                  )}
                </div>
              </div>
            ))}
          </div>
          {zeitraum && (
            <div className={`${footerMt} space-y-0.5`}>
              <p className="text-xs text-gray-500">
                {zeitraumLabel ? `${zeitraumLabel}: ` : ''}
                {zeitraum}
              </p>
              {zeitraumExtra && (
                <p className="text-xs text-gray-500">{zeitraumExtra}</p>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-gray-500">{emptyText}</p>
      )}
    </section>
  )
}

function GrowthInline({ value }: { value: number }) {
  if (value === Number.POSITIVE_INFINITY) {
    return (
      <span
        className="text-xs font-medium text-green-700"
        title="Aus Null heraus gestiegen"
      >
        ↑ neu
      </span>
    )
  }
  if (value === Number.NEGATIVE_INFINITY) {
    return (
      <span className="text-xs font-medium text-red-700" title="Rückgang">
        ↓
      </span>
    )
  }
  if (!Number.isFinite(value) || value === 0) {
    return <span className="text-xs text-gray-500">± 0%</span>
  }
  const positive = value > 0
  const sign = positive ? '+' : ''
  const rounded = Math.round(value)
  return (
    <span
      className={`text-xs font-medium ${positive ? 'text-green-700' : 'text-red-700'}`}
    >
      {positive ? '↑' : '↓'} {sign}
      {rounded}%
    </span>
  )
}

// ===========================================================
// Verlaufs-Tabelle
// ===========================================================
function HistoryTable({
  rows,
  onEdit,
  onDelete,
  deleteDisabled,
}: {
  rows: ProfilAnalyticsWithGrowth[]
  onEdit: (row: ProfilAnalyticsWithGrowth) => void
  onDelete: (id: string) => void
  deleteDisabled: boolean
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Noch keine Profil-Analytics gespeichert. Trage oben deinen ersten
        Zeitraum ein.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <Th>Zeitraum</Th>
            <Th>Tage</Th>
            <Th>Impressionen</Th>
            <Th>Klicks</Th>
            <Th>Saves</Th>
            <Th>CTR</Th>
            <Th>Engagement</Th>
            <Th align="right">Aktion</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => {
            const eff = effectiveZeitraum(row)
            const tage = diffDays(eff.von, eff.bis) + 1
            // Vorperiode = älterer Eintrag (rows ist DESC sortiert).
            const prev = rows[i + 1]
            const prevEff = prev ? effectiveZeitraum(prev) : null
            const prevTage = prevEff ? diffDays(prevEff.von, prevEff.bis) + 1 : 0
            // Per-Day-Werte: Vergleich fair auch bei unterschiedlich
            // langen Perioden. Delta auf Per-Day basieren statt absolut.
            const perDay = tage > 0
              ? {
                  imp: row.impressionen / tage,
                  klicks: row.ausgehende_klicks / tage,
                  saves: row.saves / tage,
                }
              : null
            const prevPerDay = prev && prevTage > 0
              ? {
                  imp: prev.impressionen / prevTage,
                  klicks: prev.ausgehende_klicks / prevTage,
                  saves: prev.saves / prevTage,
                }
              : null
            const impGrowth =
              perDay && prevPerDay
                ? calcGrowth(perDay.imp, prevPerDay.imp)
                : null
            const klicksGrowth =
              perDay && prevPerDay
                ? calcGrowth(perDay.klicks, prevPerDay.klicks)
                : null
            const savesGrowth =
              perDay && prevPerDay
                ? calcGrowth(perDay.saves, prevPerDay.saves)
                : null
            return (
              <tr key={row.id} className="align-top hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                  {formatZeitraumKurz(eff.von, eff.bis)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                  {tage} T
                </td>
                <ValueCell
                  value={formatZahl(row.impressionen)}
                  title={formatNumber(row.impressionen)}
                  perDay={perDay ? formatPerDay(perDay.imp) : undefined}
                  growth={impGrowth}
                />
                <ValueCell
                  value={formatZahl(row.ausgehende_klicks)}
                  title={formatNumber(row.ausgehende_klicks)}
                  perDay={perDay ? formatPerDay(perDay.klicks) : undefined}
                  growth={klicksGrowth}
                />
                <ValueCell
                  value={formatZahl(row.saves)}
                  title={formatNumber(row.saves)}
                  perDay={perDay ? formatPerDay(perDay.saves) : undefined}
                  growth={savesGrowth}
                />
                <ValueCell
                  value={formatPercent(row.ctr)}
                  growth={row.ctr_growth}
                />
                <ValueCell
                  value={formatPercent(row.engagement)}
                  growth={row.engagement_growth}
                />
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      className="text-gray-500 hover:text-gray-900"
                      aria-label="Bearbeiten"
                      title="Bearbeiten"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row.id)}
                      disabled={deleteDisabled}
                      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ===========================================================
// Hilfs-Komponenten
// ===========================================================
function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700"
      >
        {label} <span className="text-red-600">*</span>
      </label>
      {children}
    </div>
  )
}

function ComputedValue({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{hint}</p>
    </div>
  )
}

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <th
      className={`px-4 py-3 text-${align} text-xs font-semibold uppercase tracking-wide text-gray-500`}
    >
      {children}
    </th>
  )
}

function ValueCell({
  value,
  title,
  perDay,
  growth,
}: {
  value: string
  title?: string
  // perDay = bereits formatierter Ø/Tag-String (z.B. "217/T"), wird hinter
  // dem Absolutwert mit Mittelpunkt-Trenner gerendert.
  perDay?: string
  // null = keine Vorperiode (älteste Zeile) → kein Delta rendern.
  growth?: number | null
}) {
  return (
    <td className="whitespace-nowrap px-4 py-3 text-sm">
      <span className="inline-flex items-baseline gap-1.5">
        <span className="font-medium text-gray-900" title={title}>
          {value}
        </span>
        {perDay && (
          <span className="text-[11px] text-gray-500">· {perDay}</span>
        )}
        {growth !== null && growth !== undefined && (
          <DeltaInCell value={growth} />
        )}
      </span>
    </td>
  )
}

// Ø-pro-Tag formatieren — 1 Dezimalstelle, deutsches Komma, trailing
// ".0" unterdrückt. Suffix "/T".
function formatPerDay(perDay: number): string {
  if (!Number.isFinite(perDay)) return '—'
  const rounded = Math.round(perDay * 10) / 10
  const display = rounded.toLocaleString('de-DE', {
    maximumFractionDigits: 1,
  })
  return `${display}/T`
}

// Inline-Delta für Tabellenzellen (11px / 500). Format: "↑+5%" oder "↓-3%".
// Auf 1 Dezimalstelle gerundet, dt. Komma — trailing ".0" wird unterdrückt
// (z.B. 5,0 → "5"). ±Infinity wird als "neu" / "↓" abgekürzt.
function DeltaInCell({ value }: { value: number }) {
  if (value === Number.POSITIVE_INFINITY) {
    return (
      <span
        className="text-[11px] font-medium text-green-600"
        title="Aus Null heraus gestiegen"
      >
        ↑ neu
      </span>
    )
  }
  if (value === Number.NEGATIVE_INFINITY) {
    return (
      <span className="text-[11px] font-medium text-red-600" title="Rückgang">
        ↓
      </span>
    )
  }
  if (!Number.isFinite(value)) return null
  const rounded = Math.round(value * 10) / 10
  if (rounded === 0) {
    return <span className="text-[11px] font-medium text-gray-500">± 0%</span>
  }
  const positive = rounded > 0
  const sign = positive ? '+' : ''
  const display = rounded.toLocaleString('de-DE', {
    maximumFractionDigits: 1,
  })
  return (
    <span
      className={`text-[11px] font-medium ${positive ? 'text-green-600' : 'text-red-600'}`}
    >
      {positive ? '↑' : '↓'}
      {sign}
      {display}%
    </span>
  )
}
