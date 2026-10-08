// This controller holds recovery authority only in memory for this page lifetime.
// Fragment type is a flow discriminator, never proof of identity: Auth verifies it.
type RecoveryAuth = {
  setSession(tokens: { access_token: string; refresh_token: string }): Promise<{ error: unknown }>
  getUser(): Promise<{ data: { user: { id: string } | null }; error: unknown }>
  updateUser(attributes: { password: string }): Promise<{ error: unknown }>
  signOut(): Promise<{ error: unknown }>
}
export function analyticsAllowed(pathname: string | null, actualPath: string) {
  return ![pathname, actualPath].some(path => path === '/account/recovery' || path?.startsWith('/account/recovery/'))
}
export function createRecoveryController(auth: RecoveryAuth) {
  let userId: string | null = null
  let expiresAt = 0
  let busy = false
  return {
    async begin(fragment: string): Promise<boolean> {
      userId = null
      const params = new URLSearchParams(fragment.replace(/^#/, ''))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      expiresAt = Number(params.get('expires_at'))
      if (['type', 'access_token', 'refresh_token', 'expires_at'].some(key => params.getAll(key).length !== 1) ||
          params.get('type') !== 'recovery' || !access_token || !refresh_token || params.has('error') ||
          !Number.isFinite(expiresAt) || expiresAt <= Date.now() / 1000) return false
      try {
        const established = await auth.setSession({ access_token, refresh_token })
        if (established.error) return false
        const verified = await auth.getUser()
        if (verified.error || !verified.data.user) { await auth.signOut(); return false }
        userId = verified.data.user.id
        return true
      } catch { return false }
    },
    async complete(password: string, confirmation: string, clearPassword: () => void = () => {}): Promise<string> {
      if (!userId || expiresAt <= Date.now() / 1000 || busy) return 'invalid_link'
      if (password.length < 12) return 'password_short'
      if (password !== confirmation) return 'password_mismatch'
      busy = true
      try {
        const verified = await auth.getUser()
        if (verified.error || verified.data.user?.id !== userId) { userId = null; return 'invalid_link' }
        const updated = await auth.updateUser({ password })
        if (updated.error) return 'update_failed'
        userId = null
        clearPassword()
        const signedOut = await auth.signOut()
        return signedOut.error ? 'signout_failed' : 'complete'
      } catch { return userId ? 'update_failed' : 'signout_failed' }
      finally { busy = false }
    },
  }
}
