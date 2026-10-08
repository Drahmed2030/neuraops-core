import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

// Exercise the real login action and access policy; replace only Next redirect
// and the external Auth transport. No hosted account or credentials are used.
const operator = '123e4567-e89b-42d3-a456-426614174000'
const other = '123e4567-e89b-42d3-a456-426614174001'
const fixtureKey = '__neuraopsLoginRoutingFixture'
const hooks = registerHooks({
  resolve(specifier, context, next) {
    let source
    if (specifier === 'next/navigation') {
      source = 'export function redirect(path) { const e = new Error("redirect"); e.destination = path; throw e }'
    } else if (specifier === '@/lib/supabase/server') {
      source = `export async function createServerClient() { return globalThis.${fixtureKey}.client }`
    }
    if (source) return { url: 'data:text/javascript,' + encodeURIComponent(source), shortCircuit: true }
    if (specifier.startsWith('@/')) {
      const path = specifier.slice(2) + (specifier.endsWith('.mjs') ? '' : '.ts')
      return { url: new URL('../src/' + path, import.meta.url).href, shortCircuit: true }
    }
    return next(specifier, context)
  },
})
const { login } = await import('../src/app/login/actions.ts')
const previousAllowlist = process.env.NTRP_OPERATOR_USER_IDS
test.after(() => {
  hooks.deregister()
  delete globalThis[fixtureKey]
  if (previousAllowlist === undefined) delete process.env.NTRP_OPERATOR_USER_IDS
  else process.env.NTRP_OPERATOR_USER_IDS = previousAllowlist
})

async function run({ user = { id: operator }, authError = null, signInError = null, allowlist = operator, email = 'founder@example.test' } = {}) {
  process.env.NTRP_OPERATOR_USER_IDS = allowlist
  const calls = []
  globalThis[fixtureKey] = { client: { auth: {
    async signInWithPassword(credentials) {
      calls.push('signIn')
      assert.equal(credentials.email, email.trim())
      return { error: signInError }
    },
    async getUser() { calls.push('getUser'); return { data: { user }, error: authError } },
  } } }
  const form = new FormData()
  form.set('email', email)
  form.set('password', 'synthetic-test-only')
  try { await login(form); assert.fail('login must redirect') }
  catch (error) { if (!error.destination) throw error; return { destination: error.destination, calls } }
}

test('verified operator lands on existing company control', async () => {
  assert.deepEqual(await run(), { destination: '/dashboard/control', calls: ['signIn', 'getUser'] })
})
test('ordinary authenticated user keeps the existing customer dashboard', async () => {
  assert.equal((await run({ user: { id: other, user_metadata: { role: 'founder' } } })).destination, '/dashboard')
})
test('missing operator configuration reaches protected unavailable control, not demo', async () => {
  assert.equal((await run({ allowlist: '' })).destination, '/dashboard/control')
})
test('malformed operator configuration fails closed', async () => {
  assert.equal((await run({ allowlist: 'founder@example.test' })).destination, '/dashboard/control')
})
test('identity rejected after sign-in returns to login', async () => {
  assert.equal((await run({ user: null, authError: new Error('invalid') })).destination, '/login?error=invalid_credentials')
})
test('invalid credentials never evaluate operator access', async () => {
  assert.deepEqual(await run({ signInError: new Error('invalid') }), { destination: '/login?error=invalid_credentials', calls: ['signIn'] })
})
test('missing credentials never reach Auth', async () => {
  assert.deepEqual(await run({ email: '' }), { destination: '/login?error=missing_credentials', calls: [] })
})
