// V3.5 — generischer Renderer für einen Onboarding-Schritt: Block-Inhalte
// (Absatz / Unterüberschrift / Listen / 💡-Callout) + In-Content-CTA-
// Buttons. Inline-Markdown: nur **fett**.

import type { ReactNode } from 'react'
import Link from 'next/link'
import type { OBlock, OCta, OnboardingStepDef } from '@/lib/onboarding-content'

// Inline-Markdown im Block-Text:
//   **fett**          → <strong>
//   [Label](/pfad)    → <Link> (relative URLs) bzw. <a target="_blank"> (http(s)://)
// Konvention: Pfeile (→ ↗) bleiben außerhalb der eckigen Klammern, damit
// nur das Wort verlinkt ist (siehe Memory-Notiz „Pfeil-Links Formatierung").
function renderInline(text: string, keyBase: string): ReactNode[] {
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g
  const linkCls = 'font-medium text-link underline underline-offset-2'

  function withLinks(segment: string, base: string): ReactNode[] {
    const out: ReactNode[] = []
    let last = 0
    let n = 0
    linkRe.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = linkRe.exec(segment)) !== null) {
      if (m.index > last) {
        out.push(<span key={`${base}-t${n}`}>{segment.slice(last, m.index)}</span>)
      }
      const [, label, href] = m
      const isExternal = /^https?:\/\//.test(href)
      out.push(
        isExternal ? (
          <a
            key={`${base}-l${n}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkCls}
          >
            {label}
          </a>
        ) : (
          <Link key={`${base}-l${n}`} href={href} className={linkCls}>
            {label}
          </Link>
        )
      )
      last = m.index + m[0].length
      n++
    }
    if (last < segment.length) {
      out.push(<span key={`${base}-t${n}`}>{segment.slice(last)}</span>)
    }
    return out.length > 0 ? out : [<span key={`${base}-empty`}>{segment}</span>]
  }

  return text.split('**').flatMap<ReactNode>((seg, i): ReactNode[] => {
    const segKey = `${keyBase}-${i}`
    if (i % 2 === 1) {
      return [
        <strong key={segKey} className="font-semibold">
          {withLinks(seg, segKey)}
        </strong>,
      ]
    }
    return withLinks(seg, segKey)
  })
}

function Block({ block, i }: { block: OBlock; i: number }) {
  switch (block.kind) {
    case 'h':
      return (
        <h3 className="text-base font-semibold text-gray-900">
          {renderInline(block.text, `h${i}`)}
        </h3>
      )
    case 'ul':
      return (
        <ul className="list-disc space-y-1 pl-5 text-gray-700">
          {block.items.map((it, li) => (
            <li key={li}>{renderInline(it, `u${i}-${li}`)}</li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol className="list-decimal space-y-1 pl-5 text-gray-700">
          {block.items.map((it, li) => (
            <li key={li}>{renderInline(it, `o${i}-${li}`)}</li>
          ))}
        </ol>
      )
    case 'callout':
      return (
        <p className="rounded-md border-l-[3px] border-l-hinweis-tipp-stripe bg-hinweis-tipp-flaeche px-4 py-3 text-[13px] leading-relaxed text-hinweis-tipp-text">
          {renderInline(block.text, `c${i}`)}
        </p>
      )
    case 'intro':
      return (
        <p className="text-base leading-relaxed text-gray-700">
          {renderInline(block.text, `i${i}`)}
        </p>
      )
    case 'footnote':
      return (
        <p className="text-xs leading-relaxed text-gray-500">
          {renderInline(block.text, `f${i}`)}
        </p>
      )
    case 'divider':
      return <hr className="my-6 border-gray-200" />
    default:
      return (
        <p className="leading-relaxed text-gray-700">
          {renderInline(block.text, `p${i}`)}
        </p>
      )
  }
}

export function CtaButton({ cta }: { cta: OCta }) {
  const cls =
    cta.variant === 'primary'
      ? 'inline-flex items-center rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel'
      : 'inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
  if (cta.newTab) {
    return (
      <a href={cta.href} target="_blank" rel="noopener noreferrer" className={cls}>
        {cta.label} ↗
      </a>
    )
  }
  return (
    <Link href={cta.href} className={cls}>
      {cta.label}
    </Link>
  )
}

export default function StepView({
  step,
  children,
  extraCtas,
}: {
  step: OnboardingStepDef
  // zusätzliche, schritt-spezifische UI (Formular, Radio, …)
  children?: ReactNode
  // Wird neben den deklarativen CTAs in derselben Button-Reihe gerendert.
  // Genutzt z. B. für den client-seitigen Inline-Skip-Button.
  extraCtas?: ReactNode
}) {
  // Welcome-Schritt: größerer, selbstbewusster Titel ohne Emoji.
  const isWelcome = step.id === 0
  return (
    <div className="space-y-4">
      <h2
        className={`font-bold text-gray-900 ${
          isWelcome ? 'text-3xl' : 'text-2xl'
        }`}
      >
        {step.title}
      </h2>
      <div className="space-y-3 text-sm">
        {step.blocks.map((b, i) => (
          <Block key={i} block={b} i={i} />
        ))}
      </div>

      {children}

      {((step.ctas && step.ctas.length > 0) || extraCtas) && (
        <div className="flex flex-wrap gap-3 pt-1">
          {step.ctas?.map((c, i) => (
            <CtaButton key={i} cta={c} />
          ))}
          {extraCtas}
        </div>
      )}
    </div>
  )
}
