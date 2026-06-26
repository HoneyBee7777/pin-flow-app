// Phase B — Anzeige des neuen Strategie-Checks (V2).
// Reine Darstellung des von computeStrategieCheckV2 berechneten Ergebnisses.
// Drei Bereiche: Zielflächen-Vergleich, Pinning-Frequenz, Content-Säulen.

import Link from 'next/link'
import type { ReactNode } from 'react'
import { StatusDot, type StatusTone } from '@/components/StatusDot'
import { MerkenButton } from '../MerkenButton'
import { PINNING_FREQUENZ_OPTIONS } from '../strategie/lib'
import type {
  AbweichungStatus,
  FrequenzCheck,
  SaeulenCheck,
  StrategieCheckV2,
  ZielflaecheCheckItem,
  ZielflaechenCheck,
} from './lib'

// Per-Item-Abweichung (Zielflächen): Textfarbe + Balkenfarbe über status-Tokens
// statt lokaler green/yellow/red-Werte.
const ABWEICHUNG_TEXT_CLS: Record<AbweichungStatus, string> = {
  im_plan: 'text-status-gut-text',
  leicht_daneben: 'text-status-achtung-text',
  deutlich_daneben: 'text-status-schlecht-text',
}

const ABWEICHUNG_BAR_HEX: Record<AbweichungStatus, string> = {
  im_plan: 'var(--status-gut)',
  leicht_daneben: 'var(--status-achtung)',
  deutlich_daneben: 'var(--status-schlecht)',
}

// Ampel-System: ein Zustand je Bereich, abgebildet auf die einheitlichen
// Status-Töne (StatusDot/status-Tokens).
type Ampel = 'gruen' | 'gelb' | 'rot' | 'grau'

const AMPEL_TONE: Record<Ampel, StatusTone> = {
  gruen: 'gut',
  gelb: 'achtung',
  rot: 'schlecht',
  grau: 'neutral',
}

// Pin-Ziel-Verteilung: die schlimmste Einzelabweichung bestimmt die Farbe.
// Ohne zugeordnete Pins oder ohne festgelegte Verteilung: grau.
function zielflaechenAmpel(z: ZielflaechenCheck): Ampel {
  if (!z.hatSoll || !z.hatDaten) return 'grau'
  if (z.items.some((i) => i.status === 'deutlich_daneben')) return 'rot'
  if (z.items.some((i) => i.status === 'leicht_daneben')) return 'gelb'
  return 'gruen'
}

// Pinning-Rhythmus: im Rhythmus grün, knapp drüber/drunter gelb, deutlich
// drüber/drunter rot, ohne festgelegten Rhythmus grau. Die „weit daneben"-
// Schwelle entspricht der Logik in ableitenGesamtStatus.
function frequenzAmpel(f: FrequenzCheck): Ampel {
  if (f.lage === 'unbekannt' || f.sollFrequenz === null) return 'grau'
  if (f.lage === 'im_korridor') return 'gruen'
  const weitDaneben =
    (f.sollMinProMonat !== null && f.istProMonat < f.sollMinProMonat / 2) ||
    (f.sollMaxProMonat !== null && f.istProMonat > f.sollMaxProMonat * 1.5)
  return weitDaneben ? 'rot' : 'gelb'
}

// Content-Säulen: alle aktiv grün, einige vernachlässigt gelb, die meisten
// oder alle vernachlässigt rot, ohne Säulen grau.
function saeulenAmpel(s: SaeulenCheck): Ampel {
  if (!s.hatSaeulen) return 'grau'
  if (s.vernachlaessigtAnzahl === 0) return 'gruen'
  if (s.aktiveAnzahl === 0 || s.vernachlaessigtAnzahl > s.aktiveAnzahl)
    return 'rot'
  return 'gelb'
}

