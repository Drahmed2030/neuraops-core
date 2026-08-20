'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

// Module-level guard: survives React Strict Mode's intentional double-invoke
// of effects in development, and prevents a second <MetaPixel/> mount (e.g.
// from fast navigation) from re-injecting the base script.
let pixelInitialized = false;

// Raw env var may pick up trailing/leading whitespace or newlines depending
// on how it was pasted into the hosting provider's dashboard. Always trim
// before it ever reaches fbq().
function getCleanPixelId(): string {
  const raw = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';
  return String(raw).trim();
}

function loadFacebookPixelScript(pixelId: string) {
  if (typeof window === 'undefined') return;
  if (window.fbq) return; // script + init already present

  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any) {
    if (f.fbq) return;
    var n: any = (f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    var t: any = b.createElement(e);
    t.async = true;
    t.src = v;
    var s: any = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq('init', pixelId);
}

export default function MetaPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedUrl = useRef<string | null>(null);

  useEffect(() => {
    const pixelId = getCleanPixelId();

    if (!pixelId) {
      // No pixel configured for this environment (e.g. local dev without
      // the env var set) -- fail silently, never throw.
      return;
    }

    if (!pixelInitialized) {
      loadFacebookPixelScript(pixelId);
      pixelInitialized = true;
    }

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

    // Only fire PageView when the URL actually changed -- prevents a
    // duplicate fire if this effect re-runs for an unrelated reason.
    if (lastTrackedUrl.current === url) return;
    lastTrackedUrl.current = url;

    if (window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [pathname, searchParams]);

  return null;
}
