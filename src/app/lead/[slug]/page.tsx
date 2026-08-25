'use client'

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
    if (!isArabic) return status
    if (status === 'qualified') return 'مؤهل'
    if (status === 'unqualified') return 'غير مؤهل'
    if (status === 'needs_human') return 'يحتاج مراجعة بشرية'
    return status
  }

  return (
    <main className="min-h-screen bg-paper-50 dark:bg-ink-950 text-ink-950 dark:text-paper-50 p-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto py-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-gold font-bold">LeadOps Pilot</div>
            <h1 className="text-3xl font-extrabold mt-1">{isArabic ? 'أخبرنا بما تحتاجه' : 'Tell us what you need'}</h1>
          </div>
          <button type="button" onClick={toggleLang} className="px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 text-xs font-semibold hover:border-gold transition-colors">
            {isArabic ? 'EN' : 'عربي'}
          </button>
        </div>
        <p className="text-sm opacity-60 mb-6">
          {isArabic
            ? 'شارك فقط بيانات التواصل التي ترغب بها. نستخدم الإجابات لتأهيل الطلب وتحديد ما إذا كانت المراجعة البشرية مطلوبة.'
            : 'Share only the contact details you want to provide. We use the answers below to qualify the request and decide whether human review is needed.'}
        </p>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-ink-800 p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="text-sm">{isArabic ? 'الاسم (اختياري)' : 'Name (optional)'}<input name="name" maxLength={160} className="mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent p-3" /></label>
            <label className="text-sm">{isArabic ? 'البريد الإلكتروني (اختياري)' : 'Email (optional)'}<input name="email" type="email" maxLength={320} className="mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent p-3" /></label>
            <label className="text-sm md:col-span-2">{isArabic ? 'الهاتف (اختياري)' : 'Phone (optional)'}<input name="phone" maxLength={80} className="mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent p-3" /></label>
          </div>

          <label className="text-sm block">{isArabic ? 'ما الذي تحتاجه؟' : 'What do you need?'}<textarea name="need" required maxLength={3000} rows={5} className="mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent p-3" /></label>

          <div className="grid md:grid-cols-3 gap-4">
            <label className="text-sm">{isArabic ? 'الميزانية' : 'Budget'}<select name="budgetBand" defaultValue="unknown" className="mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent p-3"><option value="unknown">{isArabic ? 'غير متأكد' : 'Not sure'}</option><option value="low">{isArabic ? 'منخفضة' : 'Low'}</option><option value="medium">{isArabic ? 'متوسطة' : 'Medium'}</option><option value="high">{isArabic ? 'مرتفعة' : 'High'}</option></select></label>
            <label className="text-sm">{isArabic ? 'الإطار الزمني' : 'Timeline'}<select name="urgency" defaultValue="unknown" className="mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent p-3"><option value="unknown">{isArabic ? 'غير متأكد' : 'Not sure'}</option><option value="later">{isArabic ? 'لاحقًا' : 'Later'}</option><option value="30d">{isArabic ? 'خلال 30 يومًا' : 'Within 30 days'}</option><option value="7d">{isArabic ? 'خلال 7 أيام' : 'Within 7 days'}</option><option value="now">{isArabic ? 'الآن' : 'Now'}</option></select></label>
            <label className="text-sm">{isArabic ? 'دورك في القرار' : 'Decision role'}<select name="decisionAuthority" defaultValue="unknown" className="mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent p-3"><option value="unknown">{isArabic ? 'غير متأكد' : 'Not sure'}</option><option value="influencer">{isArabic ? 'مؤثر في القرار' : 'Influencer'}</option><option value="decision_maker">{isArabic ? 'صاحب القرار' : 'Decision maker'}</option></select></label>
          </div>

          <button disabled={loading} className="w-full rounded-lg bg-gold text-ink-950 font-bold px-5 py-3 disabled:opacity-60">{loading ? (isArabic ? 'جارٍ التأهيل…' : 'Qualifying…') : (isArabic ? 'إرسال الطلب' : 'Submit request')}</button>
        </form>

        {error && <div className="mt-4 rounded-xl border border-red-500/30 p-4 text-sm text-red-500">{error}</div>}
        {result && (
          <section className="mt-4 rounded-2xl border border-gold/30 bg-gold/10 p-5">
            <div className="flex gap-2 flex-wrap text-xs font-bold mb-3"><span>{isArabic ? 'الدرجة' : 'Score'} {result.score}/100</span><span>·</span><span>{statusLabel(result.qualificationStatus)}</span></div>
            <p className="text-sm">{result.answer}</p>
            {result.escalated && <p className="text-xs opacity-60 mt-2">{isArabic ? 'تم طلب مراجعة بشرية.' : 'Human review has been requested.'}</p>}
          </section>
        )}
      </div>
    </main>
  )
}
