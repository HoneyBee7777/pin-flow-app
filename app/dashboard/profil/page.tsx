import { createClient } from '@/lib/supabase-server'

export default async function ProfilPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="p-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Mein Profil</h1>
        {user?.email && (
          <p className="mt-2 text-sm text-gray-600">
            Eingeloggt als <strong>{user.email}</strong>
          </p>
        )}
      </header>
    </div>
  )
}
