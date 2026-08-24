\
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { logout } from '@/app/login/actions'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[100]">
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-xs font-semibold text-black shadow-lg backdrop-blur hover:bg-white"
          >
            Sign out
          </button>
        </form>
      </div>
      {children}
    </>
  )
}
