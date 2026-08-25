'use client'

import Link from 'next/link'
import { useUI } from '@/lib/ui-context'

export function Hero() {
  const { lang } = useUI()
  const isArabic = lang === 'ar'

  const credibilityItems = isArabic
    ? ['تأهيل واضح وقابل للقياس', 'تصعيد بشري للحالات المهمة', 'عربي + English']
    : ['Deterministic qualification', 'Human handoff for important leads', 'Arabic + English']

  return (
    <section className="relative overflow-hidden px-5 pt-10 pb-16 sm:px-10 sm:pt-20 sm:pb-24">
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

      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-semibold mb-5 sm:mb-6 bg-gold/10 border border-gold/25 text-gold font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse-dot" />
            {isArabic ? 'LeadOps · برنامج تجريبي لمدة 14 يومًا' : 'LeadOps · 14-day founder-led pilot'}
          </div>

          <h1 className="text-[clamp(2rem,10vw,3.6rem)] font-extrabold leading-[1.12] tracking-tight mb-5 sm:mb-6 max-w-3xl">
            {isArabic ? (
              <>
                حوّل العملاء المحتملين الواردين
                <br className="hidden sm:block" />
                {' '}إلى فرص <span className="text-gold">مؤهلة وقابلة للمتابعة</span>
              </>
            ) : (
              <>
                Turn inbound leads
                <br className="hidden sm:block" />
                {' '}into <span className="text-gold">qualified opportunities</span>
              </>
            )}
          </h1>

          <p className="text-[16px] sm:text-[17px] leading-[1.75] max-w-[600px] mb-7 sm:mb-8 text-ink-950/65 dark:text-paper-50/65">
            {isArabic
              ? 'NeuraOps يلتقط الطلب، يؤهل العميل المحتمل بقواعد واضحة، يعطيه درجة، ثم يوجّه الحالات المهمة أو غير الواضحة إلى شخص حقيقي — بدون تحويل عملك إلى مشروع CRM ضخم.'
              : 'NeuraOps captures the request, qualifies it with explicit rules, scores the lead, and routes important or ambiguous cases to a human — without forcing your team into a heavyweight CRM project.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-8 sm:mb-10">
            <Link
              href="/lead/demo-store"
              className="w-full sm:w-auto justify-center px-7 py-3.5 rounded-xl bg-gold text-ink-950 font-bold text-[14.5px] hover:bg-gold-hover hover:-translate-y-0.5 transition-all shadow-gold-glow flex items-center gap-2"
            >
              {isArabic ? 'جرّب LeadOps الآن' : 'Try LeadOps now'} {isArabic ? '←' : '→'}
            </Link>
            <a
              href="#pilot"
              className="w-full sm:w-auto text-center px-7 py-3.5 rounded-xl border-[1.5px] border-black/10 dark:border-white/10 font-semibold text-[14.5px] hover:border-gold transition-colors"
            >
              {isArabic ? 'شاهد تفاصيل الـPilot' : 'See the pilot offer'}
            </a>
          </div>

          <div className="flex flex-wrap gap-2.5 sm:gap-3">
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
  const { lang } = useUI()
  const isArabic = lang === 'ar'

  return (
    <div className="relative mt-2 lg:mt-0">
      <div className="absolute -top-3 right-3 sm:-top-4 sm:-right-4 px-4 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-1.5 shadow-lg bg-white dark:bg-ink-800 border border-gold text-gold z-10">
        ✨ LeadOps Demo
      </div>
      <div className="rounded-[20px] overflow-hidden border border-black/10 dark:border-white/10 bg-white dark:bg-ink-800 shadow-2xl">
        <div className="px-5 py-4 flex items-center justify-between border-b border-black/[0.07] dark:border-white/[0.07]">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          </div>
          <div className="text-[11px] font-semibold text-gold font-sans">
            {isArabic ? 'سيناريو توضيحي' : 'Illustrative scenario'}
          </div>
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          <div className="rounded-xl p-4 bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05]">
            <div className="text-[11px] opacity-50 mb-1">{isArabic ? 'طلب وارد' : 'Inbound request'}</div>
            <div className="text-[13px] leading-relaxed">
              {isArabic
                ? 'نحتاج أتمتة استقبال وتأهيل العملاء المحتملين خلال هذا الشهر، وأنا صاحب القرار.'
                : 'We need to automate inbound lead qualification this month, and I am the decision maker.'}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl p-3 bg-gold/10 border border-gold/20 text-center">
              <div className="text-xl font-extrabold text-gold">85</div>
              <div className="text-[10px] opacity-55">{isArabic ? 'درجة' : 'Score'}</div>
            </div>
            <div className="rounded-xl p-3 bg-gold/10 border border-gold/20 text-center">
              <div className="text-[12px] font-extrabold text-gold">{isArabic ? 'مؤهل' : 'Qualified'}</div>
              <div className="text-[10px] opacity-55">{isArabic ? 'الحالة' : 'Status'}</div>
            </div>
            <div className="rounded-xl p-3 bg-black/[0.03] dark:bg-white/[0.03] text-center">
              <div className="text-[12px] font-extrabold">Human</div>
              <div className="text-[10px] opacity-55">{isArabic ? 'عند الحاجة' : 'When needed'}</div>
            </div>
          </div>
          <div className="text-[11px] text-ink-950/45 dark:text-paper-50/45">
            {isArabic ? 'مثال توضيحي — ليس نتيجة عميل حقيقية.' : 'Illustrative example — not a customer result.'}
          </div>
        </div>
      </div>
    </div>
  )
}
