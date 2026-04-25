'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'

const navItems = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Pin-Produktion', href: '/dashboard/pin-produktion' },
  { name: 'Keywords', href: '/dashboard/keywords' },
  { name: 'Ziel-URLs', href: '/dashboard/ziel-urls' },
  { name: 'Content-Inhalte', href: '/dashboard/content-inhalte' },
  { name: 'Boards', href: '/dashboard/boards' },
  { name: 'Saison-Kalender', href: '/dashboard/saison-kalender' },
  { name: 'Canva-Vorlagen', href: '/dashboard/canva-vorlagen' },
  { name: 'Analytics', href: '/dashboard/analytics' },
  { name: 'Ressourcen', href: '/dashboard/ressourcen' },
  { name: 'Einstellungen', href: '/dashboard/einstellungen' },
]

export default function Sidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname()

  return (
    <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-6">
        <h1 className="text-xl font-bold text-red-600">Pin-Flow</h1>
        <p className="mt-1 text-xs text-gray-500">Pinterest-Strategie</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname?.startsWith(item.href)

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
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
      </nav>

      <div className="border-t border-gray-200 p-4">
        {userEmail && (
          <p
            className="mb-2 truncate text-xs text-gray-500"
            title={userEmail}
          >
            {userEmail}
          </p>
        )}
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Abmelden
          </button>
        </form>
      </div>
    </aside>
  )
}
