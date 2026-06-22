import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { setPassword } from './actions'

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(
      '/login?error=' +
        encodeURIComponent(
          'Bitte zuerst über deinen Einladungslink anmelden.'
        )
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-seite px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Passwort festlegen
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Lege ein Passwort für deinen Pin-Flow-Zugang fest.
          </p>
        </div>

        {searchParams.error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {searchParams.error}
          </div>
        )}

        <form action={setPassword} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Neues Passwort
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

          <div>
            <label
              htmlFor="passwordConfirm"
              className="block text-sm font-medium text-gray-700"
            >
              Passwort bestätigen
            </label>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel focus:outline-none focus:ring-2 focus:ring-marke-blaugrau focus:ring-offset-2"
          >
            Passwort speichern
          </button>
        </form>
      </div>
    </div>
  )
}
