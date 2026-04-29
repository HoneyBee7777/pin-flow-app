'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { logout } from '@/app/actions/auth'

type NavItem = {
  name: string
  href: string
}

type NavGroup = {
  key: string
  label: string
  collapsible: boolean
  defaultOpen: boolean
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'uebersicht',
    label: 'Übersicht',
    collapsible: false,
    defaultOpen: true,
    items: [{ name: 'Dashboard', href: '/dashboard' }],
  },
  {
    key: 'setup',
    label: 'Setup',
    collapsible: true,
    defaultOpen: true,
    items: [
      { name: 'Content & Strategie', href: '/dashboard/content-inhalte' },
      { name: 'Ziel-URLs', href: '/dashboard/ziel-urls' },
      { name: 'Keywords', href: '/dashboard/keywords' },
      { name: 'Boards', href: '/dashboard/boards' },
      { name: 'Saison-Kalender', href: '/dashboard/saison-kalender' },
      { name: 'Einstellungen', href: '/dashboard/einstellungen' },
    ],
  },
  {
    key: 'produktion',
    label: 'Produktion',
    collapsible: true,
    defaultOpen: true,
    items: [
      { name: 'Pins', href: '/dashboard/pin-produktion' },
      { name: 'Canva-Vorlagen', href: '/dashboard/canva-vorlagen' },
    ],
  },
  {
    key: 'auswertung',
    label: 'Auswertung',
    collapsible: true,
    defaultOpen: true,
    items: [{ name: 'Analytics', href: '/dashboard/analytics' }],
  },
  {
    key: 'ressourcen',
    label: 'Ressourcen',
    collapsible: true,
    defaultOpen: true,
    items: [
      { name: 'Wissen & Prompts', href: '/dashboard/ressourcen' },
      { name: 'Strategie & Ausrichtung', href: '/dashboard/strategie' },
    ],
  },
]

export default function Sidebar({
  userEmail,
  pinterestAccountUrl,
  websiteUrl,
  tailwindUrl,
  pinterestAnalyticsUrl,
}: {
  userEmail?: string | null
  pinterestAccountUrl: string | null
  websiteUrl: string | null
  tailwindUrl: string | null
  pinterestAnalyticsUrl: string | null
}) {
  const pathname = usePathname()

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    for (const g of NAV_GROUPS) initial[g.key] = g.defaultOpen
    return initial
  })

  function toggle(key: string) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const isItemActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname?.startsWith(href) ?? false

  const linkItems: Array<{ label: string; url: string }> = [
    { label: 'Pinterest Trends', url: 'https://trends.pinterest.com' },
  ]
  if (pinterestAccountUrl)
    linkItems.push({ label: 'Pinterest Account', url: pinterestAccountUrl })
  if (websiteUrl) linkItems.push({ label: 'Meine Website', url: websiteUrl })
  if (tailwindUrl) linkItems.push({ label: 'Tailwind', url: tailwindUrl })
  if (pinterestAnalyticsUrl)
    linkItems.push({
      label: 'Pinterest Analytics',
      url: pinterestAnalyticsUrl,
    })

  const hasPersonalLinks =
    !!pinterestAccountUrl ||
    !!websiteUrl ||
    !!tailwindUrl ||
    !!pinterestAnalyticsUrl

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-6">
        <h1 className="text-xl font-bold text-red-600">Pin-Flow</h1>
        <p className="mt-1 text-xs text-gray-500">Pinterest-Strategie</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {NAV_GROUPS.map((group) => {
          const open = openGroups[group.key] ?? group.defaultOpen
          return (
            <div key={group.key} className="mb-2">
              {group.collapsible ? (
                <button
                  type="button"
                  onClick={() => toggle(group.key)}
                  className="flex w-full items-center gap-1 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600"
                  aria-expanded={open}
                >
                  <span className="w-3 text-[10px]" aria-hidden>
                    {open ? '▼' : '▶'}
                  </span>
                  {group.label}
                </button>
              ) : (
                <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {group.label}
                </p>
              )}

              {(open || !group.collapsible) && (
                <ul className="mt-0.5">
                  {group.items.map((item) => {
                    const active = isItemActive(item.href)
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`block rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                            active
                              ? 'bg-red-50 text-red-700'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          {item.name}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}

        <hr className="my-3 border-gray-200" />

        <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Links
        </p>
        <ul>
          {linkItems.map((l) => (
            <li key={l.label}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md px-3 py-1 text-xs font-normal text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
              >
                <span className="text-gray-300" aria-hidden>
                  ↗
                </span>
                <span>{l.label}</span>
              </a>
            </li>
          ))}
        </ul>
        {!hasPersonalLinks && (
          <p className="mt-1 px-3 text-[11px] leading-snug text-gray-400">
            Persönliche Links in den{' '}
            <Link
              href="/dashboard/einstellungen"
              className="text-gray-500 underline hover:text-gray-700"
            >
              Einstellungen
            </Link>{' '}
            hinterlegen.
          </p>
        )}
      </nav>

      <div className="p-3">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/profil"
            className="flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
            title="Mein Profil"
          >
            <PersonIcon />
            <span className="truncate" title={userEmail ?? undefined}>
              {userEmail ?? 'Profil'}
            </span>
          </Link>
          <form action={logout}>
            <button
              type="submit"
              aria-label="Abmelden"
              title="Abmelden"
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700"
            >
              <LogOutIcon />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}

function PersonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 shrink-0"
      aria-hidden
    >
      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM3.5 17a6.5 6.5 0 0113 0H3.5z" />
    </svg>
  )
}

function LogOutIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M3 4a1 1 0 011-1h7a1 1 0 110 2H5v10h6a1 1 0 110 2H4a1 1 0 01-1-1V4z"
        clipRule="evenodd"
      />
      <path d="M14.293 6.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L15.586 11H8a1 1 0 110-2h7.586l-1.293-1.293a1 1 0 010-1.414z" />
    </svg>
  )
}
