'use client'

import { BrandMark } from '@/components/brand/BrandMark'
import { useUI } from '@/lib/ui-context'

export function Footer() {
  const { t, lang } = useUI()
  const tagline = lang === 'ar'
    ? 'تأهيل ومتابعة العملاء المحتملين بوضوح، مع تدخل بشري عند الحاجة.'
    : 'Clear lead qualification and follow-up, with human handoff when needed.'

  return (
    <footer className="px-5 py-12 sm:px-10 border-t border-black/[0.07] dark:border-white/[0.07]">
      <div className="max-w-6xl mx-auto">
        <div className="mb-3">
          <BrandMark size={30} />
        </div>
        <p className="text-[13px] text-ink-950/50 dark:text-paper-50/50 max-w-[360px] mb-8 font-sans">
          {tagline}
        </p>
        <div className="pt-6 border-t border-black/[0.07] dark:border-white/[0.07] text-[13px] text-ink-950/50 dark:text-paper-50/50">
          {t.footerRights}
        </div>
      </div>
    </footer>
  )
}
