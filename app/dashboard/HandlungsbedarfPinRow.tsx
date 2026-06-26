'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { toggleDashboardErledigt } from './actions/dashboard-erledigt'
import {
  produceVariant,
  type VarianteTyp,
} from './actions/handlungsbedarf'
import InfoTooltip from '@/components/InfoTooltip'
import { MerkenButton } from './MerkenButton'
import {
  BOARD_AKTIVITAET_BADGE,
  type BoardBadgeKey,
  type BoardStatus,
} from './analytics/utils'

// Das Pin-Handlungsbedarf-UI zeigt am Board nur noch den AKTIVITÄTS-Status
// (BoardStatus aus utils: aktiv/wenig_aktiv/inaktiv), nicht mehr die alte
// ER-Bewertung. Mapping Status → Badge/Coaching passiert hier, ohne eigene Logik.
export type HandlungsbedarfPin = {
  id: string
  pin_id: string
  titel: string | null
  klicks: number
  impressionen: number
  saves: number
  ctr: number | null
  alterTage: number
  letzterAnalyticsDatum: string
  pinterestUrl: string | null
  boardName: string | null
  // Aktivitäts-Status des zugeordneten Boards (diagnoseBoard:
  // aktiv/wenig_aktiv/inaktiv). null = kein Board zugeordnet.
  boardAktivitaet: BoardStatus | null
}

export type ActionButton =
  | { type: 'variante'; varianteTyp: VarianteTyp; label: string }
  | { type: 'edit'; label: string }

type Metric = {
  label: string
  value: string
  tooltip?: string
}

// Pro Diagnose-Kategorie ein konkreter, handlungsbeschreibender Aufgabentitel
// (nutzt den Pin-Titel). Orientiert sich am jeweiligen Hebel aus dem
// Coaching-Text: Top-Performer → Variante, Hidden Gem → Keywords,
// Reichweite ohne Wirkung → stärkerer Hook, Save-Magnet → Call-to-Action,
// Eingeschlafener Gewinner → neu aufsetzen.
const TODO_TITEL: Record<CoachingKategorie, (titel: string) => string> = {
  aktiver_top_performer: (t) => `Variante von „${t}" erstellen`,
  hidden_gem: (t) => `Keywords für „${t}" schärfen`,
  reichweite_ohne_wirkung: (t) =>
    `Variante von „${t}" mit stärkerem Hook erstellen`,
  save_magnet: (t) => `Variante von „${t}" mit Call-to-Action erstellen`,
  eingeschlafener_gewinner: (t) => `„${t}" neu aufsetzen`,
}

