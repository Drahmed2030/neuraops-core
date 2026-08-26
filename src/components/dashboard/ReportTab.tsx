'use client'

import { useState } from 'react'
import { useUI } from '@/lib/ui-context'
import { ProofReportView } from '@/components/proof-report/ProofReportView'

/**
 * Dashboard's Report tab. Currently hardcoded to the demo store slug
 * used throughout the rest of the dashboard (matches ChatTab's
 * DEMO_STORE_ID) until a real logged-in store-owner session exists.
 */
const DASHBOARD_STORE_SLUG = 'demo-store'

export function ReportTab() {
  const { t, lang } = useUI()
  const [activeDay, setActiveDay] = useState<3 | 6 | 7>(7)

  return (
    <div>
      <h1 className="text-[24px] font-extrabold tracking-tight mb-1">
        {lang === 'ar' ? 'تقرير أسبوع الإثبات' : 'Proof Week Report'}
      </h1>
      <p className="text-[13.5px] text-ink-950/55 dark:text-paper-50/55 mb-6">
        {lang === 'ar' ? 'بيانات حقيقية من محادثات متجرك الفعلية' : 'Real data from your store\'s actual conversations'}
      </p>

      <div className="flex gap-2 mb-6">
        {([3, 6, 7] as const).map(day => (
          <button
            key={day}
            type="button"
            onClick={() => setActiveDay(day)}
            className={`px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
              activeDay === day
                ? 'bg-brand-primary text-ink-950'
                : 'bg-white dark:bg-ink-800 border border-black/[0.07] dark:border-white/[0.07] text-ink-950/50 dark:text-paper-50/50'
            }`}
          >
            {lang === 'ar' ? `اليوم ${day}` : `Day ${day}`}
          </button>
        ))}
      </div>

      <ProofReportView storeSlug={DASHBOARD_STORE_SLUG} day={activeDay} />
    </div>
  )
}
