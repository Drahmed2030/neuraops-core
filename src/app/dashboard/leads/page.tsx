import { createServerClient } from '@/lib/supabase/server'
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

  if (!store) {
    return (
      <main className="min-h-screen p-6">
        <div className="max-w-3xl mx-auto rounded-2xl border border-black/10 dark:border-white/10 p-6">
          No owned store is available for LeadOps.
        </div>
      </main>
    )
  }

  return <LeadsOperatorView storeSlug={store.slug} />
}
