'use client'

import { useUI } from '@/lib/ui-context'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/marketing/Hero'
import { AgentsSection } from '@/components/marketing/AgentsSection'
import { StatsBand, PricingSection } from '@/components/marketing/StatsAndPricing'

export default function LandingPage() {
  const { lang } = useUI()
  const isArabic = lang === 'ar'

  return (
    <>
      <Header variant="marketing" />
      <main>
        <Hero />

        <section className="px-5 py-10 text-center">
          <div className="text-[12px] font-semibold tracking-[0.15em] uppercase mb-4 text-ink-950/40 dark:text-paper-50/40 font-sans">
            {isArabic ? 'مرحلة Pilot تجارية' : 'Commercial pilot stage'}
          </div>
          <p className="max-w-2xl mx-auto text-[14px] leading-relaxed text-ink-950/55 dark:text-paper-50/55">
            {isArabic
              ? 'LeadOps منتج مبكر جاهز للتجربة المدفوعة مع نطاق محدود وواضح. الأمثلة المعروضة توضيحية، ولا ندّعي عملاء أو نتائج أو نسب تحويل غير موثقة.'
              : 'LeadOps is an early product ready for a narrow paid pilot. Examples are illustrative; we do not claim unverified customers, outcomes, or conversion rates.'}
          </p>
        </section>

        <AgentsSection />
        <StatsBand />
        <PricingSection />
      </main>
      <Footer />
    </>
  )
}