// Kurzer Status-Satz: flacher Punkt + Text einheitlich in Blaugrau (text-haupt),
// nicht in der Signalfarbe. Spacing steuert der Eltern-Container.
function StatusSatz({
  ampel,
  children,
}: {
  ampel: Ampel
  children: ReactNode
}) {
  return (
    <p className="flex items-start gap-2 text-sm font-medium text-haupt">
      <StatusDot tone={AMPEL_TONE[ampel]} />
      <span>{children}</span>
    </p>
  )
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n))
}

function abweichungText(item: ZielflaecheCheckItem): string {
  if (item.status === 'im_plan') return 'Im Plan'
  const richtung = item.diff > 0 ? 'über Plan' : 'unter Plan'
  const abs = Math.abs(Math.round(item.diff))
  return item.status === 'deutlich_daneben'
    ? `${abs} Prozentpunkte deutlich ${richtung}`
    : `${abs} Prozentpunkte ${richtung}`
}

export default function StrategieCheckSection({
  result,
  offeneQuelleIds,
}: {
  result: StrategieCheckV2
  offeneQuelleIds: string[]
}) {
  return (
    <section id="strategie-check" className="scroll-mt-4">
      {/* Sektions-Überschrift (v2): Hierarchie über Schrift + Weißraum, keine
          Trennlinie. text-xl Blaugrau; der Abstand davor kommt aus dem
          space-y-8 des Seiten-Wrappers. */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-marke-blaugrau">
          Strategie-Check
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Vergleicht deine Pin-Arbeit der letzten {result.fensterTage} Tage mit
          deiner festgelegten Strategie.
        </p>
      </div>

      {result.pinsImFenster === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed text-gray-600">
          Noch keine Pins im Auswertungszeitraum. Sobald du Pins erstellst,
          siehst du hier, ob deine Arbeit zu deiner Strategie passt.
        </div>
      ) : (
        <div className="space-y-3">
          <ZielflaechenCard result={result} offeneQuelleIds={offeneQuelleIds} />
          <FrequenzCard result={result} />
          <SaeulenCard result={result} offeneQuelleIds={offeneQuelleIds} />
        </div>
      )}
    </section>
  )
}

