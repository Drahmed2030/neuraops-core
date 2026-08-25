'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useUI } from '@/lib/ui-context'

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
  const { lang, toggleLang } = useUI()
  const isArabic = lang === 'ar'
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
      if (!response.ok) throw new Error(data.error || (isArabic ? 'تعذر تأهيل الطلب' : 'Qualification failed'))
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : (isArabic ? 'تعذر تأهيل الطلب' : 'Qualification failed'))
    } finally {
      setLoading(false)
    }
  }

  const statusLabel = (status: string) => {
    if (!isArabic) return status.replaceAll('_', ' ')
    if (status === 'qualified') return 'مؤهل'
    if (status === 'unqualified') return 'غير مؤهل'
    if (status === 'needs_human') return 'يحتاج مراجعة بشرية'
    return status
  }

  const inputClass = 'mt-1.5 w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.025] px-3.5 py-3 outline-none transition focus:border-gold/60 focus:ring-2 focus:ring-gold/10'

  return (
    <main className="min-h-screen bg-paper-50 dark:bg-ink-950 text-ink-950 dark:text-paper-50 px-4 py-5 sm:p-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto py-4 sm:py-8">
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link href="/" className="flex items-center gap-2.5 font-semibold no-underline">
            <span className="w-8 h-8 bg-gold text-ink-950 rounded-xl flex items-center justify-center font-extrabold text-[13px] font-sans">N</span>
            <span className="font-sans">NeuraOps</span>
          </Link>
          <button type="button" onClick={toggleLang} className="px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold hover:border-gold transition-colors">
            {isArabic ? 'EN' : 'عربي'}
          </button>
        </div>

        <div className="mb-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-3 py-1.5 text-[11px] font-bold text-gold mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            {isArabic ? 'LeadOps · تجربة تأهيل حقيقية' : 'LeadOps · Live qualification demo'}
          </div>
          <h1 className="text-[clamp(2rem,8vw,2.65rem)] leading-[1.15] font-extrabold tracking-tight">
            {isArabic ? 'أخبرنا عن الفرصة الواردة' : 'Tell us about the inbound opportunity'}
          </h1>
          <p className="text-[14px] sm:text-[15px] leading-7 opacity-60 mt-3 max-w-xl">
            {isArabic
              ? 'يستغرق أقل من دقيقتين. نستخدم إجاباتك لتقدير الأولوية، تحديد مستوى التأهيل، ومعرفة متى يجب أن يراجع الطلب شخص حقيقي.'
              : 'It takes under two minutes. We use your answers to estimate priority, determine qualification, and decide when a human should review the request.'}
          </p>
        </div>

        {!result && (
          <form onSubmit={submit} className="space-y-5 rounded-[24px] border border-black/10 dark:border-white/10 bg-white dark:bg-ink-800 p-5 sm:p-7 shadow-sm">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold mb-3">{isArabic ? '1 · بيانات التواصل' : '1 · Contact details'}</div>
              <div className="grid md:grid-cols-2 gap-4">
                <label className="text-sm font-medium">{isArabic ? 'الاسم' : 'Name'} <span className="opacity-40 font-normal">({isArabic ? 'اختياري' : 'optional'})</span><input name="name" maxLength={160} className={inputClass} /></label>
                <label className="text-sm font-medium">{isArabic ? 'البريد الإلكتروني' : 'Email'} <span className="opacity-40 font-normal">({isArabic ? 'اختياري' : 'optional'})</span><input name="email" type="email" inputMode="email" maxLength={320} className={inputClass} /></label>
                <label className="text-sm font-medium md:col-span-2">{isArabic ? 'الهاتف' : 'Phone'} <span className="opacity-40 font-normal">({isArabic ? 'اختياري' : 'optional'})</span><input name="phone" inputMode="tel" maxLength={80} className={inputClass} /></label>
              </div>
              <p className="text-[11px] opacity-45 mt-3">{isArabic ? 'شارك فقط بيانات التواصل التي ترغب بتقديمها.' : 'Only share the contact details you are comfortable providing.'}</p>
            </div>

            <div className="border-t border-black/[0.06] dark:border-white/[0.06] pt-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold mb-3">{isArabic ? '2 · الاحتياج' : '2 · Need'}</div>
              <label className="text-sm font-medium block">{isArabic ? 'ما الذي تحتاجه؟' : 'What do you need?'}<textarea name="need" required maxLength={3000} rows={5} placeholder={isArabic ? 'مثال: نحتاج نظامًا يؤهل العملاء المحتملين الواردين قبل أن يتواصل معهم فريق المبيعات…' : 'Example: We need a system that qualifies inbound leads before our sales team follows up…'} className={inputClass} /></label>
            </div>

            <div className="border-t border-black/[0.06] dark:border-white/[0.06] pt-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold mb-3">{isArabic ? '3 · أولوية الفرصة' : '3 · Opportunity priority'}</div>
              <div className="grid sm:grid-cols-3 gap-4">
                <label className="text-sm font-medium">{isArabic ? 'الميزانية' : 'Budget'}<select name="budgetBand" defaultValue="unknown" className={inputClass}><option value="unknown">{isArabic ? 'غير متأكد' : 'Not sure'}</option><option value="low">{isArabic ? 'منخفضة' : 'Low'}</option><option value="medium">{isArabic ? 'متوسطة' : 'Medium'}</option><option value="high">{isArabic ? 'مرتفعة' : 'High'}</option></select></label>
                <label className="text-sm font-medium">{isArabic ? 'الإطار الزمني' : 'Timeline'}<select name="urgency" defaultValue="unknown" className={inputClass}><option value="unknown">{isArabic ? 'غير متأكد' : 'Not sure'}</option><option value="later">{isArabic ? 'لاحقًا' : 'Later'}</option><option value="30d">{isArabic ? 'خلال 30 يومًا' : 'Within 30 days'}</option><option value="7d">{isArabic ? 'خلال 7 أيام' : 'Within 7 days'}</option><option value="now">{isArabic ? 'الآن' : 'Now'}</option></select></label>
                <label className="text-sm font-medium">{isArabic ? 'دورك في القرار' : 'Decision role'}<select name="decisionAuthority" defaultValue="unknown" className={inputClass}><option value="unknown">{isArabic ? 'غير متأكد' : 'Not sure'}</option><option value="influencer">{isArabic ? 'مؤثر في القرار' : 'Influencer'}</option><option value="decision_maker">{isArabic ? 'صاحب القرار' : 'Decision maker'}</option></select></label>
              </div>
            </div>

            <button disabled={loading} className="w-full rounded-xl bg-gold text-ink-950 font-extrabold px-5 py-3.5 text-[14px] disabled:opacity-60 hover:bg-gold-hover transition-colors shadow-gold-glow">
              {loading ? (isArabic ? 'جارٍ التأهيل…' : 'Qualifying…') : (isArabic ? 'حلّل هذه الفرصة' : 'Qualify this opportunity')}
            </button>
          </form>
        )}

        {error && <div role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500">{error}</div>}

        {result && (
          <section className="rounded-[24px] border border-gold/30 bg-white dark:bg-ink-800 p-5 sm:p-7 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold mb-2">{isArabic ? 'نتيجة التأهيل' : 'Qualification result'}</div>
                <h2 className="text-2xl font-extrabold">{statusLabel(result.qualificationStatus)}</h2>
              </div>
              <div className="rounded-2xl bg-gold/10 border border-gold/25 px-4 py-3 text-center min-w-[92px]">
                <div className="text-2xl font-extrabold text-gold">{result.score}</div>
                <div className="text-[10px] opacity-55">{isArabic ? 'من 100' : 'out of 100'}</div>
              </div>
            </div>

            <div className="rounded-2xl bg-black/[0.025] dark:bg-white/[0.035] border border-black/[0.05] dark:border-white/[0.05] p-4 sm:p-5">
              <div className="text-[11px] font-bold opacity-45 mb-2">{isArabic ? 'رد LeadOps' : 'LeadOps response'}</div>
              <p className="text-[14px] leading-7">{result.answer}</p>
            </div>

            <div className="mt-5 rounded-2xl border border-black/[0.07] dark:border-white/[0.07] p-4 flex gap-3 items-start">
              <span className="text-lg">{result.escalated ? '🤝' : '✓'}</span>
              <div>
                <div className="text-sm font-bold">{result.escalated ? (isArabic ? 'تم طلب مراجعة بشرية' : 'Human review requested') : (isArabic ? 'تم تسجيل النتيجة' : 'Result recorded')}</div>
                <p className="text-xs opacity-55 mt-1 leading-5">
                  {result.escalated
                    ? (isArabic ? 'تم حفظ الطلب وإحالته للمراجعة البشرية بدل الاعتماد على AI وحده.' : 'The request was saved and routed for human review instead of relying on AI alone.')
                    : (isArabic ? 'تم حفظ نتيجة التأهيل ويمكن لفريق التشغيل متابعتها من لوحة LeadOps.' : 'The qualification result was saved and can be followed from the LeadOps operator view.')}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link href="/" className="flex-1 text-center rounded-xl bg-gold text-ink-950 font-bold px-5 py-3.5 hover:bg-gold-hover transition-colors">
                {isArabic ? 'العودة إلى NeuraOps' : 'Back to NeuraOps'}
              </Link>
              <button type="button" onClick={() => setResult(null)} className="flex-1 rounded-xl border border-black/10 dark:border-white/10 font-bold px-5 py-3.5 hover:border-gold transition-colors">
                {isArabic ? 'مراجعة البيانات' : 'Review submission'}
              </button>
            </div>
          </section>
        )}

        <div className="mt-6 text-center text-[11px] leading-5 opacity-40">
          {isArabic ? 'تجربة Pilot محدودة — لا ندّعي نتائج أو نسب تحويل غير موثقة.' : 'Limited pilot experience — no fabricated customer results or conversion claims.'}
        </div>
      </div>
    </main>
  )
}
