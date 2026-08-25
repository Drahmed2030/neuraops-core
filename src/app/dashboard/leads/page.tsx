import { createServerClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/Header'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { DashboardMobileNav } from '@/components/dashboard/DashboardMobileNav'
import { LeadsOperatorView } from '@/components/leadops/LeadsOperatorView'

export default async function LeadsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: store } = await supabase
    .from('stores')
    .select('slug, name')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return (
    <div className="min-h-screen">
      <Header variant="app" />
      <DashboardMobileNav activeSection="leads" />
      <DashboardSidebar activeTab="leads" />
      <main className="md:ps-60">
        {!store ? (
          <div className="p-6">
            <div className="max-w-3xl mx-auto rounded-2xl border border-black/10 dark:border-white/10 p-6">
              No owned store is available for LeadOps.
            </div>
          </div>
        ) : (
          <LeadsOperatorView storeSlug={store.slug} />
        )}
      </main>
    </div>
  )
}
