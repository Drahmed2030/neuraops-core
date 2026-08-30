'use client'

import Link from 'next/link'
import { BrandMark } from '@/components/brand/BrandMark'
import { useUI } from '@/lib/ui-context'

export function Footer() {
  const { t, lang } = useUI()
  const tagline = lang === 'ar'
    ? 'تأهيل ومتابعة العملاء المحتملين بوضوح، مع تدخل بشري عند الحاجة.'
    : 'Clear lead qualification and follow-up, with human handoff when needed.'
  const links = lang === 'ar'
    ? [
        { href: '/about', label: 'عن NeuraOps' },
        { href: '/privacy', label: 'الخصوصية' },
        { href: '/terms', label: 'الشروط' },
        { href: '/security', label: 'الأمن' },
        { href: '/responsible-ai', label: 'AI المسؤول' },
        { href: '/contact', label: 'تواصل' },
      ]
    : [
        { href: '/about', label: 'About' },
        { href: '/privacy', label: 'Privacy' },
        { href: '/terms', label: 'Terms' },
        { href: '/security', label: 'Security' },
        { href: '/responsible-ai', label: 'Responsible AI' },
        { href: '/contact', label: 'Contact' },
      ]

  return (
    <footer className="px-5 py-12 sm:px-10 border-t border-black/[0.07] dark:border-white/[0.07]">
      <div className="max-w-6xl mx-auto">
        <div className="mb-3">
          <BrandMark size={30} />
        </div>
        <p className="text-[13px] text-ink-950/50 dark:text-paper-50/50 max-w-[360px] mb-8 font-sans">
          {tagline}
        </p>
        <nav className="flex flex-wrap gap-x-5 gap-y-3 mb-8 text-[13px] font-semibold">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-ink-950/60 dark:text-paper-50/60 hover:text-brand-primary dark:hover:text-brand-azure transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="pt-6 border-t border-black/[0.07] dark:border-white/[0.07] text-[13px] text-ink-950/50 dark:text-paper-50/50 space-y-2">
          <div>{t.footerRights}</div>
          <div className="text-[11px] leading-5 max-w-2xl">
            {lang === 'ar'
              ? 'مشروع تقني مستقل يقوده المؤسس من المملكة العربية السعودية، ويعمل حاليًا من خلال برامج Pilot تجارية محدودة.'
              : 'An independent, founder-led technology venture operating from Saudi Arabia through limited commercial pilots.'}
          </div>
        </div>
      </div>
    </footer>
  )
}
