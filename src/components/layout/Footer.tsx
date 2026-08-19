'use client'

import { useUI } from '@/lib/ui-context'

export function Footer() {
  const { t } = useUI()
  return (
    <footer className="px-5 py-12 sm:px-10 border-t border-black/[0.07] dark:border-white/[0.07]">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 font-semibold text-[16px] mb-3 font-sans">
          <span className="w-7 h-7 bg-gold text-ink-950 rounded-lg flex items-center justify-center font-bold text-[13px]">
            N
          </span>
          {t.brand}
        </div>
        <p className="text-[13px] text-ink-950/50 dark:text-paper-50/50 max-w-[280px] mb-8 font-sans">
          {t.footerTagline}
        </p>
        <div className="pt-6 border-t border-black/[0.07] dark:border-white/[0.07] text-[13px] text-ink-950/50 dark:text-paper-50/50">
          {t.footerRights}
        </div>
      </div>
    </footer>
  )
}
