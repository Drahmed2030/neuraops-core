const FALLBACK_SITE_URL = 'https://getneuraops.com'

export function siteUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const candidate = explicitUrl || FALLBACK_SITE_URL

  try {
    return new URL(candidate)
  } catch {
    return new URL(FALLBACK_SITE_URL)
  }
}
