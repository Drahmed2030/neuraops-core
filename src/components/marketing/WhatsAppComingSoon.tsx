'use client'

import { useUI } from '@/lib/ui-context'

/**
 * Marketing-only differentiator banner. No backend behind this —
 * intentionally deferred until a real paying customer exists (see
 * 20 Aug decision). This purely communicates the roadmap to build
 * trust and interest, costs nothing to display.
 */
export function WhatsAppComingSoon() {
  const { lang } = useUI()

  return (
    <section className="px-5 py-10 sm:px-10">
      <div className="max-w-4xl mx-auto rounded-2xl border border-gold/25 bg-gold/[0.06] p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-start">
        <div className="w-14 h-14 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center text-3xl flex-shrink-0">
          💬
        </div>
        <div className="flex-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold text-ink-950 text-[10.5px] font-extrabold mb-2 font-sans">
            {lang === 'ar' ? 'قريباً' : 'COMING SOON'}
          </div>
          <h3 className="text-[18px] sm:text-[20px] font-bold mb-1.5">
            {lang === 'ar'
              ? 'ربط واتساب بزنس المباشر (API)'
              : 'Direct WhatsApp Business API Integration'}
          </h3>
          <p className="text-[14px] text-ink-950/60 dark:text-paper-50/60 leading-relaxed max-w-xl">
            {lang === 'ar'
              ? 'مساعدك الذكي سيرد تلقائياً من رقم واتساب بزنس الرسمي لمتجرك — بدون تطبيق واتساب عادي أو تدخل يدوي، ودون فقدان أي محادثة.'
              : 'Your AI assistant will reply automatically from your official WhatsApp Business number — no manual app, no missed conversations.'}
          </p>
        </div>
      </div>
    </section>
  )
}
