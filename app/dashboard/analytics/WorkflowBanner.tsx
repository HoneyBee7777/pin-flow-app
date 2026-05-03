'use client'

export default function WorkflowBanner({
  pinterestAnalyticsUrl,
}: {
  pinterestAnalyticsUrl: string | null
}) {
  const analyticsUrl =
    pinterestAnalyticsUrl ?? 'https://analytics.pinterest.com'

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-md bg-gray-50 px-4 py-3">
      <a
        href={analyticsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
      >
        Pinterest Analytics öffnen ↗
      </a>
      <span
        className="text-[24px] font-bold leading-none text-gray-400"
        aria-hidden
      >
        →
      </span>
      <p className="text-[15px] font-semibold text-gray-700">
        Zahlen eintragen — gehe die Tabs Profil, Pins und Boards durch und
        trage deine Analytics ein.
      </p>
    </div>
  )
}
