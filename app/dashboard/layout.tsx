import { createClient } from '@/lib/supabase-server'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userEmail={user?.email} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