export default function HandlungsbedarfPinRow({
  pin,
  kategorie,
  metrics,
  primaryAction,
  offeneQuelleIds,
  zeigeTodo,
}: {
  pin: HandlungsbedarfPin
  kategorie: string
  metrics: Metric[]
  primaryAction: ActionButton
  offeneQuelleIds: string[]
  // Nur die initial sichtbaren Rows (vor dem „mehr anzeigen"-Toggle) bekommen
  // den „+ To-do"-Button — konsistent zum Keyword-Einsatz.
  zeigeTodo: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [hidden, setHidden] = useState(false)

  function onCheck(e: React.ChangeEvent<HTMLInputElement>) {
    const checked = e.target.checked
    setError(null)
    setHidden(checked)
    startTransition(async () => {
      const r = await toggleDashboardErledigt(
        pin.pin_id,
        kategorie,
        checked
      )
      if (r.error) {
        setError(r.error)
        setHidden(false)
      }
    })
  }

  function onPrimary() {
    if (primaryAction.type !== 'variante') return
    setError(null)
    startTransition(async () => {
      const r = await produceVariant(pin.pin_id, primaryAction.varianteTyp)
      if (r?.error) setError(r.error)
    })
  }

  if (hidden) return null

  const coachingText = coachingHint({
    kategorie,
    pin,
  })

  // „+ To-do": Titel je nach Diagnose-Kategorie, quelleId trägt die Kategorie
  // mit, damit verschiedene Empfehlungen zum selben Pin unterscheidbar bleiben.
  const todoPinTitel = pin.titel?.trim() || '(ohne Titel)'
  const todoTitel = isCoachingKategorie(kategorie)
    ? TODO_TITEL[kategorie](todoPinTitel)
    : `Pin „${todoPinTitel}" überarbeiten`
  const todoQuelleId = `pin:${pin.pin_id}:${kategorie}`

  // Algorithmus-Push (nur Top-Performer-Kategorie) steht ganz vorne in der
  // Metriken-Zeile (Zeile 2); die übrigen Metriken folgen mit · getrennt.
  const pushMetric = metrics.find((m) => m.label === 'Algorithmus-Push')
  const inlineMetrics = metrics.filter((m) => m.label !== 'Algorithmus-Push')

  return (
    <li className="space-y-2.5 rounded-lg border border-gray-200 bg-marke-kachel p-3 text-sm hover:bg-marke-kachel-hover">
      {/* Titelzeile — Pin-Titel links | Abhaken-Checkbox rechts */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 text-[15px] font-semibold text-gray-900">
          {pin.titel ?? <span className="text-gray-400">(ohne Titel)</span>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <label className="flex cursor-pointer items-center gap-1 text-xs text-gray-500">
            erledigt
            <input
              type="checkbox"
              checked={false}
              onChange={onCheck}
              disabled={isPending}
              className="h-4 w-4 cursor-pointer rounded border-gray-300 text-red-600 focus:ring-red-500"
              aria-label="Pin als erledigt markieren"
            />
          </label>
          <InfoTooltip text="Als erledigt abhaken, wenn du die Handlung umgesetzt hast. Der Pin wandert dann nach unten zu den abgeschlossenen." />
        </div>
      </div>

      {/* Coaching-Hinweis (Matrix Pin-Kategorie × Board-Status). Camel-Streifen
          links kennzeichnet ihn als Coaching/Empfehlung — abgesetzt von den
          nüchternen Sachzeilen (Metriken, Board) darunter. Kein weißer Kasten,
          da die Zeile schon in einer grauen Box sitzt. */}
      {coachingText && (
        <p className="border-l-[3px] border-l-marke-ocker pl-3 text-sm leading-relaxed text-haupt">
          {coachingText}
        </p>
      )}

      {/* Metriken (Algorithmus-Push ganz vorne, dann · getrennt) */}
      {(pushMetric || inlineMetrics.length > 0) && (
        <div className="flex flex-wrap items-center gap-y-0.5 text-xs text-gray-500">
          {pushMetric && (
            <span className="inline-flex items-center whitespace-nowrap">
              <span className="mr-1">{pushMetric.label}:</span>
              <span className="mr-1 font-semibold">{pushMetric.value}</span>
              {pushMetric.tooltip && <InfoTooltip text={pushMetric.tooltip} />}
            </span>
          )}
          {inlineMetrics.map((m, i) => (
            <span
              key={m.label}
              className="inline-flex items-center whitespace-nowrap"
            >
              {(i > 0 || pushMetric) && (
                <span aria-hidden className="mx-1.5">
                  ·
                </span>
              )}
              <span className="mr-1 font-semibold">{m.value}</span>
              {m.label}
              {m.tooltip && <InfoTooltip text={m.tooltip} />}
            </span>
          ))}
        </div>
      )}

      {/* Board-Chip + Status-Badge */}
      <BoardLine pin={pin} />

      {/* Aktions-Buttons — eigene Zeile unten, linksbündig, umbrechend */}
      <div className="flex flex-wrap items-center gap-2">
        {primaryAction.type === 'variante' ? (
          <button
            type="button"
            onClick={onPrimary}
            disabled={isPending}
            className="rounded-md bg-marke-blaugrau px-3 py-1 text-xs font-medium text-white hover:bg-marke-blaugrau-dunkel disabled:opacity-50"
          >
            {isPending ? 'Lädt…' : primaryAction.label}
          </button>
        ) : (
          <Link
            href={`/dashboard/pin-produktion?edit=${pin.pin_id}`}
            className="rounded-md bg-marke-blaugrau px-3 py-1 text-xs font-medium text-white hover:bg-marke-blaugrau-dunkel"
          >
            {primaryAction.label}
          </Link>
        )}
        <Link
          href={`/dashboard/pin-produktion?edit=${pin.pin_id}`}
          className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Pin anschauen
        </Link>
        {pin.pinterestUrl && (
          <a
            href={pin.pinterestUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Zum Pin bei Pinterest ↗
          </a>
        )}
        {zeigeTodo && (
          <MerkenButton
            titel={todoTitel}
            faelligkeitsdatum={null}
            quelle="empfehlung"
            quelleId={todoQuelleId}
            bereitsGemerkt={offeneQuelleIds.includes(todoQuelleId)}
          />
        )}
      </div>

      {error && <div className="text-xs text-red-700">{error}</div>}
    </li>
  )
}

function BoardLine({ pin }: { pin: HandlungsbedarfPin }) {
  // Aktivität braucht keine Analytics — das alte „(keine Analytics)"-Gate
  // entfällt. „Kein Board zugeordnet" bei fehlendem Namen ODER fehlender
  // Aktivität (null/undefined, z.B. solange page.tsx den Wert noch nicht liefert).
  const aktivitaet = pin.boardAktivitaet ?? null
  if (!pin.boardName || !aktivitaet) {
    return (
      <div className="mt-0.5 truncate text-xs text-gray-400">
        Kein Board zugeordnet
      </div>
    )
  }
  // Pin-Row kennt nur den Aktivitätsstatus (keine Reichweite-Daten) → 'inaktiv'
  // wird hier als „Eingeschlafenes Board" gezeigt. Zentrale Badge-Map (utils.ts).
  const badgeKey: BoardBadgeKey =
    aktivitaet === 'inaktiv' ? 'eingeschlafen' : aktivitaet
  const badge = BOARD_AKTIVITAET_BADGE[badgeKey]
  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
      <span>Board:</span>
      <span className="font-medium text-gray-700">{pin.boardName}</span>
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}
      >
        {badge.text}
      </span>
    </div>
  )
}

// Coaching-Matrix: Pin-Kategorie × Board-Status → genau ein Hinweistext.
// 'kein' deckt alle Fälle ab, in denen das Board fehlt oder keine Analytics
// hat (Fallback ohne Board-Bezug).
type CoachingKategorie =
  | 'aktiver_top_performer'
  | 'hidden_gem'
  | 'reichweite_ohne_wirkung'
  | 'eingeschlafener_gewinner'
  | 'save_magnet'

type BoardKey = 'aktiv' | 'wenig_aktiv' | 'inaktiv' | 'kein'

const COACHING_MATRIX: Record<
  CoachingKategorie,
  Record<BoardKey, string>
> = {
  aktiver_top_performer: {
    aktiv:
      'Dieser Pin läuft stark. Halte ihn am Leben, indem du regelmäßig frische Varianten mit demselben Thema erstellst, und schau dir an, was ihn erfolgreich macht, um es auf andere Pins zu übertragen.',
    wenig_aktiv:
      'Dieser Pin läuft stark. Halte ihn am Leben, indem du regelmäßig frische Varianten mit demselben Thema erstellst, und schau dir an, was ihn erfolgreich macht, um es auf andere Pins zu übertragen.',
    inaktiv:
      'Dieser Pin läuft stark, das Board ist aber eingeschlafen. Reaktiviere es mit 3 bis 5 neuen Pins pro Woche, damit der Erfolg dieses Pins nicht allein steht.',
    kein: 'Dieser Pin läuft stark, ist aber keinem Board zugeordnet. Ordne ihn einem thematisch passenden Board zu, damit Pinterest ihn klarer einordnet.',
  },
  hidden_gem: {
    aktiv:
      'Dieser Pin überzeugt die wenigen, die ihn sehen, wird aber kaum ausgespielt. Erstelle einen neuen Pin mit stärkeren Keywords in Titel und Beschreibung, damit er häufiger in der Suche auftaucht.',
    wenig_aktiv:
      'Dieser Pin überzeugt die wenigen, die ihn sehen, wird aber kaum ausgespielt. Erstelle einen neuen Pin mit stärkeren Keywords in Titel und Beschreibung, damit er häufiger in der Suche auftaucht.',
    inaktiv:
      'Dieser Pin überzeugt die wenigen, die ihn sehen, wird aber kaum ausgespielt. Das Board ist außerdem eingeschlafen. Reaktiviere es mit 2 bis 3 neuen Pins pro Woche und schärfe die Keywords dieses Pins in Titel und Beschreibung.',
    kein: 'Dieser Pin überzeugt die wenigen, die ihn sehen, ist aber keinem Board zugeordnet. Ordne ihn einem passenden Board zu und schärfe die Keywords in Titel und Beschreibung, damit er gefunden wird.',
  },
  reichweite_ohne_wirkung: {
    aktiv:
      'Dieser Pin bekommt Reichweite, wird aber kaum geklickt. Erstelle einen neuen Pin mit gleichem Thema, aber stärkerem Hook und anderem Bild.',
    wenig_aktiv:
      'Dieser Pin bekommt Reichweite, wird aber kaum geklickt. Erstelle einen neuen Pin mit gleichem Thema, aber stärkerem Hook und anderem Bild.',
    inaktiv:
      'Dieser Pin bekommt Reichweite, wird aber kaum geklickt. Das Board ist außerdem eingeschlafen. Reaktiviere es mit regelmäßigen Pins und überarbeite parallel Hook und Bild dieses Pins.',
    kein: 'Dieser Pin bekommt Reichweite, wird aber kaum geklickt und hat kein Board. Ordne ihn einem passenden Board zu und erstelle eine Variante mit stärkerem Hook und anderem Bild.',
  },
  save_magnet: {
    aktiv:
      'Dieser Pin wird gern gespeichert, aber selten zur Website geklickt. Das Speichern zeigt, das Thema zieht. Erstelle einen neuen Pin mit klarem Call to Action, damit aus dem Interesse auch Website-Besuche werden.',
    wenig_aktiv:
      'Dieser Pin wird gern gespeichert, aber selten zur Website geklickt. Das Speichern zeigt, das Thema zieht. Erstelle einen neuen Pin mit klarem Call to Action, damit aus dem Interesse auch Website-Besuche werden.',
    inaktiv:
      'Dieser Pin wird gern gespeichert, aber selten zur Website geklickt. Das Board ist außerdem eingeschlafen. Reaktiviere es mit neuen Pins und gib diesem Pin in einer Variante einen klaren Call to Action.',
    kein: 'Dieser Pin wird gern gespeichert, aber selten zur Website geklickt und hat kein Board. Ordne ihn einem passenden Board zu und erstelle eine Variante mit klarem Call to Action.',
  },
  eingeschlafener_gewinner: {
    aktiv:
      'Dieser Pin lief schon mal gut, ist jetzt abgeflaut. Setze ihn frisch auf, mit demselben Thema, aber neuem Bild und überarbeitetem Titel, damit er wieder Fahrt aufnimmt.',
    wenig_aktiv:
      'Dieser Pin lief schon mal gut, ist jetzt abgeflaut. Setze ihn frisch auf, mit demselben Thema, aber neuem Bild und überarbeitetem Titel, damit er wieder Fahrt aufnimmt.',
    inaktiv:
      'Dieser Pin lief schon mal gut, ist jetzt abgeflaut. Auch das Board ist eingeschlafen. Reaktiviere es mit regelmäßigen Pins und setze diesen Gewinner mit frischem Bild neu auf.',
    kein: 'Dieser Pin lief schon mal gut, ist jetzt abgeflaut und hat kein Board. Ordne ihn einem passenden Board zu und setze ihn mit frischem Bild und neuem Titel neu auf.',
  },
}

function boardKeyFor(pin: HandlungsbedarfPin): BoardKey {
  // Aktivitäts-Status → Matrix-Spalte. Kein Board / noch keine Aktivität → 'kein'.
  if (!pin.boardName) return 'kein'
  return pin.boardAktivitaet ?? 'kein'
}

function isCoachingKategorie(k: string): k is CoachingKategorie {
  return (
    k === 'aktiver_top_performer' ||
    k === 'hidden_gem' ||
    k === 'reichweite_ohne_wirkung' ||
    k === 'eingeschlafener_gewinner' ||
    k === 'save_magnet'
  )
}

function coachingHint({
  kategorie,
  pin,
}: {
  kategorie: string
  pin: HandlungsbedarfPin
}): string | null {
  if (!isCoachingKategorie(kategorie)) return null
  return COACHING_MATRIX[kategorie][boardKeyFor(pin)]
}

