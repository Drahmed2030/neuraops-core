'use client'

import Link from 'next/link'
import { useUI } from '@/lib/ui-context'

export function Hero() {
  const { t } = useUI()
  const isArabic = t.lang === 'ar'

  const credibilityItems = isArabic
    ? ['بيئة عرض تجريبية', 'وكلاء ذكاء اصطناعي متخصصون', 'تصعيد بشري عند الحاجة']
    : ['Demo environment', 'Specialized AI agents', 'Human escalation when needed']

  return (
    <section className="relative overflow-hidden px-5 pt-10 pb-16 sm:px-10 sm:pt-20 sm:pb-24">
      {/* Background mesh */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 70% 50% at 80% 0%, rgba(201,169,97,0.10) 0%, transparent 55%),
            linear-gradient(rgba(201,169,97,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,169,97,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 56px 56px, 56px 56px',
        }}
      />

      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-semibold mb-6 bg-gold/10 border border-gold/25 text-gold font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse-dot" />
            {t.heroEyebrow}
          </div>

          <h1 className="text-[clamp(2rem,5vw,3.6rem)] font-extrabold leading-[1.15] tracking-tight mb-6">
            {t.heroTitleLine1}
            <br />
            {t.heroTitleLine2} <span className="text-gold">{t.heroTitleAccent}</span>
            <br />
            {t.heroTitleLine3}
          </h1>

          <p className="text-[17px] leading-[1.7] max-w-[520px] mb-8 text-ink-950/65 dark:text-paper-50/65">
            {t.heroSub}
          </p>

          <div className="flex flex-wrap gap-3 mb-12">
            <Link
              href="/trial"
              className="px-7 py-3.5 rounded-xl bg-gold text-ink-950 font-bold text-[14.5px] hover:bg-gold-hover hover:-translate-y-0.5 transition-all shadow-gold-glow flex items-center gap-2"
            >
              {t.ctaPrimary} ←
            </Link>
            <Link
              href="/demo/demo-store"
              className="px-7 py-3.5 rounded-xl border-[1.5px] border-black/10 dark:border-white/10 font-semibold text-[14.5px] hover:border-gold transition-colors"
            >
              {t.ctaSecondary}
            </Link>
          </div>

          <div className="flex flex-wrap gap-3">
            {credibilityItems.map((item) => (
              <div
                key={item}
                className="px-3.5 py-2 rounded-lg text-[12px] font-medium bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.07] text-ink-950/65 dark:text-paper-50/65"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <HeroVisual />
      </div>
    </section>
  )
}

function HeroVisual() {
  const { t } = useUI()
  const isArabic = t.lang === 'ar'

  return (
    <div className="relative">
      <div className="absolute -top-4 -right-4 px-4 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 shadow-lg bg-white dark:bg-ink-800 border border-gold text-gold z-10">
        ✨ {isArabic ? 'عرض تجريبي' : 'Demo'}
      </div>
      <div className="rounded-[20px] overflow-hidden border border-black/10 dark:border-white/10 bg-white dark:bg-ink-800 shadow-2xl">
        <div className="px-5 py-4 flex items-center justify-between border-b border-black/[0.07] dark:border-white/[0.07]">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gold font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse-dot" />
            {isArabic ? 'سيناريو توضيحي' : 'Illustrative scenario'}
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2.5 items-start">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10">
              👤
            </div>
            <div className="px-3.5 py-2.5 rounded-xl text-[13px] max-w-[80%] bg-black/5 dark:bg-white/5">
              وين طلبي؟ رقمه #NEX-78421
            </div>
          </div>
          <div className="flex gap-2.5 items-start">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 bg-gold/10 border border-gold/25">
              🧠
            </div>
            <div className="px-3.5 py-2.5 rounded-xl text-[13px] leading-relaxed max-w-[80%] bg-gold/10 border border-gold/15">
              طلبك قيد التجهيز حالياً، وسيتم شحنه خلال ٢٤ ساعة. سأخبرك فور الشحن تلقائياً ✅
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-4 mt-2 border-t border-black/[0.07] dark:border-white/[0.07]">
            <div className="rounded-xl p-3.5 bg-black/[0.03] dark:bg-white/[0.03]">
              <div className="text-sm font-extrabold font-sans text-gold">
                {isArabic ? 'بيانات تجريبية' : 'Demo data'}
              </div>
              <div className="text-[11px] text-ink-950/50 dark:text-paper-50/50 mt-0.5">
                {isArabic ? 'ليست نتائج إنتاج حقيقية' : 'Not production results'}
              </div>
            </div>
            <div className="rounded-xl p-3.5 bg-black/[0.03] dark:bg-white/[0.03]">
              <div className="text-sm font-extrabold font-sans text-gold">
                {isArabic ? 'عرض الوظائف' : 'Feature preview'}
              </div>
              <div className="text-[11px] text-ink-950/50 dark:text-paper-50/50 mt-0.5">
                {isArabic ? 'للتوضيح فقط' : 'Illustrative only'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
