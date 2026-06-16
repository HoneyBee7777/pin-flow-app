// V3.4 — FAQ-Accordion + leichtgewichtiger Markdown-Renderer.
// V3.4.1 — Render-Bug-Fix: (1) Inline-Links werden jetzt auch INNERHALB
// von **fett** geparst (rekursiv), (2) Listen werden zeilenweise gruppiert
// — eine Liste direkt nach einer Überschrift-/fett-Zeile (ohne Leerzeile)
// wird korrekt als <ul>/<ol> gerendert statt als Inline-Absatz.
//
// Reine Server-Komponente (kein State nötig): natives <details>/<summary>
// — mehrere Toggles können unabhängig offen sein, Pfeil ▸/▾ wechselt per
// CSS (group-open). Optik konsistent zum Accordion in der „Strategie &
// Ausrichtung"-Sektion (StrategieClient.tsx).
//
// Der Markdown-Renderer deckt genau das ab, was lib/faq-content.ts nutzt:
// Absätze (Leerzeile getrennt), nummerierte Listen (`1. `), Aufzählungen
// (`- `), inline **fett** und [Link](/pfad). Interne Pfade → Next-Link,
// externe (http) → neues Tab.

import type { ReactNode } from 'react'
import Link from 'next/link'
import type { FaqItem } from '@/lib/faq-content'

// Inline: **fett** und [label](href). Rekursiv — der Inhalt einer
// **…**-Phrase wird erneut durch renderInline geschickt, damit Links
// (und ggf. weitere Marker) auch innerhalb fetter Phrasen funktionieren.
function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const regex = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[1] !== undefined) {
      nodes.push(
        <strong key={`${keyBase}-b${i}`} className="font-semibold">
          {renderInline(m[1], `${keyBase}-b${i}`)}
        </strong>
      )
    } else {
      const label = m[2]
      const href = m[3]
      const isInternal = href.startsWith('/')
      nodes.push(
        isInternal ? (
          <Link
            key={`${keyBase}-l${i}`}
            href={href}
            className="font-medium text-red-600 hover:underline"
          >
            {label}
          </Link>
        ) : (
          <a
            key={`${keyBase}-l${i}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-red-600 hover:underline"
          >
            {label}
          </a>
        )
      )
    }
    last = regex.lastIndex
    i++
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

const BULLET_RE = /^-\s+/
const ORDERED_RE = /^(\d+)\.\s+/

// Block-Ebene: ein Block (durch Leerzeile getrennt) wird ZEILENWEISE
// durchlaufen. Aufeinanderfolgende `- `-Zeilen werden zu <ul>,
// aufeinanderfolgende `N. `-Zeilen zu <ol> (mit korrektem Start-Index,
// damit über mehrere Teil-Listen hinweg fortlaufend nummeriert wird),
// alle übrigen Zeilen zu einem Absatz zusammengefasst.
function renderBlock(block: string, bi: number): ReactNode[] {
  const lines = block
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const out: ReactNode[] = []
  let para: string[] = []
  let bullets: string[] = []
  let ordered: { num: number; text: string }[] = []

  const flushPara = () => {
    if (para.length === 0) return
    const key = `${bi}-p${out.length}`
    out.push(
      <p key={key} className="leading-relaxed">
        {renderInline(para.join(' '), key)}
      </p>
    )
    para = []
  }
  const flushBullets = () => {
    if (bullets.length === 0) return
    const key = `${bi}-u${out.length}`
    const items = bullets
    out.push(
      <ul key={key} className="list-disc space-y-1 pl-5">
        {items.map((t, li) => (
          <li key={li}>{renderInline(t, `${key}-${li}`)}</li>
        ))}
      </ul>
    )
    bullets = []
  }
  const flushOrdered = () => {
    if (ordered.length === 0) return
    const key = `${bi}-o${out.length}`
    const items = ordered
    out.push(
      <ol
        key={key}
        start={items[0].num}
        className="list-decimal space-y-1 pl-5"
      >
        {items.map((it, li) => (
          <li key={li}>{renderInline(it.text, `${key}-${li}`)}</li>
        ))}
      </ol>
    )
    ordered = []
  }

  for (const line of lines) {
    const om = line.match(ORDERED_RE)
    if (BULLET_RE.test(line)) {
      flushPara()
      flushOrdered()
      bullets.push(line.replace(BULLET_RE, ''))
    } else if (om) {
      flushPara()
      flushBullets()
      ordered.push({
        num: Number(om[1]),
        text: line.replace(ORDERED_RE, ''),
      })
    } else {
      flushBullets()
      flushOrdered()
      para.push(line)
    }
  }
  flushPara()
  flushBullets()
  flushOrdered()
  return out
}

function renderAnswer(answer: string): ReactNode[] {
  return answer
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .flatMap((block, bi) => renderBlock(block, bi))
}

export default function FaqAccordion({ item }: { item: FaqItem }) {
  return (
    <details className="group scroll-mt-4 rounded-lg border border-gray-200 bg-white shadow-sm open:shadow-md">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-base font-medium text-gray-900 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
        <span
          className="text-lg leading-none text-gray-400 transition-transform"
          aria-hidden
        >
          <span className="inline group-open:hidden">▸</span>
          <span className="hidden group-open:inline">▾</span>
        </span>
        <span className="flex-1">{item.question}</span>
      </summary>
      <div className="space-y-3 border-t border-gray-100 px-5 py-5 text-sm text-gray-700">
        {renderAnswer(item.answer)}
      </div>
    </details>
  )
}
