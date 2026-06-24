'use client'

// Phasen-Navigation: Scroll-Spy + Pfad-Linie mit Phasen-Pillen als Stationen.
// Scroll-Container ist das <main> (overflow-y-auto) im dashboard/layout.tsx,
// NICHT window — der Spy hört auf dieses Element.
//
// Client/Server-Schnitt: Nur die Spur-Logik ist Client. PhasenNavigation hält
// die aktive Phase (1–4) + Sichtbarkeit der Mini-Leiste und stellt die aktive
// Phase per Context bereit; PhaseSpur liest den Status und zeichnet Linie +
// Pille. Phasen-Header (Leitfrage + Vorschau) und Module bleiben Server-
// Komponenten und werden als `children` durchgereicht.

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

// Vertikale Position der Stationen (= Mitte der Phasen-Pille) und zugleich
// Endpunkt der Linienfüllung. Phase 01 hat kleineren Header-Abstand (mt-8),
// daher sitzt ihre Pille höher als die übrigen (mt-16).
const PILL_STATION_NORMAL = '76px'
const PILL_STATION_ERSTE = '44px'

// Inaktive Linie: warmer, sehr dezenter Ton (marke-ocker @35%), spürbar dunkler
// als der Seitenhintergrund (marke-creme), aber ruhig.
const LINIE_INAKTIV = 'rgba(184, 144, 102, 0.35)'
// Gefüllte Linie + aktive Pille: einfarbig Blaugrau — eine ruhige Farbsprache,
// keine Ampelfarbe.
const LINIE_AKTIV = 'var(--marke-blaugrau)'

// Anteil der sichtbaren Höhe (von oben), ab dem eine Phase als aktiv gilt.
// 0.66 = unteres Drittel (frühe Einfärbung). Die Mini-Leisten-Sichtbarkeit
// hängt an einer eigenen Bedingung und bleibt davon unberührt.
const SPY_SCHWELLE_ANTEIL = 0.66

type PhaseInfo = { ziffer: string; frage: string }
type PhaseStatus = 'aktiv' | 'erledigt' | 'kommend'

const AktivePhaseContext = createContext<number>(1)

export function PhasenNavigation({
  phasen,
  children,
}: {
  phasen: PhaseInfo[]
  children: ReactNode
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [aktiv, setAktiv] = useState(1)
  const [leisteSichtbar, setLeisteSichtbar] = useState(false)

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const scrollRoot = wrapper.closest('main')
    if (!scrollRoot) return

    let ticking = false
    const recompute = () => {
      ticking = false
      const rootTop = scrollRoot.getBoundingClientRect().top
      const schwelle = rootTop + scrollRoot.clientHeight * SPY_SCHWELLE_ANTEIL
      let current = 1
      for (let n = 1; n <= 4; n++) {
        const el = document.getElementById(`phase-${n}`)
        if (!el) continue
        if (el.getBoundingClientRect().top <= schwelle) current = n
      }
      setAktiv((prev) => (prev === current ? prev : current))
      const aktivEl = document.getElementById(`phase-${current}`)
      const sichtbar = !!aktivEl && aktivEl.getBoundingClientRect().top < rootTop
      setLeisteSichtbar((prev) => (prev === sichtbar ? prev : sichtbar))
    }
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(recompute)
    }

    recompute()
    scrollRoot.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      scrollRoot.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const aktivePhase = phasen[aktiv - 1]

  return (
    <AktivePhaseContext.Provider value={aktiv}>
      <div ref={wrapperRef}>
        {/* Sticky-Mini-Leiste: schmaler Kontext-Streifen oben im Content.
            Negative Bottom-Margin (-mb-10) hebt die Flusshöhe auf → kein
            Layout-Sprung; versteckt transparent + nicht klickbar. */}
        <div
          aria-hidden={!leisteSichtbar}
          className={`sticky top-0 z-20 -mb-10 flex h-10 items-center gap-2 border-b border-marke-blaugrau-hell px-1 backdrop-blur transition-all duration-200 ease-out ${
            leisteSichtbar
              ? 'translate-y-0 opacity-100'
              : 'pointer-events-none -translate-y-1 opacity-0'
          }`}
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.92)' }}
        >
          {aktivePhase && (
            <>
              <span
                className="text-[14px] font-semibold text-haupt"
                style={{ fontFamily: 'var(--font-space-grotesk)' }}
              >
                {aktivePhase.ziffer}
              </span>
              <span className="text-marke-blaugrau-mittel">·</span>
              <span className="font-serif text-[14px] text-haupt">
                {aktivePhase.frage}
              </span>
            </>
          )}
        </div>
        {children}
      </div>
    </AktivePhaseContext.Provider>
  )
}

