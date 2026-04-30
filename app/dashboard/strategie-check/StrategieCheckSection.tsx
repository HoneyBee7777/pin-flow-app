// Server-Komponente: rendert die Strategie-Check-Sektion auf dem Dashboard.
// Logik / Berechnung kommt aus lib.ts (rein, testbar).

import Link from 'next/link'
import InfoTooltip from '@/components/InfoTooltip'
import type {
  CheckArea,
  CheckItem,
  CoachingItem,
  DiffColor,
  StrategieCheckResult,
} from './lib'

// =====================================================
// Farb-Mapping pro Bereich+Kanal (matcht /dashboard/strategie)
// =====================================================
const BAR_HEX: Record<string, string> = {
  // Strategie-Mix
  'mix:blog': '#3b82f6', // blue-500
  'mix:affiliate': '#a855f7', // purple-500
  'mix:produkt': '#22c55e', // green-500
  // Conversion-Ziele
  'ziel:traffic': '#3b82f6',
  'ziel:lead': '#f97316', // orange-500
  'ziel:sales': '#22c55e',
  // Format-Mix
  'format:standard': '#000000',
  'format:video': '#ef4444', // red-500
  'format:collage': '#facc15', // yellow-400
  'format:carousel': '#ec4899', // pink-500
}

const DIFF_TEXT_CLASS: Record<DiffColor, string> = {
  green: 'text-green-600',
  yellow: 'text-yellow-600',
  red: 'text-red-600',
}

const AREA_LABEL: Record<CheckArea['key'], string> = {
  mix: 'Strategie-Mix',
  ziel: 'Conversion-Ziele',
  format: 'Pin-Format-Mix',
}

