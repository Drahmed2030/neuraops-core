'use client'

import { useUI } from '@/lib/ui-context'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/marketing/Hero'
import { AgentsSection } from '@/components/marketing/AgentsSection'
import { StatsBand, PricingSection } from '@/components/marketing/StatsAndPricing'
import { WhatsAppComingSoon } from '@/components/marketing/WhatsAppComingSoon'

export default function LandingPage() {
  const { t } = useUI()
  const isArabic = t.lang === 'ar'

  return (
    <>
      <Header variant="marketing" />
      <main>
        <Hero />

        <section className="px-5 py-10 text-center">
          <div className="text-[12px] font-semibold tracking-[0.15em] uppercase mb-4 text-ink-950/40 dark:text-paper-50/40 font-sans">
            {isArabic ? 'مرحلة التحقق التجريبي' : 'Pilot validation stage'}
          </div>
          <p className="max-w-2xl mx-auto text-[14px] leading-relaxed text-ink-950/55 dark:text-paper-50/55">
            {isArabic
              ? 'NeuraOps في مرحلة تجريبية مبكرة. الأمثلة والسيناريوهات المعروضة توضيحية ولا تمثل أسماء عملاء أو نتائج إنتاج موثقة.'
              : 'NeuraOps is in an early pilot stage. Examples and scenarios shown are illustrative and do not represent verified customer names or production results.'}
          </p>
        </section>

        <AgentsSection />
        <WhatsAppComingSoon />
        <StatsBand />
        <PricingSection />
      </main>
      <Footer />
    </>
  )
}
