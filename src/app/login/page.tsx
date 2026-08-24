
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { login } from './actions'

const errorText: Record<string, string> = {
  missing_credentials: 'Enter your email and password.',
  invalid_credentials: 'Invalid email or password.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string }
}) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  const error = searchParams?.error ? errorText[searchParams.error] : null

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#0a0a0a] text-white">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-[0.22em] text-amber-300/80 mb-2">NeuraOps</div>
          <h1 className="text-2xl font-bold">Admin sign in</h1>
          <p className="mt-2 text-sm text-white/55">Authorized store administrators only.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <form action={login} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm text-white/70">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 outline-none focus:border-amber-300/60"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm text-white/70">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 outline-none focus:border-amber-300/60"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-amber-300 px-4 py-2.5 font-semibold text-black transition hover:bg-amber-200"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  )
}
