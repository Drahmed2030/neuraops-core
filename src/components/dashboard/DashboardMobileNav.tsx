'use client'

import { useRouter } from 'next/navigation'
import { useUI } from '@/lib/ui-context'

type MobileSection = 'dashboard' | 'leads' | 'chat' | 'report' | 'quality' | 'escalations' | 'settings'

export function DashboardMobileNav({ activeSection }: { activeSection: MobileSection }) {
  const { t, lang } = useUI()
  const router = useRouter()

  const items: Array<{ id: MobileSection; icon: string; label: string }> = [
    { id: 'dashboard', icon: '⌂', label: t.navDashboard },
    { id: 'leads', icon: '◎', label: lang === 'ar' ? 'العملاء المحتملون' : 'Leads' },
    { id: 'chat', icon: '✦', label: t.navChat },
    { id: 'report', icon: '▥', label: lang === 'ar' ? 'التقارير' : 'Reports' },
    { id: 'quality', icon: '✓', label: lang === 'ar' ? 'الجودة' : 'Quality' },
    { id: 'escalations', icon: '!', label: t.navEscalations },
    { id: 'settings', icon: '⚙', label: t.navSettings },
  ]

  function go(id: MobileSection) {
    if (id === 'leads') {
      router.push('/dashboard/leads')
      return
    }
    router.push(id === 'dashboard' ? '/dashboard' : `/dashboard#${id}`)
  }

  return (
    <nav
      className="md:hidden sticky top-[57px] z-40 flex gap-1 overflow-x-auto border-b border-black/[0.07] bg-paper-50/90 px-3 py-2 backdrop-blur-xl dark:border-white/[0.07] dark:bg-ink-950/90"
      aria-label={lang === 'ar' ? 'التنقل داخل لوحة التحكم' : 'Dashboard navigation'}
    >
      {items.map((item) => {
        const selected = activeSection === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => go(item.id)}
            className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all ${
              selected
                ? 'bg-brand-primary text-white'
                : 'text-ink-950/60 dark:text-paper-50/60'
            }`}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
