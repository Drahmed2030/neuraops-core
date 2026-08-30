const FALLBACK_SITE_URL = 'https://neuraops-core.vercel.app'

export function siteUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  const candidate = explicitUrl || (vercelUrl ? `https://${vercelUrl}` : FALLBACK_SITE_URL)

  try {
    return new URL(candidate)
  } catch {
    return new URL(FALLBACK_SITE_URL)
  }
}
