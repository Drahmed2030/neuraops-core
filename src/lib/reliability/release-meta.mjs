function clean(value, max = 128) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

export function releaseFingerprint(env = process.env) {
  const sha = clean(env.VERCEL_GIT_COMMIT_SHA || env.GITHUB_SHA, 64)
  const deployment = clean(env.VERCEL_DEPLOYMENT_ID || env.VERCEL_URL, 128)
  const environment = clean(env.VERCEL_ENV || env.NODE_ENV, 32) || 'unknown'

  return Object.freeze({
    service: 'neuraops-core',
    environment,
    release: sha ? sha.slice(0, 12) : 'unknown',
    deployment: deployment || 'unknown',
  })
}

export function releaseHeaders(env = process.env) {
  const fingerprint = releaseFingerprint(env)
  return {
    'x-neuraops-service': fingerprint.service,
    'x-neuraops-release': fingerprint.release,
    'x-neuraops-environment': fingerprint.environment,
  }
}
