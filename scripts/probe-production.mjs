const baseUrl = (process.env.NEURAOPS_PROBE_BASE_URL || 'https://getneuraops.com').replace(/\/$/, '')
const timeoutMs = Number(process.env.NEURAOPS_PROBE_TIMEOUT_MS || 8000)
const expectedEnvironment =
  process.env.NEURAOPS_PROBE_EXPECT_ENV ||
  (baseUrl.endsWith('.vercel.app') ? 'preview' : 'production')

async function probe(path, expectedCheck, { requireCorrelation = false } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'neuraops-synthetic-probe/1.0',
        'cache-control': 'no-cache',
      },
    })

    const body = await response.json().catch(() => null)
    const release = response.headers.get('x-neuraops-release') || body?.release?.release || null
    const environment =
      response.headers.get('x-neuraops-environment') ||
      body?.release?.environment ||
      null
    const requestId = response.headers.get('x-neuraops-request-id')
    const correlationId = response.headers.get('x-neuraops-correlation-id')

    if (!response.ok) {
      throw new Error(`${path} returned HTTP ${response.status}`)
    }

    if (!body || body.status !== 'ok') {
      throw new Error(`${path} returned an invalid health payload`)
    }

    if (expectedCheck && body.check !== expectedCheck) {
      throw new Error(
        `${path} returned check=${String(body.check)} expected=${expectedCheck}`
      )
    }

    if (!release || release === 'unknown') {
      throw new Error(`${path} did not expose a release fingerprint`)
    }

    if (environment !== expectedEnvironment) {
      throw new Error(
        `${path} returned environment=${String(environment)} expected=${expectedEnvironment}`
      )
    }

    if (requireCorrelation && (!requestId || !correlationId)) {
      throw new Error(`${path} did not expose request/correlation identifiers`)
    }

    return {
      path,
      status: response.status,
      release,
      environment,
      correlation: requireCorrelation ? 'present' : 'not-required',
    }
  } finally {
    clearTimeout(timer)
  }
}

try {
  const results = []
  results.push(await probe('/api/live', 'liveness', { requireCorrelation: true }))
  results.push(await probe('/api/ready', 'readiness'))

  console.log(
    JSON.stringify({
      status: 'ok',
      baseUrl,
      expectedEnvironment,
      results,
    })
  )
} catch (error) {
  console.error(
    JSON.stringify({
      status: 'failed',
      baseUrl,
      expectedEnvironment,
      error: error instanceof Error ? error.message : String(error),
    })
  )
  process.exitCode = 1
}
