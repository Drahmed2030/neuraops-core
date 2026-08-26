'use client'

import { useEffect, useState } from 'react'
import { useUI } from '@/lib/ui-context'

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
  const { lang } = useUI()
  const isArabic = lang === 'ar'
  const [leads, setLeads] = useState<Lead[]>([])
  const [analytics, setAnalytics] = useState<Analytics>({ total: 0, qualified: 0, needsHuman: 0, won: 0 })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/leads?storeId=${encodeURIComponent(storeSlug)}`, { cache: 'no-store' })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load leads')
    setLeads(data.leads || [])
    setAnalytics(data.analytics || { total: 0, qualified: 0, needsHuman: 0, won: 0 })
    setLoading(false)
  }

  useEffect(() => {
    load().catch(e => {
      setError(e.message)
      setLoading(false)
    })
  }, [storeSlug])

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

  const qLabel = (status: string) => {
    if (!isArabic) return status.replaceAll('_', ' ')
    if (status === 'qualified') return 'مؤهل'
    if (status === 'unqualified') return 'غير مؤهل'
    if (status === 'needs_human') return 'مراجعة بشرية'
    return status
  }

  const cards = isArabic
    ? [['الإجمالي', analytics.total], ['مؤهل', analytics.qualified], ['مراجعة بشرية', analytics.needsHuman], ['تم الفوز', analytics.won]]
    : [['Total', analytics.total], ['Qualified', analytics.qualified], ['Human review', analytics.needsHuman], ['Won', analytics.won]]

  return (
    <main className="min-h-screen bg-paper-50 dark:bg-ink-950 text-ink-950 dark:text-paper-50 px-4 py-6 sm:p-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-7 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-brand-primary font-bold">LeadOps Operator</div>
            <h1 className="text-3xl font-extrabold mt-1">{isArabic ? 'العملاء المحتملون الواردون' : 'Inbound leads'}</h1>
            <p className="text-sm opacity-60 mt-2 max-w-2xl">
              {isArabic ? 'راجع التأهيل، أعطِ الأولوية للحالات المهمة، وسجّل المتابعة والنتيجة من مكان واحد.' : 'Review qualification, prioritize important cases, and track follow-up and outcome from one place.'}
            </p>
          </div>
          <button onClick={() => load().catch(e => setError(e.message))} className="self-start sm:self-auto px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-bold hover:border-brand-primary transition-colors">
            {loading ? (isArabic ? 'جارٍ التحديث…' : 'Refreshing…') : (isArabic ? 'تحديث' : 'Refresh')}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">
          {cards.map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-ink-800 p-4 sm:p-5 shadow-sm">
              <div className="text-xs opacity-55">{label}</div>
              <div className="text-2xl sm:text-3xl font-extrabold mt-1">{value}</div>
            </div>
          ))}
        </div>

        {error && <div role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500">{error}</div>}

        <div className="space-y-3">
          {!loading && leads.length === 0 && (
            <div className="rounded-2xl border border-dashed border-black/15 dark:border-white/15 p-8 text-center">
              <div className="text-2xl mb-2">📥</div>
              <div className="font-bold">{isArabic ? 'لا توجد فرص واردة بعد' : 'No inbound leads yet'}</div>
              <div className="text-sm opacity-50 mt-1">{isArabic ? 'ستظهر نتائج LeadOps هنا بمجرد إرسال أول طلب.' : 'LeadOps results will appear here after the first submission.'}</div>
            </div>
          )}

          {leads.map(lead => (
            <section key={lead.id} className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-ink-800 p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-[16px]">{lead.name || (isArabic ? 'عميل محتمل بدون اسم' : 'Unnamed lead')}</strong>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-azure font-bold">{lead.score}/100</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 capitalize">{qLabel(lead.qualification_status)}</span>
                    {lead.qualification_status === 'needs_human' && <span className="text-xs px-2.5 py-1 rounded-full border border-attention/25 text-attention-dark dark:text-attention">{isArabic ? 'أولوية مراجعة' : 'Review priority'}</span>}
                  </div>

                  <div className="text-sm opacity-60 mt-2 break-words">{[lead.email, lead.phone, lead.source].filter(Boolean).join(' · ')}</div>

                  <div className="mt-4 rounded-xl bg-black/[0.025] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] p-4">
                    <div className="text-[11px] font-bold opacity-45 mb-1">{isArabic ? 'الاحتياج' : 'Need'}</div>
                    <p className="text-sm leading-6 whitespace-pre-wrap">{lead.need || (isArabic ? 'لم يتم تزويد احتياج.' : 'No use-case supplied.')}</p>
                  </div>

                  <div className="text-xs opacity-50 mt-3 leading-5">{isArabic ? 'سبب التأهيل:' : 'Qualification reason:'} {lead.qualification_reason}</div>
                  <div className="text-[11px] opacity-40 mt-2">{new Date(lead.created_at).toLocaleString(isArabic ? 'ar-SA' : 'en-US')}</div>
                </div>

                <div className="flex flex-wrap lg:flex-col gap-2 lg:min-w-[170px]">
                  {lead.follow_up_status === 'none' && (
                    <button onClick={() => updateLead(lead.id, { followUpStatus: 'pending' })} className="px-3 py-2.5 rounded-lg border border-black/10 dark:border-white/10 text-xs font-bold hover:border-brand-primary transition-colors">{isArabic ? 'أضف للمتابعة' : 'Queue follow-up'}</button>
                  )}
                  {lead.follow_up_status === 'pending' && (
                    <button onClick={() => updateLead(lead.id, { followUpStatus: 'in_progress' })} className="px-3 py-2.5 rounded-lg border border-black/10 dark:border-white/10 text-xs font-bold hover:border-brand-primary transition-colors">{isArabic ? 'ابدأ المتابعة' : 'Start follow-up'}</button>
                  )}
                  {lead.follow_up_status === 'in_progress' && (
                    <button onClick={() => updateLead(lead.id, { followUpStatus: 'done' })} className="px-3 py-2.5 rounded-lg border border-black/10 dark:border-white/10 text-xs font-bold hover:border-brand-primary transition-colors">{isArabic ? 'أكمل المتابعة' : 'Mark done'}</button>
                  )}
                  {lead.conversion_status === 'new' && (
                    <button onClick={() => updateLead(lead.id, { conversionStatus: 'contacted' })} className="px-3 py-2.5 rounded-lg bg-brand-primary text-white text-xs font-bold hover:bg-brand-azure transition-colors">{isArabic ? 'تم التواصل' : 'Mark contacted'}</button>
                  )}
                  {lead.conversion_status === 'contacted' && (
                    <>
                      <button onClick={() => updateLead(lead.id, { conversionStatus: 'won' })} className="px-3 py-2.5 rounded-lg bg-brand-primary text-white text-xs font-bold hover:bg-brand-azure transition-colors">{isArabic ? 'فوز' : 'Won'}</button>
                      <button onClick={() => updateLead(lead.id, { conversionStatus: 'lost' })} className="px-3 py-2.5 rounded-lg border border-black/10 dark:border-white/10 text-xs font-bold hover:border-brand-primary transition-colors">{isArabic ? 'خسارة' : 'Lost'}</button>
                    </>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
