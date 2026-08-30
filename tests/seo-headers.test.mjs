import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const nextConfig = require('../next.config.js')

function robotsHeader(rules) {
  return rules
    .flatMap(rule => rule.headers || [])
    .find(header => header.key.toLowerCase() === 'x-robots-tag')
}

test('robots header blocks previews without overriding route metadata in production', async () => {
  const previousEnvironment = process.env.VERCEL_ENV

  try {
    process.env.VERCEL_ENV = 'preview'
    assert.deepEqual(robotsHeader(await nextConfig.headers()), {
      key: 'X-Robots-Tag',
      value: 'noindex, nofollow',
    })

    process.env.VERCEL_ENV = 'production'
    assert.equal(robotsHeader(await nextConfig.headers()), undefined)
  } finally {
    if (previousEnvironment === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = previousEnvironment
  }
})
