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

  // Persönliche Links für die Sidebar laden — isolierte Query, damit
  // ein fehlendes Personal-Link-Spalten-Schema nicht das Layout killt.
  let pinterestAccountUrl: string | null = null
  let websiteUrl: string | null = null
  let tailwindUrl: string | null = null
  let pinterestAnalyticsUrl: string | null = null
  if (user) {
    const { data } = await supabase
      .from('einstellungen')
      .select(
        'pinterest_account_url, website_url, tailwind_url, pinterest_analytics_url'
      )
      .eq('user_id', user.id)
      .maybeSingle()
    pinterestAccountUrl = data?.pinterest_account_url ?? null
    websiteUrl = data?.website_url ?? null
    tailwindUrl = data?.tailwind_url ?? null
    pinterestAnalyticsUrl = data?.pinterest_analytics_url ?? null
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        userEmail={user?.email}
        pinterestAccountUrl={pinterestAccountUrl}
        websiteUrl={websiteUrl}
        tailwindUrl={tailwindUrl}
        pinterestAnalyticsUrl={pinterestAnalyticsUrl}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