function scrollToPhase(nummer: number) {
  document
    .getElementById(`phase-${nummer}`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Phasen-Pille (= Station auf der Linie). Drei Zustände, alle in Blaugrau,
// keine Ampelfarbe. Klick scrollt sanft zur Phase. Auf Desktop (>=900px) per
// negativer Margin nach links auf die Linie angedockt; darunter steht sie als
// schlichte Label-Pille am Header (keine Linie).
function PhasePille({
  nummer,
  status,
  onClick,
}: {
  nummer: number
  status: PhaseStatus
  onClick: () => void
}) {
  // Alle Zustände tragen border-2, damit die Pille beim Zustandswechsel nicht
  // in der Größe springt. Camel (marke-ocker) gehört an die KOMMENDEN Pillen
  // (Outline + Text); aktiv/erledigt sind gefüllt mit transparentem Rand.
  const stil =
    status === 'aktiv'
      ? 'border-2 border-transparent bg-marke-blaugrau text-white shadow-sm'
      : status === 'erledigt'
        ? 'border-2 border-transparent bg-marke-blaugrau-mittel text-white'
        : 'border-2 border-marke-ocker bg-white/70 text-marke-ocker'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Zu Phase ${nummer} springen`}
      className={`inline-flex cursor-pointer items-center rounded-full px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] transition-all duration-200 ease-out hover:opacity-90 ${stil}`}
      style={{ fontFamily: 'var(--font-space-grotesk)' }}
    >
      Phase {String(nummer).padStart(2, '0')}
    </button>
  )
}

export function PhaseSpur({
  nummer,
  position,
  children,
}: {
  nummer: number
  position: 'erste' | 'mitte' | 'letzte'
  children: ReactNode
}) {
  const aktiv = useContext(AktivePhaseContext)
  const status: PhaseStatus =
    nummer === aktiv ? 'aktiv' : nummer < aktiv ? 'erledigt' : 'kommend'

  const station =
    position === 'erste' ? PILL_STATION_ERSTE : PILL_STATION_NORMAL
  // Phase 01 startet näher am Banner (mt-8), die übrigen trennen die Phasen
  // mit großem Abstand (mt-16). Liegt auf der Content-Spalte, damit Linie und
  // Pille gemeinsam mitwandern.
  const topMargin =
    position === 'erste' ? 'mt-8' : 'mt-16 max-[599px]:mt-10'

  // Basis-Linie (warm), Geometrie je nach Position; Stationen = Pillen-Mitte.
  const basisStyle: CSSProperties =
    position === 'erste'
      ? { top: station, bottom: 0 }
      : position === 'letzte'
        ? { top: 0, height: station }
        : { top: 0, bottom: 0 }

  // Füllung: oberhalb der aktiven Phase voll, in der aktiven Phase bis zur
  // Stationsmitte. Einfarbig Blaugrau (keine Ampelfarbe).
  let fuellStyle: CSSProperties | null = null
  if (nummer < aktiv) {
    fuellStyle = { ...basisStyle, background: LINIE_AKTIV }
  } else if (nummer === aktiv && position !== 'erste') {
    fuellStyle = { top: 0, height: station, background: LINIE_AKTIV }
  }

  // Kurzer Konnektor von der vertikalen Linie zur Pille (auf Stationshöhe).
  // Erreichte Stationen (aktiv/erledigt) tragen den gefüllten Blaugrau-Ton,
  // kommende den warmen inaktiven Ton — konsistent mit der Linie.
  const konnektorFarbe = status === 'kommend' ? LINIE_INAKTIV : LINIE_AKTIV

  return (
    <div className="grid grid-cols-1 gap-0 min-[900px]:grid-cols-[32px_1fr] min-[900px]:gap-5">
      {/* Pfad-Linie (nur >=900px); die Pillen docken links an. */}
      <div className="relative hidden min-[900px]:block">
        <span
          aria-hidden
          className="absolute left-1/2 w-0.5 -translate-x-1/2"
          style={{ ...basisStyle, backgroundColor: LINIE_INAKTIV }}
        />
        {fuellStyle && (
          <span
            aria-hidden
            className="absolute left-1/2 w-0.5 -translate-x-1/2 transition-all duration-200 ease-out"
            style={fuellStyle}
          />
        )}
        {/* Konnektor: von der Linienmitte (16px) bis zur linken Pillenkante
            (Inhaltsspalte bei 32px Spur + 20px Gap = 52px), auf Stationshöhe. */}
        <span
          aria-hidden
          className="absolute left-1/2 h-0.5 -translate-y-1/2 transition-all duration-200 ease-out"
          style={{ top: station, width: '36px', backgroundColor: konnektorFarbe }}
        />
      </div>
      <div id={`phase-${nummer}`} className={`min-w-0 scroll-mt-6 ${topMargin}`}>
        <PhasePille
          nummer={nummer}
          status={status}
          onClick={() => scrollToPhase(nummer)}
        />
        <div className="mt-3 space-y-8">{children}</div>
      </div>
    </div>
  )
}
