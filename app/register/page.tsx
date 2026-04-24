import Link from 'next/link'
import { signup } from './actions'

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Konto bei Pin-Flow erstellen
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Starte deine Pinterest-Strategie.
          </p>
        </div>

        {searchParams.error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {searchParams.error}
          </div>
        )}

        <form action={signup} className="space-y-4">
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
              minLength={6}
              autoComplete="new-password"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
            <p className="mt-1 text-xs text-gray-500">Mindestens 6 Zeichen.</p>
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Registrieren
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Schon ein Konto?{' '}
          <Link
            href="/login"
            className="font-medium text-red-600 hover:text-red-500"
          >
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  )
}
