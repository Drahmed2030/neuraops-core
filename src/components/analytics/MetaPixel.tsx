'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

declare global {
  interface Window {
    fbq: any
    _fbq: any
  }
}

/**
 * Loads the Meta Pixel base script exactly once per browser session
 * (guarded by a module-level ref, survives client-side navigation
 * without React re-mounting it twice), and fires PageView on every
 * real route change — not on re-renders.
 *
 * Reads the Pixel ID from NEXT_PUBLIC_META_PIXEL_ID. If that env var
 * is not set, this component does nothing at all — safe to deploy
 * even before the ID is configured in Vercel.
 */
export function MetaPixel() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialized = useRef(false)
  const lastTrackedPath = useRef<string | null>(null)

  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID

  useEffect(() => {
    if (!pixelId) return // Not configured yet — no-op, no error, no console noise.
    if (typeof window === 'undefined') return

    if (!initialized.current && !window.fbq) {
      ;(function (f: any, b: any, e: any, v: any) {
        if (f.fbq) return
        let n: any = (f.fbq = function (...args: any[]) {
          n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args)
        })
        if (!f._fbq) f._fbq = n
        n.push = n
        n.loaded = true
        n.version = '2.0'
        n.queue = []
        const t = b.createElement(e)
        t.async = true
        t.src = v
        const s = b.getElementsByTagName(e)[0]
        s.parentNode.insertBefore(t, s)
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')

      window.fbq('init', pixelId)
      initialized.current = true
    }
  }, [pixelId])

  useEffect(() => {
    if (!pixelId) return
    if (typeof window === 'undefined' || !window.fbq) return

    const currentPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')

    // Guard against firing PageView twice for the exact same path
    // (e.g. a re-render that doesn't represent a real navigation).
    if (lastTrackedPath.current === currentPath) return
    lastTrackedPath.current = currentPath

    window.fbq('track', 'PageView')
  }, [pathname, searchParams, pixelId])

  return null
}
