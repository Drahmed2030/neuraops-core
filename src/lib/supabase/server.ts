/**
 * Standard authenticated SSR Supabase client.
 *
 * Uses @supabase/ssr to read the user session from cookies.
 * This makes supabase.auth.getUser() return the real authenticated user.
 *
 * Uses the ANON key — RLS is enforced.
 *
 * Phase 1 usage:
 *   - requireStoreAccess() uses this client for:
 *       a. supabase.auth.getUser()
 *       b. stores SELECT for owner_id verification
 *   - All subsequent DB operations in protected routes use supabaseAdmin
 *     (see src/lib/supabase/admin.ts), explicitly scoped by ctx.store.id.
 *
 * For privileged DB operations: import { supabaseAdmin } from './admin'
 */

import { createServerClient as createSSRClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const cookieStore = await cookies()

  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — safe to ignore
          }
        },
      },
    }
  )
}
