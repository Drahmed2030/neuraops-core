// Recovery must not expose its implicit-link tokens to preview feedback scripts.
function recoveryContentSecurityPolicy() {
  let authOrigin = ''
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    if (url.protocol === 'https:' && !url.username && !url.password &&
        url.pathname === '/' && !url.search && !url.hash) authOrigin = url.origin
  } catch { /* Missing or malformed configuration permits no external connections. */ }
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    `connect-src 'self'${authOrigin ? ` ${authOrigin}` : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data:",
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join('; ')
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const isProduction = process.env.VERCEL_ENV === 'production'

    return [
      {
        source: '/:path*',
        headers: [
          ...(!isProduction
            ? [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]
            : []),
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/account/recovery',
        headers: [
          { key: 'Content-Security-Policy', value: recoveryContentSecurityPolicy() },
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
