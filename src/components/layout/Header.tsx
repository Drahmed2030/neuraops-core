'use client'

import Link from 'next/link'
import { BrandMark } from '@/components/brand/BrandMark'
import { useUI } from '@/lib/ui-context'

interface HeaderProps {
  variant?: 'marketing' | 'app'
  activeTab?: string
  onTabChange?: (tab: string) => void
  showDesktopAppNav?: boolean
}

export function Header({
  variant = 'marketing',
  activeTab,
  onTabChange,
  showDesktopAppNav = true,
}: HeaderProps) {
  const { t, isDark, toggleLang, toggleTheme, lang } = useUI()

  const navTabs = [
    { id: 'dashboard', icon: '🏠', label: t.navDashboard },
    { id: 'chat', icon: '💬', label: t.navChat },
    { id: 'report', icon: '📊', label: lang === 'ar' ? 'التقرير' : 'Report' },
    { id: 'quality', icon: '✓', label: lang === 'ar' ? 'الجودة' : 'Quality' },
    { id: 'escalations', icon: '🔔', label: t.navEscalations },
    { id: 'settings', icon: '⚙️', label: t.navSettings },
  ]

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between gap-3 px-5 py-3 backdrop-blur-xl bg-paper-50/80 dark:bg-ink-950/85 border-b border-black/[0.07] dark:border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2 font-semibold text-[15.5px] tracking-tight no-underline text-ink-950 dark:text-paper-50 font-sans">
            <BrandMark size={30} />
          </Link>
        </div>

        {variant === 'app' && onTabChange && showDesktopAppNav && (
          <nav className="hidden md:flex gap-1.5">
            {navTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-[12.5px] font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-primary text-white'
                    : 'text-ink-950/60 dark:text-paper-50/60 hover:text-ink-950 dark:hover:text-paper-50'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2 sm:gap-2.5" dir="ltr">
          <button
            type="button"
            onClick={toggleLang}
            className="px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10 text-[12px] font-medium text-ink-950/70 dark:text-paper-50/70 hover:border-brand-primary transition-colors font-sans relative z-10"
          >
            {t.langBtn}
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="relative w-[42px] h-[26px] rounded-full border-none cursor-pointer bg-black/10 dark:bg-white/10 z-10 flex-shrink-0"
          >
            <span
              className="absolute top-[3px] w-5 h-5 rounded-full bg-white dark:bg-ink-800 flex items-center justify-center text-[10px] transition-[left] duration-300 pointer-events-none"
              style={{ left: isDark ? '19px' : '3px' }}
            >
              {isDark ? '🌙' : '☀️'}
            </span>
          </button>

          {variant === 'marketing' && (
            <Link
              href="/lead/demo-store"
              className="px-3.5 sm:px-4 py-2 rounded-lg bg-brand-primary text-white text-[12.5px] sm:text-[13px] font-bold hover:bg-brand-azure transition-colors shadow-brand-glow whitespace-nowrap"
            >
              {lang === 'ar' ? 'جرّب LeadOps' : 'Try LeadOps'}
            </Link>
          )}
        </div>
      </header>

      {/* Mobile tab bar — app variant only, shown below md breakpoint */}
      {variant === 'app' && onTabChange && (
        <nav className="md:hidden sticky top-[57px] z-40 flex gap-1 px-3 py-2 overflow-x-auto backdrop-blur-xl bg-paper-50/80 dark:bg-ink-950/85 border-b border-black/[0.07] dark:border-white/[0.07]">
          {navTabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-brand-primary text-white'
                  : 'text-ink-950/60 dark:text-paper-50/60'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      )}
    </>
  )
}
