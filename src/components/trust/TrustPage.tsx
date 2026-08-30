'use client'

import Link from 'next/link'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { useUI } from '@/lib/ui-context'

type TrustSection = {
  title: string
  body: string
}

type TrustPageProps = {
  eyebrow: { en: string; ar: string }
  title: { en: string; ar: string }
  intro: { en: string; ar: string }
  sections: { en: TrustSection[]; ar: TrustSection[] }
  action?: { href: string; en: string; ar: string }
}

export function TrustPage({ eyebrow, title, intro, sections, action }: TrustPageProps) {
  const { lang } = useUI()
  const isArabic = lang === 'ar'
  const localizedSections = isArabic ? sections.ar : sections.en

  return (
    <>
      <Header variant="marketing" />
      <main className="px-5 py-14 sm:px-10 sm:py-20" dir={isArabic ? 'rtl' : 'ltr'}>
        <article className="max-w-3xl mx-auto">
          <div className="text-[12px] font-bold tracking-[0.15em] uppercase mb-4 text-brand-primary font-sans">
            {isArabic ? eyebrow.ar : eyebrow.en}
          </div>
          <h1 className="text-[clamp(2rem,7vw,3.25rem)] font-extrabold tracking-tight leading-tight mb-5">
            {isArabic ? title.ar : title.en}
          </h1>
          <p className="text-[16px] leading-8 text-ink-950/65 dark:text-paper-50/65 mb-4">
            {isArabic ? intro.ar : intro.en}
          </p>
          <p className="text-[12px] text-ink-950/45 dark:text-paper-50/45 mb-10">
            {isArabic ? 'آخر تحديث: 30 أغسطس 2026' : 'Last updated: 30 August 2026'}
          </p>

          <div className="space-y-5">
            {localizedSections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800 p-5 sm:p-6">
                <h2 className="text-lg font-extrabold mb-2">{section.title}</h2>
                <p className="text-[14px] leading-7 whitespace-pre-line text-ink-950/65 dark:text-paper-50/65">
                  {section.body}
                </p>
              </section>
            ))}
          </div>

          {action && (
            <div className="mt-10">
              <Link href={action.href} className="inline-flex rounded-xl bg-gradient-to-r from-brand-primary to-brand-violet text-white font-bold px-6 py-3.5 shadow-brand-glow hover:opacity-90 transition-opacity">
                {isArabic ? action.ar : action.en}
              </Link>
            </div>
          )}
        </article>
      </main>
      <Footer />
    </>
  )
}
