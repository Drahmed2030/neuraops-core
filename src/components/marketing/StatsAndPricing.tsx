'use client'

import Link from 'next/link'
import { useUI } from '@/lib/ui-context'

export function StatsBand() {
  const { lang } = useUI()
  const isArabic = lang === 'ar'
  const capabilities = isArabic
    ? [
        { value: 'Score', label: 'تأهيل بدرجة واضحة' },
        { value: 'AI', label: 'رد مساعد مع fallback آمن' },
        { value: 'Human', label: 'تصعيد للحالات المهمة' },
        { value: 'Pilot', label: 'قياس متابعة ونتائج فعلية' },
      ]
    : [
        { value: 'Score', label: 'Explainable qualification score' },
        { value: 'AI', label: 'AI-assisted response with fallback' },
        { value: 'Human', label: 'Handoff for important cases' },
        { value: 'Pilot', label: 'Follow-up and outcome tracking' },
      ]

  return (
    <section className="py-16 px-5 bg-black/[0.02] dark:bg-white/[0.02] border-y border-black/[0.07] dark:border-white/[0.07]">
      <div className="max-w-5xl mx-auto mb-8 text-center">
        <p className="text-[12px] font-semibold tracking-[0.12em] uppercase text-ink-950/45 dark:text-paper-50/45 font-sans">
          {isArabic ? 'قدرات المنتج — بدون ادعاءات نتائج غير موثقة' : 'Product capabilities — no fabricated performance claims'}
        </p>
      </div>
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {capabilities.map((item) => (
          <div key={item.label}>
            <div className="text-[28px] font-extrabold font-sans tracking-tight text-gold mb-1.5">{item.value}</div>
            <div className="text-[13.5px] text-ink-950/55 dark:text-paper-50/55">{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function PricingSection() {
  const { lang } = useUI()
  const isArabic = lang === 'ar'

  const included = isArabic
    ? ['14 يومًا', 'سير عمل وارد واحد', 'إعداد وتأهيل أولي يدوي', 'لوحة عملاء محتملين', 'قياس التأهيل والمتابعة', 'دعم مباشر أثناء الـPilot']
    : ['14 days', 'One inbound workflow', 'Founder-led onboarding', 'Lead operator view', 'Qualification & follow-up tracking', 'Direct pilot support']

  return (
    <section id="pilot" className="px-5 py-20 sm:px-10 sm:py-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-[12px] font-bold tracking-[0.15em] uppercase mb-4 text-gold font-sans">
            {isArabic ? 'العرض الأول' : 'First paid offer'}
          </div>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.6rem)] font-extrabold tracking-tight mb-4">
            {isArabic ? 'LeadOps Pilot لمدة 14 يومًا' : '14-day LeadOps Pilot'}
          </h2>
          <p className="text-[16px] leading-relaxed text-ink-950/60 dark:text-paper-50/60">
            {isArabic
              ? 'نبدأ بسير عمل واحد فقط، نثبت أنه يساعدك فعليًا على تأهيل الطلبات الواردة ومتابعتها، ثم نقرر معك ما يستحق التوسع.'
              : 'We start with one inbound workflow, prove whether it improves qualification and follow-up, then decide together what is worth expanding.'}
          </p>
        </div>

        <div className="max-w-3xl mx-auto rounded-[24px] border-2 border-gold bg-gradient-to-b from-gold/8 to-transparent p-8 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-8">
            <div>
              <div className="text-[20px] font-extrabold mb-2">{isArabic ? 'Founder-led Pilot' : 'Founder-led Pilot'}</div>
              <div className="text-[14px] text-ink-950/55 dark:text-paper-50/55 max-w-xl">
                {isArabic
                  ? 'مصمم للشركات الخدمية الصغيرة والوكالات والاستشارات التي تتلقى عملاء محتملين واردين ذوي قيمة.'
                  : 'Designed for small service businesses, agencies, and consultancies with valuable inbound leads.'}
              </div>
            </div>
            <div className="sm:text-right">
              <div className="text-[12px] uppercase tracking-[0.12em] text-ink-950/45 dark:text-paper-50/45 mb-1">
                {isArabic ? 'نطاق التحقق المبدئي' : 'Initial validation range'}
              </div>
              <div className="text-[30px] font-extrabold text-gold">$149–299</div>
              <div className="text-[11px] opacity-45 mt-1">{isArabic ? 'يُثبت مع العميل قبل أي تسعير عام' : 'Confirmed with each prospect before public pricing'} </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mb-8">
            {included.map((item) => (
              <div key={item} className="flex gap-2 items-start rounded-xl bg-white/60 dark:bg-ink-800/60 border border-black/[0.06] dark:border-white/[0.06] p-3.5 text-[13px]">
                <span className="text-gold font-bold">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/lead/demo-store" className="flex-1 text-center py-3.5 rounded-xl bg-gold text-ink-950 font-bold text-[14px] hover:bg-gold-hover transition-colors">
              {isArabic ? 'جرّب سير العمل' : 'Try the workflow'}
            </Link>
            <Link href="/trial" className="flex-1 text-center py-3.5 rounded-xl border-[1.5px] border-black/10 dark:border-white/10 font-bold text-[14px] hover:border-gold transition-colors">
              {isArabic ? 'ابدأ إعداد Pilot' : 'Start pilot setup'}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
