'use client'

import { useUI } from '@/lib/ui-context'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Hero } from '@/components/marketing/Hero'
import { AgentsSection } from '@/components/marketing/AgentsSection'
import { StatsBand, PricingSection } from '@/components/marketing/StatsAndPricing'

export default function LandingPage() {
  const { t } = useUI()

  return (
    <>
      <Header variant="marketing" />
      <main>
        <Hero />

        <section className="px-5 py-10 text-center">
          <div className="text-[12px] font-semibold tracking-[0.15em] uppercase mb-7 text-ink-950/40 dark:text-paper-50/40 font-sans">
            {t.trustLabel}
          </div>
          <div className="flex justify-center gap-10 flex-wrap opacity-50 font-sans font-bold text-[17px] tracking-tight">
            <span>القصيم كافيه</span>
            <span>نكهات</span>
            <span>أصالة</span>
            <span>بريدة مول</span>
            <span>دلة</span>
          </div>
        </section>

        <AgentsSection />
        <StatsBand />
        <PricingSection />
      </main>
      <Footer />
    </>
  )
}