// =====================================================
// Bereich 1: Zielflächen-Vergleich
// =====================================================
function ZielflaechenCard({
  result,
  offeneQuelleIds,
}: {
  result: StrategieCheckV2
  offeneQuelleIds: string[]
}) {
  const z = result.zielflaechen
  const amp = zielflaechenAmpel(z)
  // Handlungsbedarf = es gibt Daten und mindestens eine Fläche weicht ab.
  // zielflaechenAmpel liefert nur dann gelb/rot (grau bei fehlendem Soll/Daten,
  // grün wenn alles im Plan) — also ist gelb/rot der saubere Trigger.
  const zielHandlungsbedarf = amp === 'gelb' || amp === 'rot'
  const zielQuelleId = 'zielflaechen:zuordnen'
  return (
    <Card
      title="Pin-Ziel-Verteilung"
      subtitle="Wohin deine Pins die Menschen führen"
    >
      {!z.hatSoll ? (
        <Hinweis>
          Du hast noch keine Pin-Ziel-Verteilung festgelegt.{' '}
          →{' '}
          <Link
            href="/dashboard/strategie?tab=meine"
            className="font-medium text-link underline"
          >
            Strategie festlegen
          </Link>
        </Hinweis>
      ) : !z.hatDaten ? (
        <StatusSatz ampel="grau">
          Noch keine Daten. Ordne deinen Pins ein Pin-Ziel zu, damit dieser
          Vergleich entsteht.
        </StatusSatz>
      ) : (
        <div className="space-y-4">
          <StatusSatz ampel={amp}>
            {amp === 'gruen'
              ? 'Im Plan. Deine Pins verteilen sich wie geplant auf deine Pin-Ziele.'
              : 'Abweichung vom Plan. Einige Pin-Ziele bekommen mehr oder weniger Pins als geplant. Prüfe die markierten Flächen unten.'}
          </StatusSatz>
          {zielHandlungsbedarf && (
            <MerkenButton
              titel="Pins ihren Zielen zuordnen"
              faelligkeitsdatum={null}
              quelle="empfehlung"
              quelleId={zielQuelleId}
              bereitsGemerkt={offeneQuelleIds.includes(zielQuelleId)}
            />
          )}
          {z.items.map((item) => (
            <div key={item.flaeche}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <span className="font-medium text-gray-700">{item.label}</span>
                <span className="tabular-nums text-gray-900">
                  Ist {item.ist}% · Soll {item.soll}%
                </span>
              </div>
              <div className="relative mt-1 h-2.5 w-full overflow-visible rounded-full bg-gray-200">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${clamp(item.ist)}%`,
                    backgroundColor: ABWEICHUNG_BAR_HEX[item.status],
                  }}
                />
                <div
                  className="absolute -bottom-1 -top-1 w-0.5 rounded-sm bg-gray-900"
                  style={{ left: `calc(${clamp(item.soll)}% - 1px)` }}
                  aria-label={`Soll: ${item.soll}%`}
                />
              </div>
              <p
                className={`mt-1 text-xs font-medium ${ABWEICHUNG_TEXT_CLS[item.status]}`}
              >
                {abweichungText(item)}
              </p>
            </div>
          ))}
        </div>
      )}

      {result.pinsGesamtOhneZuordnung > 0 && (
        <div className="mt-4">
          <Hinweis>
            Von deinen insgesamt {result.pinsGesamtAlle} Pins haben erst{' '}
            {result.pinsGesamtAlle - result.pinsGesamtOhneZuordnung} ein
            Pin-Ziel.
            {z.pinsOhneZuordnung > 0
              ? ` In den letzten ${result.fensterTage} Tagen sind ${z.pinsOhneZuordnung} ${
                  z.pinsOhneZuordnung === 1 ? 'Pin' : 'Pins'
                } ohne Zuordnung.`
              : ''}{' '}
            Verknüpfe deine Pins in der{' '}
            <Link
              href="/dashboard/pin-produktion?filter=ohne-url"
              className="font-medium text-link underline"
            >
              Pin-Produktion
            </Link>{' '}
            mit einer Ziel-URL, damit dein Strategie-Bild vollständig wird.
            Pins, deren URL noch kein Pin-Ziel hat, ergänzt du in der{' '}
            <Link
              href="/dashboard/ziel-urls?filter=ohne-zielflaeche"
              className="font-medium text-link underline"
            >
              Ziel-URL-Datenbank
            </Link>
            .
          </Hinweis>
        </div>
      )}
    </Card>
  )
}

// =====================================================
// Bereich 2: Pinning-Frequenz
// =====================================================
function FrequenzCard({ result }: { result: StrategieCheckV2 }) {
  const f = result.frequenz
  const amp = frequenzAmpel(f)
  const beschreibung = f.sollFrequenz
    ? (PINNING_FREQUENZ_OPTIONS.find((o) => o.value === f.sollFrequenz)
        ?.beschreibung ?? null)
    : null

  // Ist-Tagesschnitt: Pins der letzten 30 Tage auf den Tag normiert, eine
  // Nachkommastelle, deutsches Dezimalkomma.
  const istProTag = (f.istProMonat / 30).toFixed(1).replace('.', ',')

  let statusSatz: string
  if (f.lage === 'ueber') {
    statusSatz =
      'Über deinem Plan. Du pinnst mehr als vorgenommen, das ist in Ordnung solange die Qualität stimmt.'
  } else if (f.lage === 'unter') {
    statusSatz = `Unter deinem Plan. Du hast ${f.istProMonat} Pins pro Monat erstellt, geplant waren ${f.sollMinProMonat} bis ${f.sollMaxProMonat} pro Monat. Plane mehr Pins ein, um auf deinen Rhythmus zu kommen.`
  } else {
    statusSatz = 'Im Plan. Du pinnst so regelmäßig wie vorgenommen.'
  }

  return (
    <Card
      title="Pinning-Frequenz"
      subtitle="Wie regelmäßig du neue Pins erstellst"
    >
      {f.sollFrequenz === null ? (
        <Hinweis>
          Du hast noch keinen Pinning-Rhythmus festgelegt.{' '}
          →{' '}
          <Link
            href="/dashboard/strategie?tab=meine"
            className="font-medium text-link underline"
          >
            Strategie festlegen
          </Link>
        </Hinweis>
      ) : (
        <div className="space-y-3 text-sm">
          <StatusSatz ampel={amp}>{statusSatz}</StatusSatz>
          <p className="text-gray-700">
            Geplant:{' '}
            <span className="font-semibold text-gray-900">
              {beschreibung ?? `${f.sollLabel}`}
            </span>{' '}
            <span className="text-gray-500">
              ({f.sollMinProMonat} bis {f.sollMaxProMonat} pro Monat)
            </span>
          </p>
          <p className="text-gray-700">
            Tatsächlich:{' '}
            <span className="font-semibold text-gray-900">
              {istProTag} Pins pro Tag
            </span>{' '}
            <span className="text-gray-500">
              ({f.istProMonat} Pins pro Monat)
            </span>
          </p>
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        Gezählt werden die in Pin-Flow erfassten Pins der letzten{' '}
        {result.fensterTage} Tage. Wenn du Pins extern planst, erfasse sie hier,
        damit die Auswertung stimmt.
      </p>
    </Card>
  )
}

// =====================================================
// Bereich 3: Content-Säulen
// =====================================================
function SaeulenCard({
  result,
  offeneQuelleIds,
}: {
  result: StrategieCheckV2
  offeneQuelleIds: string[]
}) {
  const s = result.saeulen
  const amp = saeulenAmpel(s)
  const gesamt = s.aktiveAnzahl + s.vernachlaessigtAnzahl
  return (
    <Card
      title="Content-Säulen"
      subtitle="Welche deiner Themen-Schwerpunkte neue Pins bekommen"
    >
      {!s.hatSaeulen ? (
        <Hinweis>
          Deine Content-Säulen entstehen aus den Kategorien deiner Boards und
          werden im Strategie-Setup bestätigt.{' '}
          →{' '}
          <Link
            href="/dashboard/strategie?tab=meine"
            className="font-medium text-link underline"
          >
            Strategie festlegen
          </Link>
        </Hinweis>
      ) : (
        <div className="space-y-3">
          <StatusSatz ampel={amp}>
            {amp === 'gruen'
              ? 'Im Plan. Alle deine Themen-Schwerpunkte bekommen neue Pins.'
              : `${s.aktiveAnzahl} von ${gesamt} Schwerpunkten bekommen neue Pins. Bespiele auch die übrigen, damit Pinterest dein Profil klar einordnet.`}
          </StatusSatz>
          <ul className="space-y-2 text-sm">
          {s.items.map((item) => {
            const quelleId = `saeule:${item.saeule.trim().toLowerCase()}`
            return (
            <li key={item.saeule} className="flex items-center gap-3">
              <StatusDot tone={item.aktiv ? 'gut' : 'neutral'} />
              <span className="flex-1 text-gray-900">{item.saeule}</span>
              <span
                className={`text-xs ${
                  item.aktiv ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                {item.aktiv
                  ? `${item.pins} ${item.pins === 1 ? 'neuer Pin' : 'neue Pins'}`
                  : 'keine neuen Pins'}
              </span>
              {!item.aktiv && (
                <MerkenButton
                  titel={`Pins für Säule „${item.saeule}" erstellen`}
                  faelligkeitsdatum={null}
                  quelle="empfehlung"
                  quelleId={quelleId}
                  bereitsGemerkt={offeneQuelleIds.includes(quelleId)}
                />
              )}
            </li>
            )
          })}
          </ul>
        </div>
      )}
    </Card>
  )
}

// =====================================================
// Hilfs-Komponenten
// =====================================================
function Card({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </div>
  )
}

function Hinweis({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm leading-relaxed text-gray-600">
      {children}
    </div>
  )
}
