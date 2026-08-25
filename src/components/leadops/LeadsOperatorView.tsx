'use client'

import { useEffect, useState } from 'react'

type Lead = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  need: string | null
  source: string
  score: number
  qualification_status: string
  qualification_reason: string
  conversion_status: string
  follow_up_status: string
  created_at: string
}

type Analytics = { total: number; qualified: number; needsHuman: number; won: number }

export function LeadsOperatorView({ storeSlug }: { storeSlug: string }) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [analytics, setAnalytics] = useState<Analytics>({ total: 0, qualified: 0, needsHuman: 0, won: 0 })
  const [error, setError] = useState('')

  async function load() {
    const res = await fetch(`/api/leads?storeId=${encodeURIComponent(storeSlug)}`, { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load leads')
    setLeads(data.leads || [])
    setAnalytics(data.analytics || { total: 0, qualified: 0, needsHuman: 0, won: 0 })
  }

  useEffect(() => { load().catch(e => setError(e.message)) }, [storeSlug])

  async function updateLead(id: string, patch: Record<string, string>) {
    setError('')
    const res = await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, storeId: storeSlug, ...patch }),
    })
    const data = await res.json()
    if (!res.ok) return setError(data.error || 'Update failed')
    await load()
  }

  return (
    <main className="min-h-screen bg-paper-50 dark:bg-ink-950 text-ink-950 dark:text-paper-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-[0.18em] text-gold font-bold">LeadOps MVP</div>
          <h1 className="text-3xl font-extrabold mt-1">Inbound leads</h1>
          <p className="text-sm opacity-60 mt-1">Store-scoped qualification outcomes and follow-up state.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            ['Total', analytics.total],
            ['Qualified', analytics.qualified],
            ['Human review', analytics.needsHuman],
            ['Won', analytics.won],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-ink-800 p-4">
              <div className="text-xs opacity-55">{label}</div>
              <div className="text-2xl font-extrabold mt-1">{value}</div>
            </div>
          ))}
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-500/30 p-3 text-sm text-red-500">{error}</div>}

        <div className="space-y-3">
          {leads.length === 0 && <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 opacity-60">No leads yet.</div>}
          {leads.map(lead => (
            <section key={lead.id} className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-ink-800 p-5">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong>{lead.name || 'Unnamed lead'}</strong>
                    <span className="text-xs px-2 py-1 rounded-full bg-gold/15 text-gold font-bold">{lead.score}/100</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-black/5 dark:bg-white/10">{lead.qualification_status}</span>
                  </div>
                  <div className="text-sm opacity-60 mt-1">{[lead.email, lead.phone, lead.source].filter(Boolean).join(' · ')}</div>
                  <p className="text-sm mt-3 whitespace-pre-wrap">{lead.need || 'No use-case supplied.'}</p>
                  <div className="text-xs opacity-50 mt-2">Reason: {lead.qualification_reason}</div>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  {lead.follow_up_status === 'none' && (
                    <button onClick={() => updateLead(lead.id, { followUpStatus: 'pending' })} className="px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 text-xs font-bold">Queue follow-up</button>
                  )}
                  {lead.follow_up_status === 'pending' && (
                    <button onClick={() => updateLead(lead.id, { followUpStatus: 'in_progress' })} className="px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 text-xs font-bold">Start follow-up</button>
                  )}
                  {lead.follow_up_status === 'in_progress' && (
                    <button onClick={() => updateLead(lead.id, { followUpStatus: 'done' })} className="px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 text-xs font-bold">Mark done</button>
                  )}
                  {lead.conversion_status === 'new' && (
                    <button onClick={() => updateLead(lead.id, { conversionStatus: 'contacted' })} className="px-3 py-2 rounded-lg bg-gold text-ink-950 text-xs font-bold">Mark contacted</button>
                  )}
                  {lead.conversion_status === 'contacted' && (
                    <>
                      <button onClick={() => updateLead(lead.id, { conversionStatus: 'won' })} className="px-3 py-2 rounded-lg bg-gold text-ink-950 text-xs font-bold">Won</button>
                      <button onClick={() => updateLead(lead.id, { conversionStatus: 'lost' })} className="px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 text-xs font-bold">Lost</button>
                    </>
                  )}
                </div>
              </div>
              <div className="text-[11px] opacity-40 mt-4">{new Date(lead.created_at).toLocaleString()}</div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
