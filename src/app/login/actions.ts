
'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { requireOperationsAccess } from '@/lib/auth/require-operations-access'

export async function login(formData: FormData) {
  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '')

  if (!email || !password) {
    redirect('/login?error=missing_credentials')
  }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect('/login?error=invalid_credentials')
  }

  const access = await requireOperationsAccess()
  if (!access.ok && access.status === 401) {
    redirect('/login?error=invalid_credentials')
  }

  // Keep customer access unchanged. Operators enter the existing protected
  // company surface; unavailable configuration is handled there, fail-closed.
  redirect(access.ok || access.status === 503 ? '/dashboard/control' : '/dashboard')
}

export async function logout() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}
