'use client'

import { useEffect, useState } from 'react'

interface ProofWeekStatus {
  trialState: string
  daysRemaining: number | null
  proofDeadline: string | null
}

/**
 * Fetches and displays the real server-computed proof-week status.
 * Used in the dashboard so the store owner always sees an honest,
 * server-authoritative countdown — never a client-side guess.
 */
export function useProofWeekStatus(storeSlug: string) {
  const [status, setStatus] = useState<ProofWeekStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchStatus() {
      try {
        const res = await fetch(`/api/trial/status?storeId=${storeSlug}`)
        const data = await res.json()
        if (!cancelled) setStatus(data)
      } catch {
        if (!cancelled) setStatus(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchStatus()
    return () => { cancelled = true }
  }, [storeSlug])

  return { status, loading }
}
