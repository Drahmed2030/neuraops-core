const baseUrl = (process.env.NEURAOPS_PROBE_BASE_URL || 'https://getneuraops.com').replace(/\/$/, '')
const timeoutMs = Number(process.env.NEURAOPS_PROBE_TIMEOUT_MS || 8000)

async function probe(path, expectedCheck) {
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
    const release = response.headers.get('x-neuraops-release')

    if (!response.ok) {
      throw new Error(`${path} returned HTTP ${response.status}`)
    }

    if (!body || body.status !== 'ok') {
      throw new Error(`${path} returned an invalid health payload`)
    }

    if (expectedCheck && body.check !== expectedCheck) {
      throw new Error(`${path} returned check=${String(body.check)} expected=${expectedCheck}`)
    }

    return {
      path,
      status: response.status,
      release: release || body.release?.release || 'unknown',
      environment: response.headers.get('x-neuraops-environment') || body.release?.environment || 'unknown',
    }
  } finally {
    clearTimeout(timer)
  }
}

try {
  const results = []
  results.push(await probe('/api/live', 'liveness'))
  results.push(await probe('/api/ready', 'readiness'))
  console.log(JSON.stringify({ status: 'ok', baseUrl, results }))
} catch (error) {
  console.error(JSON.stringify({
    status: 'failed',
    baseUrl,
    error: error instanceof Error ? error.message : String(error),
  }))
  process.exitCode = 1
}