// =====================================================
// Hauptkomponente
// =====================================================
export default function StrategieCheckSection({
  result,
}: {
  result: StrategieCheckResult
}) {
  const {
    totalPinsImFenster,
    pinsOhneAngabe,
    onboardingAbgeschlossen,
    fensterTage,
    areas,
    coachingTop3,
    allInPlan,
  } = result

  // Empty-State: keine Pins der letzten 180 Tage
  if (totalPinsImFenster === 0) {
    return (
      <section id="strategie-check" className="scroll-mt-4">
        <SectionHeader />
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
          Noch keine Pin-Daten der letzten {fensterTage} Tage vorhanden. Trage
          deine Pins in die Pin-Datenbank ein, um den Strategie-Check zu sehen.
        </div>
      </section>
    )
  }

  return (
    <section id="strategie-check" className="scroll-mt-4">
      <SectionHeader />

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {!onboardingAbgeschlossen && <OnboardingHinweis />}

        {pinsOhneAngabe > 0 && (
          <HinweisOhneDaten count={pinsOhneAngabe} fensterTage={fensterTage} />
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {areas.map((area) => (
            <AreaBlock
              key={area.key}
              area={area}
              showSoll={onboardingAbgeschlossen}
            />
          ))}
        </div>

        {onboardingAbgeschlossen && allInPlan && <AllInPlanBlock />}

        {onboardingAbgeschlossen && coachingTop3.length > 0 && (
          <CoachingBlock items={coachingTop3} />
        )}
      </div>
    </section>
  )
}

// =====================================================
// Header
// =====================================================
function SectionHeader() {
  return (
    <div className="mb-3">
      <h2 className="text-xl font-semibold text-gray-900">
        Strategie-Check
        <InfoTooltip text="Vergleicht deine in den letzten 180 Tagen erstellten Pins mit deiner hinterlegten Soll-Strategie. So siehst du, ob du tatsächlich das pinnst, was du dir vorgenommen hast." />
      </h2>
      <p className="mt-1 text-sm text-gray-600">
        Stimmt deine Pin-Verteilung mit deiner geplanten Strategie überein?
      </p>
    </div>
  )
}

// =====================================================
// Hinweise
// =====================================================
function OnboardingHinweis() {
  return (
    <div className="hinweis-box">
      💡 Du hast noch keine Strategie hinterlegt. Hinterlege deine Soll-Strategie
      auf der Strategie-Seite, um einen Soll-Ist-Vergleich zu sehen.{' '}
      <Link
        href="/dashboard/strategie"
        className="font-medium underline hover:text-blue-700"
      >
        Strategie hinterlegen ↗
      </Link>
    </div>
  )
}

function HinweisOhneDaten({
  count,
  fensterTage,
}: {
  count: number
  fensterTage: number
}) {
  return (
    <div className="hinweis-box">
      💡 {count} {count === 1 ? 'deiner Pins' : 'deiner Pins'} aus den letzten{' '}
      {fensterTage} Tagen{' '}
      {count === 1 ? 'hat' : 'haben'} noch keine Strategie-, Conversion-Ziel-
      oder Format-Angabe. Diese Pins werden im Check nicht berücksichtigt. Du
      kannst die Angaben beim Pin-Anlegen oder über „Pin bearbeiten"
      nachtragen.
    </div>
  )
}

// =====================================================
// Bereich (Header + Items)
// =====================================================
function AreaBlock({
  area,
  showSoll,
}: {
  area: CheckArea
  showSoll: boolean
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
        {AREA_LABEL[area.key]}
      </h3>
      <p className="mt-0.5 text-xs leading-snug text-gray-500">
        {area.header}
      </p>

      {!area.hasData ? (
        <p className="mt-3 text-xs text-gray-500">
          Noch keine Pins mit dieser Angabe in den letzten 180 Tagen.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {area.items.map((item) => (
            <CheckRow
              key={item.key}
              areaKey={area.key}
              item={item}
              showSoll={showSoll}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// =====================================================
// Eine Zeile: Label + Werte + Balken + Diff-Hinweis
// =====================================================
function CheckRow({
  areaKey,
  item,
  showSoll,
}: {
  areaKey: CheckArea['key']
  item: CheckItem
  showSoll: boolean
}) {
  const fillHex = BAR_HEX[`${areaKey}:${item.key}`] ?? '#3b82f6'
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-gray-700">{item.label}</span>
        <span className="tabular-nums text-gray-900">
          Ist: <span className="font-semibold">{formatPct(item.ist)}</span>
          {showSoll && (
            <>
              {' '}
              · Soll:{' '}
              <span className="font-semibold">{formatPct(item.soll)}</span>
            </>
          )}
        </span>
      </div>

      <Bar ist={item.ist} soll={showSoll ? item.soll : null} fillHex={fillHex} />

      {showSoll && (
        <p
          className={`mt-1.5 break-words text-xs font-medium leading-snug ${DIFF_TEXT_CLASS[item.color]}`}
        >
          ↳ {item.message}
        </p>
      )}
    </div>
  )
}

// =====================================================
// Balken mit gefülltem Ist und vertikaler Soll-Markierung
// =====================================================
function Bar({
  ist,
  soll,
  fillHex,
}: {
  ist: number
  soll: number | null
  fillHex: string
}) {
  const istClamped = Math.max(0, Math.min(100, ist))
  const sollClamped =
    soll === null ? null : Math.max(0, Math.min(100, soll))

  return (
    <div className="relative mt-1 h-2.5 w-full overflow-visible rounded-full bg-gray-200">
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${istClamped}%`, backgroundColor: fillHex }}
      />
      {sollClamped !== null && (
        <div
          className="absolute -top-1 -bottom-1 w-0.5 rounded-sm bg-gray-900"
          style={{ left: `calc(${sollClamped}% - 1px)` }}
          aria-label={`Soll: ${formatPct(sollClamped)}`}
        />
      )}
    </div>
  )
}

// =====================================================
// Coaching „Größter Hebel"
// =====================================================
function CoachingBlock({ items }: { items: CoachingItem[] }) {
  return (
    <div className="coaching-box">
      <p className="text-base font-semibold">🎯 Größter Hebel</p>
      <p className="mt-1">
        Diese {items.length === 1 ? 'Anpassung hat' : 'Anpassungen haben'} den
        größten Einfluss auf deine Pinterest-Strategie:
      </p>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5">
        {items.map((item, i) => (
          <li key={i}>
            {item.recommendation}{' '}
            <span className="text-xs text-amber-800">
              (
              {item.label}: {formatDiff(item.diff)}{' '}
              {item.diff > 0 ? 'über' : 'unter'} Plan)
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function AllInPlanBlock() {
  return (
    <div className="hinweis-box">
      <p className="text-base font-semibold">💡 Strategie im Plan</p>
      <p className="mt-1">
        Deine tatsächliche Pin-Verteilung passt zu deiner geplanten Strategie.
        Konzentriere dich darauf, die Frequenz zu halten und deine Pin-Qualität
        weiter zu verbessern.
      </p>
    </div>
  )
}

// =====================================================
// Format-Helfer
// =====================================================
function formatPct(n: number): string {
  // Eine Nachkommastelle nur wenn nötig.
  const rounded = Math.round(n * 10) / 10
  if (Number.isInteger(rounded)) return `${rounded}%`
  return `${rounded.toFixed(1)}%`
}

function formatDiff(diff: number): string {
  const abs = Math.abs(diff)
  const rounded = Math.round(abs)
  const sign = diff > 0 ? '+' : '−'
  return `${sign}${rounded}%`
}
