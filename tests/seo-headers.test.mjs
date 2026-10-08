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

test('previews are globally noindex while production restricts noindex to recovery', async () => {
  const previousEnvironment = process.env.VERCEL_ENV

  try {
    process.env.VERCEL_ENV = 'preview'
    assert.deepEqual(robotsHeader(await nextConfig.headers()), {
      key: 'X-Robots-Tag',
      value: 'noindex, nofollow',
    })

    process.env.VERCEL_ENV = 'production'
    const productionRules = await nextConfig.headers()
    const publicRule = productionRules.find(rule => rule.source === '/:path*')
    assert.ok(publicRule, 'public wildcard header rule must remain present')
    assert.equal(robotsHeader([publicRule]), undefined)
    const recoveryRule = productionRules.find(rule => rule.source === '/account/recovery')
    assert.ok(recoveryRule, 'recovery header rule must remain present')
    assert.deepEqual(robotsHeader([recoveryRule]), {
      key: 'X-Robots-Tag',
      value: 'noindex, nofollow',
    })
  } finally {
    if (previousEnvironment === undefined) delete process.env.VERCEL_ENV
    else process.env.VERCEL_ENV = previousEnvironment
  }
})
