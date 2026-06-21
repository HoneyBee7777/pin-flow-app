'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { logout } from '@/app/actions/auth'
import { PinKategorieIcon } from '@/components/PinKategorieIcon'

type NavItem = {
  name: string
  href: string
  // Name eines Linien-Icons aus PinKategorieIcon (links vor dem Text).
  icon: string
}

type NavGroup = {
  key: string
  label: string
  collapsible: boolean
  defaultOpen: boolean
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  // Dashboard solo ganz oben: leeres Label → keine Gruppenüberschrift,
  // collapsible: false → Eintrag immer sichtbar (gruppenloser erster Eintrag).
  {
    key: 'dashboard',
    label: '',
    collapsible: false,
    defaultOpen: true,
    items: [{ name: 'Dashboard', href: '/dashboard', icon: 'gauge' }],
  },
  // Workflow-Gruppen: dauerhaft offen (collapsible: false), Label sichtbar,
  // kein Toggle — der rote Faden Einrichten → Produzieren → Auswerten.
  {
    key: 'einrichten',
    label: 'Einrichten',
    collapsible: false,
    defaultOpen: true,
    items: [
      { name: 'Dein Content', href: '/dashboard/content-inhalte', icon: 'inhalt' },
      { name: 'Ziel-URLs', href: '/dashboard/ziel-urls', icon: 'url' },
      { name: 'Keywords', href: '/dashboard/keywords', icon: 'tag' },
      { name: 'Boards', href: '/dashboard/boards', icon: 'boards' },
      { name: 'Saison-Kalender', href: '/dashboard/saison-kalender', icon: 'kalender' },
      { name: 'Einstellungen', href: '/dashboard/einstellungen', icon: 'settings' },
    ],
  },
  {
    key: 'produzieren',
    label: 'Produzieren',
    collapsible: false,
    defaultOpen: true,
    items: [
      { name: 'Pins', href: '/dashboard/pin-produktion', icon: 'pin' },
      { name: 'Canva-Vorlagen', href: '/dashboard/canva-vorlagen', icon: 'vorlage' },
    ],
  },
  {
    key: 'auswerten',
    label: 'Auswerten',
    collapsible: false,
    defaultOpen: true,
    items: [{ name: 'Analytics', href: '/dashboard/analytics', icon: 'chart' }],
  },
  // Ressourcen: einzige einklappbare Gruppe, standardmäßig zugeklappt.
  {
    key: 'ressourcen',
    label: 'Ressourcen',
    collapsible: true,
    defaultOpen: false,
    items: [
      { name: 'Onboarding', href: '/dashboard/onboarding', icon: 'flag' },
      { name: 'Checkliste', href: '/dashboard/checkliste', icon: 'checkliste' },
      { name: 'Prompts & Vorlagen', href: '/dashboard/ressourcen', icon: 'prompt' },
      { name: 'Pinterest-Wissen', href: '/dashboard/strategie', icon: 'buch' },
      { name: 'FAQ', href: '/dashboard/faq', icon: 'faq' },
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

  const isItemActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname?.startsWith(href) ?? false

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    // Standard aus defaultOpen; liegt der aktive Punkt in einer Gruppe, wird sie
    // zusätzlich automatisch aufgeklappt (z. B. eine aktive Ressource).
    for (const g of NAV_GROUPS) {
      initial[g.key] =
        g.defaultOpen || g.items.some((it) => isItemActive(it.href))
    }
    return initial
  })

  function toggle(key: string) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Profil-Popover (zeigt die E-Mail erst auf Klick auf den Avatar).
  const [profilOpen, setProfilOpen] = useState(false)

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
      <div className="flex h-[120px] items-center border-b border-gray-200 px-6">
        <Link href="/dashboard" className="block">
          <h1 className="text-3xl font-bold text-marke-blaugrau hover:text-marke-blaugrau-dunkel">
            Pin-Flow
          </h1>
          <p className="mt-1 text-sm text-marke-ocker">Dein Pinterest-Cockpit</p>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {NAV_GROUPS.map((group) => {
          const open = openGroups[group.key] ?? group.defaultOpen
          return (
            <div
              key={group.key}
              className={`mb-2 ${group.label ? 'mt-3' : ''}`}
            >
              {group.label &&
                (group.collapsible ? (
                  <button
                    type="button"
                    onClick={() => toggle(group.key)}
                    className="flex w-full items-center gap-1 px-3 py-1 text-xs font-medium uppercase tracking-wide text-gray-400 hover:text-gray-600"
                    aria-expanded={open}
                  >
                    <span className="w-3 text-[10px]" aria-hidden>
                      {open ? '▼' : '▶'}
                    </span>
                    {group.label}
                  </button>
                ) : (
                  <p className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                    {group.label}
                  </p>
                ))}

              {(open || !group.collapsible) && (
                <ul className="mt-0.5">
                  {group.items.map((item) => {
                    const active = isItemActive(item.href)
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex items-center gap-2 rounded-md border-l-[3px] px-3 py-1 text-sm font-medium transition-colors ${
                            active
                              ? 'border-l-marke-ocker bg-marke-blaugrau-xhell text-marke-blaugrau'
                              : 'border-l-transparent text-gray-700 hover:bg-marke-blaugrau-xhell hover:text-marke-blaugrau'
                          }`}
                        >
                          <PinKategorieIcon
                            name={item.icon}
                            className="h-4 w-4 shrink-0"
                          />
                          <span>{item.name}</span>
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
        {/* Kompakte Gruppe: Avatar (zeigt die E-Mail erst auf Klick) + Logout,
            eng beieinander statt über die ganze Breite. */}
        <div className="relative flex items-center gap-1">
          <button
            type="button"
            onClick={() => setProfilOpen((v) => !v)}
            aria-label="Profil"
            aria-expanded={profilOpen}
            title="Profil"
            className="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-marke-blaugrau-xhell hover:text-marke-blaugrau"
          >
            <PersonIcon />
          </button>
          <form action={logout}>
            <button
              type="submit"
              aria-label="Abmelden"
              title="Abmelden"
              className="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-marke-blaugrau-xhell hover:text-marke-blaugrau"
            >
              <LogOutIcon />
            </button>
          </form>

          {/* Popover über dem Avatar: E-Mail + Profil-Link, nur auf Klick. */}
          {profilOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-56 rounded-md border border-gray-200 bg-white p-3 shadow-md">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">
                Angemeldet als
              </p>
              <p className="mt-0.5 break-all text-xs text-gray-700">
                {userEmail ?? 'Unbekannt'}
              </p>
              <Link
                href="/dashboard/profil"
                className="mt-2 inline-block text-xs font-medium text-link underline underline-offset-2 hover:opacity-80"
              >
                Mein Profil
              </Link>
            </div>
          )}
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
