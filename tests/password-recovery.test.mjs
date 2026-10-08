import test from 'node:test'
import assert from 'node:assert/strict'
const module = await import('../src/lib/auth/password-recovery.ts').catch(() => ({}))
const { createRecoveryController, analyticsAllowed } = module
const fragment = '#type=recovery&access_token=synthetic-access&refresh_token=synthetic-refresh&expires_at=4102444800'
function fixture(options = {}) {
  const calls = []
  const auth = {
    async setSession() { calls.push('session'); return { error: options.sessionError ?? null } },
    async getUser() { calls.push('verify'); return { data: { user: options.noUser ? null : { id: 'user-1' } }, error: null } },
    async updateUser() { calls.push('update'); return { error: options.updateError ?? null } },
    async signOut() { calls.push('signout'); return { error: options.signoutError ?? null } },
  }
  return { calls, recovery: createRecoveryController(auth) }
}
test('recovery controller exists', () => assert.equal(typeof createRecoveryController, 'function'))
test('missing, non-recovery, duplicate and expired fragments cannot start recovery', async () => {
  for (const hash of ['', '#type=signup&access_token=a&refresh_token=b', '#type=recovery&access_token=a', fragment+'&type=signup', '#type=recovery&access_token=a&refresh_token=b&expires_at=1']) {
    const { recovery, calls } = fixture()
    assert.equal(await recovery.begin(hash), false)
    assert.deepEqual(calls, [])
  }
})
test('valid recovery validates server identity before enabling updates', async () => {
  const { recovery, calls } = fixture()
  assert.equal(await recovery.begin(fragment), true)
  assert.deepEqual(calls, ['session', 'verify'])
  assert.equal(await recovery.complete('Long-password-123', 'Long-password-123'), 'complete')
  assert.deepEqual(calls, ['session', 'verify', 'verify', 'update', 'signout'])
})
test('cannot update without recovery context or server-verified user', async () => {
  const { recovery, calls } = fixture()
  assert.equal(await recovery.complete('Long-password-123', 'Long-password-123'), 'invalid_link')
  assert.deepEqual(calls, [])
  const rejected = fixture({ noUser: true })
  assert.equal(await rejected.recovery.begin(fragment), false)
  assert.equal(await rejected.recovery.complete('Long-password-123', 'Long-password-123'), 'invalid_link')
  assert.equal(rejected.calls.includes('update'), false)
})
test('short or mismatched passwords never call update', async () => {
  const { recovery, calls } = fixture()
  await recovery.begin(fragment)
  assert.equal(await recovery.complete('short', 'short'), 'password_short')
  assert.equal(await recovery.complete('Long-password-123', 'Different-password-123'), 'password_mismatch')
  assert.equal(calls.includes('update'), false)
})
test('provider rejection is generic and permits correction without logging secrets', async () => {
  const { recovery } = fixture({ updateError: new Error('sensitive provider message') })
  await recovery.begin(fragment)
  assert.equal(await recovery.complete('Long-password-123', 'Long-password-123'), 'update_failed')
})
test('signout failure cannot be reported as completed and cannot update twice', async () => {
  const { recovery, calls } = fixture({ signoutError: new Error('network') })
  await recovery.begin(fragment)
  assert.equal(await recovery.complete('Long-password-123', 'Long-password-123'), 'signout_failed')
  assert.equal(await recovery.complete('Long-password-123', 'Long-password-123'), 'invalid_link')
  assert.equal(calls.filter(x => x === 'update').length, 1)
})
test('recovery path never permits analytics including trailing slash or stale router path', () => {
  assert.equal(analyticsAllowed('/account/recovery', '/account/recovery'), false)
  assert.equal(analyticsAllowed('/account/recovery/', '/account/recovery/'), false)
  assert.equal(analyticsAllowed('/', '/account/recovery'), false)
  assert.equal(analyticsAllowed('/account/recovery', '/'), false)
  assert.equal(analyticsAllowed('/', '/'), true)
})
test('recovery response disables caching, indexing and referrers', async () => {
  const { default: config } = await import('../next.config.js')
  const rules = await config.headers()
  const rule = rules.find(x => x.source === '/account/recovery')
  assert.ok(rule)
  const headers = Object.fromEntries(rule.headers.map(x => [x.key.toLowerCase(), x.value]))
  assert.equal(headers['referrer-policy'], 'no-referrer')
  assert.match(headers['cache-control'], /no-store/)
  assert.match(headers['x-robots-tag'], /noindex/)
})
test('password inputs clear before waiting for signout', async () => {
  const { recovery, calls } = fixture()
  await recovery.begin(fragment)
  await recovery.complete('Long-password-123', 'Long-password-123', () => calls.push('clear'))
  assert.deepEqual(calls.slice(-3), ['update', 'clear', 'signout'])
})
test('recovery CSP permits only same-origin scripts and exact Auth connections', async () => {
  const { default: config } = await import('../next.config.js')
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://synthetic-project.supabase.co'
    const rules = await config.headers()
    const policy = rules.find(x => x.source === '/account/recovery').headers.find(x => x.key === 'Content-Security-Policy')?.value
    assert.ok(policy, 'recovery requires an enforcing CSP')
    const directives = Object.fromEntries(policy.split(';').map(x => x.trim().split(/\s+/)).map(([name, ...values]) => [name, values]))
    assert.deepEqual(directives['script-src'], ["'self'", "'unsafe-inline'"])
    assert.deepEqual(directives['connect-src'], ["'self'", 'https://synthetic-project.supabase.co'])
    assert.equal(policy.includes('vercel.live'), false)
    assert.deepEqual(directives['frame-ancestors'], ["'none'"])
    assert.deepEqual(directives['base-uri'], ["'none'"])
    assert.deepEqual(directives['form-action'], ["'self'"])
    assert.equal(rules.find(x => x.source === '/:path*').headers.some(x => x.key === 'Content-Security-Policy'), false)
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previous
  }
})
test('recovery CSP fails closed for absent or unsafe Auth origin configuration', async () => {
  const { default: config } = await import('../next.config.js')
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL
  try {
    for (const value of ['', 'invalid', 'http://example.test', 'https://user:password@example.test', 'https://example.test/path', 'https://example.test?x=1', 'https://example.test/#token']) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = value
      const policy = (await config.headers()).find(x => x.source === '/account/recovery').headers.find(x => x.key === 'Content-Security-Policy')?.value
      assert.ok(policy)
      assert.equal(policy.split(';').map(x => x.trim()).find(x => x.startsWith('connect-src')), "connect-src 'self'")
    }
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previous
  }
})
