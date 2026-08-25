'use client'

import Link from 'next/link'
import { useUI } from '@/lib/ui-context'

export function StatsBand() {
  const { t, lang } = useUI()
  const isArabic = lang === 'ar'
  const capabilities = isArabic
    ? [
        { value: 'Demo', label: 'بيئة عرض تجريبية' },
        { value: 'AI', label: 'توجيه بين وكلاء متخصصين' },
        { value: 'Human', label: 'تصعيد بشري عند الحاجة' },
        { value: 'Pilot', label: 'سير عمل جاهز للتجربة' },
      ]
    : [
        { value: 'Demo', label: 'Demo environment' },
        { value: 'AI', label: 'Specialized agent routing' },
        { value: 'Human', label: 'Escalation when needed' },
        { value: 'Pilot', label: 'Pilot-ready workflow' },
      ]

  return (
    <section className="py-16 px-5 bg-black/[0.02] dark:bg-white/[0.02] border-y border-black/[0.07] dark:border-white/[0.07]">
      <div className="max-w-5xl mx-auto mb-8 text-center">
        <p className="text-[12px] font-semibold tracking-[0.12em] uppercase text-ink-950/45 dark:text-paper-50/45 font-sans">
          {isArabic ? 'قدرات توضيحية — وليست نتائج إنتاج حقيقية' : 'Illustrative capabilities — not production results'}
        </p>
      </div>
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {capabilities.map((item) => (
          <div key={item.label}>
            <div className="text-[28px] font-extrabold font-sans tracking-tight text-gold mb-1.5">
              {item.value}
            </div>
            <div className="text-[13.5px] text-ink-950/55 dark:text-paper-50/55">{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function PricingSection() {
  const { t, lang } = useUI()
  const isArabic = lang === 'ar'

  const plans = [
    { name: t.planPilotName, desc: t.planPilotDesc, price: t.planPilotPrice, period: t.planPilotPeriod, featured: false, cta: t.planCtaFree },
    { name: t.planStarterName, desc: t.planStarterDesc, price: t.planStarterPrice, period: t.planStarterPeriod, featured: true, cta: t.planCta },
    { name: t.planProName, desc: t.planProDesc, price: t.planProPrice, period: t.planProPeriod, featured: false, cta: t.planCta },
  ]

  return (
    <section className="px-5 py-20 sm:px-10 sm:py-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-14">
          <div className="text-[12px] font-bold tracking-[0.15em] uppercase mb-4 text-gold font-sans">
            {t.pricingEyebrow}
          </div>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.6rem)] font-extrabold tracking-tight mb-4">
            {t.pricingTitle}
          </h2>
          <p className="text-[16px] leading-relaxed text-ink-950/60 dark:text-paper-50/60">
            {t.pricingSub}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`relative p-9 rounded-[20px] border ${
                plan.featured
                  ? 'border-2 border-gold bg-gradient-to-b from-gold/8 to-transparent'
                  : 'border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 right-8 bg-gold text-ink-950 text-[11px] font-extrabold px-3.5 py-1 rounded-full">
                  {isArabic ? 'الخطة المقترحة' : 'Recommended Plan'}
                </div>
              )}
              <div className="text-[18px] font-bold mb-2">{plan.name}</div>
              <div className="text-[13px] text-ink-950/55 dark:text-paper-50/55 mb-6">{plan.desc}</div>
              <div className="flex items-baseline gap-1.5 mb-7">
                <span className="text-[38px] font-extrabold font-sans tracking-tight">{plan.price}</span>
                <span className="text-[14px] text-ink-950/50 dark:text-paper-50/50">{plan.period}</span>
              </div>
              <Link
                href="/trial"
                className={`block text-center w-full py-3.5 rounded-xl font-bold text-[14px] transition-all ${
                  plan.featured
                    ? 'bg-gold text-ink-950 hover:bg-gold-hover'
                    : 'border-[1.5px] border-black/10 dark:border-white/10 hover:border-gold'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
