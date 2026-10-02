import test from 'node:test'
import assert from 'node:assert/strict'
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

test('release fingerprint falls back safely when provider metadata is absent', () => {
  assert.deepEqual(releaseFingerprint({}), {
    service: 'neuraops-core',
    environment: 'unknown',
    release: 'unknown',
    deployment: 'unknown',
  })
})
