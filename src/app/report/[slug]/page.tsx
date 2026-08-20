'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useUI } from '@/lib/ui-context'
import { Header } from '@/components/layout/Header'
import { ProofReportView } from '@/components/proof-report/ProofReportView'

export default function ReportPage() {
  const { t, lang } = useUI()
  const params = useParams()
  const storeSlug = params?.slug as string
  const [activeDay, setActiveDay] = useState<3 | 6 | 7>(7)

  return (
    <div className="min-h-screen">
      <Header variant="marketing" />

      <main className="max-w-[720px] mx-auto px-5 py-10">
        <div className="text-center mb-8">
          <div className="text-[12.5px] font-semibold text-gold uppercase tracking-wide mb-2.5 font-sans">
            {lang === 'ar' ? 'تقرير الأداء' : 'Performance Report'}
          </div>
          <h1 className="text-[clamp(1.5rem,4vw,1.9rem)] font-bold tracking-tight mb-2.5">
            {lang === 'ar' ? 'ماذا أنجز مساعدك الذكي؟' : 'What did your AI assistant accomplish?'}
          </h1>
          <p className="text-[14.5px] text-ink-950/60 dark:text-paper-50/60 max-w-[460px] mx-auto leading-relaxed">
            {lang === 'ar'
              ? 'بيانات حقيقية من محادثاتك الفعلية — لا أرقام تقديرية.'
              : 'Real data from your actual conversations — not estimated numbers.'}
          </p>
        </div>

        {/* Day selector */}
        <div className="flex justify-center gap-2 mb-7">
          {([3, 6, 7] as const).map(day => (
            <button
              key={day}
              type="button"
              onClick={() => setActiveDay(day)}
              className={`px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                activeDay === day
                  ? 'bg-gold text-ink-950'
                  : 'bg-white dark:bg-ink-800 border border-black/[0.07] dark:border-white/[0.07] text-ink-950/50 dark:text-paper-50/50'
              }`}
            >
              {lang === 'ar' ? `اليوم ${day}` : `Day ${day}`}
            </button>
          ))}
        </div>

        <ProofReportView storeSlug={storeSlug} day={activeDay} />
      </main>
    </div>
  )
}
