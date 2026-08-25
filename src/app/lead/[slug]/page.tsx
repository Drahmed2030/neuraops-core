'use client'

import { FormEvent, useState } from 'react'

type Result = {
  score: number
  qualificationStatus: string
  reason: string
  answer: string
  escalated: boolean
}

function sessionIdFor(slug: string) {
  const key = `leadops_session_${slug}`
  const existing = typeof window !== 'undefined' ? window.sessionStorage.getItem(key) : null
  if (existing) return existing
  const value = crypto.randomUUID().replaceAll('-', '')
  window.sessionStorage.setItem(key, value)
  return value
}

export default function LeadIntakePage({ params }: { params: { slug: string } }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    const form = new FormData(event.currentTarget)
    const payload = {
      storeId: params.slug,
      sessionId: sessionIdFor(params.slug),
      source: 'web',
      name: form.get('name'),
      email: form.get('email'),
      phone: form.get('phone'),
      need: form.get('need'),
      budgetBand: form.get('budgetBand'),
      urgency: form.get('urgency'),
      decisionAuthority: form.get('decisionAuthority'),
    }

    try {
      const response = await fetch('/api/leadops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Qualification failed')
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Qualification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-paper-50 dark:bg-ink-950 text-ink-950 dark:text-paper-50 p-6">
      <div className="max-w-2xl mx-auto py-10">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-[0.18em] text-gold font-bold">LeadOps Pilot</div>
          <h1 className="text-3xl font-extrabold mt-1">Tell us what you need</h1>
          <p className="text-sm opacity-60 mt-2">Share only the contact details you want to provide. We use the answers below to qualify the request and decide whether human review is needed.</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-ink-800 p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-sm">Name (optional)<input name="name" maxLength={160} className="mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent p-3" /></label>
            <label className="text-sm">Email (optional)<input name="email" type="email" maxLength={320} className="mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent p-3" /></label>
            <label className="text-sm md:col-span-2">Phone (optional)<input name="phone" maxLength={80} className="mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent p-3" /></label>
          </div>

          <label className="text-sm block">What do you need?<textarea name="need" required maxLength={3000} rows={5} className="mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent p-3" /></label>

          <div className="grid md:grid-cols-3 gap-4">
            <label className="text-sm">Budget<select name="budgetBand" defaultValue="unknown" className="mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent p-3"><option value="unknown">Not sure</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
            <label className="text-sm">Timeline<select name="urgency" defaultValue="unknown" className="mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent p-3"><option value="unknown">Not sure</option><option value="later">Later</option><option value="30d">Within 30 days</option><option value="7d">Within 7 days</option><option value="now">Now</option></select></label>
            <label className="text-sm">Decision role<select name="decisionAuthority" defaultValue="unknown" className="mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent p-3"><option value="unknown">Not sure</option><option value="influencer">Influencer</option><option value="decision_maker">Decision maker</option></select></label>
          </div>

          <button disabled={loading} className="w-full rounded-lg bg-gold text-ink-950 font-bold px-5 py-3 disabled:opacity-60">{loading ? 'Qualifying…' : 'Submit request'}</button>
        </form>

        {error && <div className="mt-4 rounded-xl border border-red-500/30 p-4 text-sm text-red-500">{error}</div>}
        {result && (
          <section className="mt-4 rounded-2xl border border-gold/30 bg-gold/10 p-5">
            <div className="flex gap-2 flex-wrap text-xs font-bold mb-3"><span>Score {result.score}/100</span><span>·</span><span>{result.qualificationStatus}</span></div>
            <p className="text-sm">{result.answer}</p>
            {result.escalated && <p className="text-xs opacity-60 mt-2">Human review has been requested.</p>}
          </section>
        )}
      </div>
    </main>
  )
}
