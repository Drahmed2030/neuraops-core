import test from 'node:test'
import assert from 'node:assert/strict'
import { applyRequestContext, resolveRequestContext } from '../src/lib/reliability/request-context.mjs'
import { releaseFingerprint, releaseHeaders } from '../src/lib/reliability/release-meta.mjs'

test('release fingerprint exposes only bounded operational metadata', () => {
  const fingerprint = releaseFingerprint({
    VERCEL_GIT_COMMIT_SHA: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    VERCEL_DEPLOYMENT_ID: 'dpl_example',
    VERCEL_ENV: 'production',
  })

  assert.deepEqual(fingerprint, {
    service: 'neuraops-core',
    environment: 'production',
    release: 'abcdef123456',
    deployment: 'dpl_example',
  })

  assert.deepEqual(releaseHeaders({
    VERCEL_GIT_COMMIT_SHA: 'abcdef1234567890',
    VERCEL_ENV: 'preview',
  }), {
    'x-neuraops-service': 'neuraops-core',
    'x-neuraops-release': 'abcdef123456',
    'x-neuraops-environment': 'preview',
  })
})

test('request context creates a request id and preserves a safe correlation id', () => {
  const headers = new Headers({ 'x-correlation-id': 'corr-safe-1234' })
  const context = resolveRequestContext(headers, () => 'req-generated-1234')

  assert.deepEqual(context, {
    requestId: 'req-generated-1234',
    correlationId: 'corr-safe-1234',
  })

  const propagated = applyRequestContext(headers, context)
  assert.equal(propagated.get('x-neuraops-request-id'), 'req-generated-1234')
  assert.equal(propagated.get('x-neuraops-correlation-id'), 'corr-safe-1234')
})

test('request context rejects malformed external correlation values', () => {
  const headers = new Headers({ 'x-correlation-id': 'contains spaces and should not propagate' })
  const context = resolveRequestContext(headers, () => 'req-generated-5678')

  assert.equal(context.requestId, 'req-generated-5678')
  assert.equal(context.correlationId, 'req-generated-5678')
})
