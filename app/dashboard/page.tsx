import { createClient } from '@/lib/supabase-server'

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Willkommen zurück{user?.email ? `, ${user.email}` : ''}.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500">Pins (gesamt)</h2>
          <p className="mt-2 text-3xl font-semibold text-gray-900">0</p>
        </article>

        <article className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500">Keywords</h2>
          <p className="mt-2 text-3xl font-semibold text-gray-900">0</p>
        </article>

        <article className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-gray-500">Boards</h2>
          <p className="mt-2 text-3xl font-semibold text-gray-900">0</p>
        </article>
      </section>
    </div>
  )
}
