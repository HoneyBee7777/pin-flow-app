'use client'

type Props = {
  text: string
  className?: string
}

export default function InfoTooltip({ text, className = '' }: Props) {
  return (
    <span
      role="img"
      title={text}
      aria-label={text}
      onClick={(e) => e.stopPropagation()}
      className={`ml-1 inline-flex flex-shrink-0 cursor-help items-center justify-center text-current transition-colors duration-150 hover:text-gray-700 ${className}`}
      style={{
        width: '0.88em',
        height: '0.88em',
        verticalAlign: 'middle',
        marginTop: '-2px',
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-full w-full"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </span>
  )
}

export function LabelWithTooltip({
  label,
  tooltip,
}: {
  label: string
  tooltip?: string
}) {
  if (!tooltip) return <>{label}</>
  const parts = label.split(' ')
  const last = parts.pop() ?? ''
  const prefix = parts.join(' ')
  return (
    <>
      {prefix ? `${prefix} ` : ''}
      <span className="whitespace-nowrap">
        {last}
        <InfoTooltip text={tooltip} />
      </span>
    </>
  )
}
