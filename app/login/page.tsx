import Link from 'next/link'
import { login } from './actions'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-seite px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Anmelden bei Pin-Flow
          </h1>
          <p className="mt-2 text-sm text-gray-600">Willkommen zurück!</p>
        </div>

        {searchParams.error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {searchParams.error}
          </div>
        )}

        <form action={login} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              E-Mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel focus:outline-none focus:ring-2 focus:ring-marke-blaugrau focus:ring-offset-2"
          >
            Anmelden
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Noch kein Konto?{' '}
          <Link
            href="/register"
            className="font-medium text-link underline underline-offset-2"
          >
            Registrieren
          </Link>
        </p>
      </div>
    </div>
  )
}
