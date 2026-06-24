import { createClient } from '@/lib/supabase-server'
import { changePassword } from './actions'

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="space-y-8 p-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Mein Profil</h1>
        {user?.email && (
          <p className="mt-2 text-sm text-gray-600">
            Eingeloggt als <strong>{user.email}</strong>
          </p>
        )}
      </header>

      <section
        id="passwort"
        className="max-w-md scroll-mt-24 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-gray-900">Passwort ändern</h2>
        <p className="mt-1 text-sm text-gray-600">
          Hier änderst du dein Passwort. Mindestens 6 Zeichen.
        </p>

        {searchParams.error && (
          <div className="mt-4 rounded-md border border-status-schlecht bg-status-schlecht-flaeche p-3 text-sm text-status-schlecht-text">
            {searchParams.error}
          </div>
        )}
        {searchParams.success && (
          <div className="mt-4 rounded-md border border-status-gut bg-status-gut-flaeche p-3 text-sm text-status-gut-text">
            Dein Passwort wurde geändert.
          </div>
        )}

        <form action={changePassword} className="mt-4 space-y-4">
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
            className="rounded-md bg-marke-blaugrau px-4 py-2 text-sm font-medium text-white hover:bg-marke-blaugrau-dunkel focus:outline-none focus:ring-2 focus:ring-marke-blaugrau focus:ring-offset-2"
          >
            Passwort speichern
          </button>
        </form>
      </section>
    </div>
  )
}
