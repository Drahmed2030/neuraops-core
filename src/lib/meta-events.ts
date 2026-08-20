/**
 * Fires the real trial-conversion event to Meta — CompleteRegistration
 * (standard event, for campaign optimization) + trial_started (custom
 * event, for internal clarity in Events Manager).
 *
 * Must be called ONLY after a real backend success — i.e. after
 * /api/trial/create-store returns a real storeId — never on button
 * click alone. This is enforced by the caller (Step2StoreInfo's
 * onNext handler), not by this function, but this function adds its
 * own duplicate-protection so a re-render, retry, or back/forward
 * navigation can never fire the event twice for the same store.
 *
 * No PII (store name, phone, city) is ever sent to Meta — only the
 * fixed product/funnel labels the pixel spec requires.
 */
export function trackTrialStarted(storeId: string) {
  if (typeof window === 'undefined') return

  // TEMP DIAGNOSTIC -- remove after Meta event verification is confirmed.
  console.info('[NeuraOps Meta] fbq availability', {
    type: typeof window.fbq,
    hasCallMethod: Boolean((window.fbq as any)?.callMethod),
    queueLength: Array.isArray((window.fbq as any)?.queue) ? (window.fbq as any).queue.length : null,
  })

  if (!window.fbq) {
    console.info('[NeuraOps Meta] SKIPPED -- fbq not available on window')
    return
  }

  const dedupeKey = `neuraops_trial_started_${storeId}`

  try {
    if (sessionStorage.getItem(dedupeKey)) {
      // TEMP DIAGNOSTIC -- remove after Meta event verification is confirmed.
      console.info('[NeuraOps Meta] SKIPPED -- dedupe key already set for this storeId', { dedupeKey })
      return // Already fired for this exact store in this session.
    }
    sessionStorage.setItem(dedupeKey, '1')
  } catch {
    // sessionStorage unavailable (private browsing, etc.) — proceed
    // without dedup rather than blocking the event entirely.
  }

  // TEMP DIAGNOSTIC -- remove after Meta event verification is confirmed.
  console.info('[NeuraOps Meta] sending fbq events now', { dedupeKey })

  window.fbq('track', 'CompleteRegistration')
  window.fbq('trackCustom', 'trial_started', {
    product: 'NeuraOps',
    funnel: 'free_trial',
  })
}
