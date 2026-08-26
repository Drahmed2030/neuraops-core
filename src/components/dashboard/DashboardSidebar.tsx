'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useUI } from '@/lib/ui-context'
import { BrandMark } from '@/components/brand/BrandMark'

type DashboardTab = 'dashboard' | 'chat' | 'report' | 'quality' | 'escalations' | 'settings'

interface DashboardSidebarProps {
  activeTab?: DashboardTab | 'leads'
  onTabChange?: (tab: DashboardTab) => void
}

export function DashboardSidebar({ activeTab, onTabChange }: DashboardSidebarProps) {
  const { t, lang } = useUI()
  const pathname = usePathname()
  const router = useRouter()

  const items: Array<{
    id: DashboardTab | 'leads'
    icon: string
    label: string
    description?: string
  }> = [
    { id: 'dashboard', icon: '⌂', label: t.navDashboard },
    { id: 'leads', icon: '◎', label: lang === 'ar' ? 'العملاء المحتملون' : 'Leads' },
    { id: 'chat', icon: '✦', label: t.navChat },
    { id: 'report', icon: '▥', label: lang === 'ar' ? 'التقارير' : 'Reports' },
    { id: 'quality', icon: '✓', label: lang === 'ar' ? 'مركز الجودة' : 'Quality Center' },
    { id: 'escalations', icon: '!', label: t.navEscalations },
    { id: 'settings', icon: '⚙', label: t.navSettings },
  ]

  function selectItem(id: DashboardTab | 'leads') {
    if (id === 'leads') {
      router.push('/dashboard/leads')
      return
    }

    if (pathname !== '/dashboard') {
      router.push(id === 'dashboard' ? '/dashboard' : `/dashboard#${id}`)
      return
    }

    onTabChange?.(id)
    const nextUrl = id === 'dashboard' ? '/dashboard' : `/dashboard#${id}`
    window.history.replaceState(null, '', nextUrl)
  }

  return (
    <aside className="hidden md:flex fixed top-[57px] bottom-0 start-0 z-40 w-60 flex-col border-e border-black/[0.07] dark:border-white/[0.07] bg-paper-50/95 dark:bg-ink-950/95 backdrop-blur-xl">
      <div className="px-4 py-5">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <BrandMark size={42} showProduct />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label={lang === 'ar' ? 'التنقل داخل لوحة التحكم' : 'Dashboard navigation'}>
        {items.map((item) => {
          const selected = activeTab === item.id || (item.id === 'leads' && pathname === '/dashboard/leads')
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectItem(item.id)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-[13px] font-semibold transition-all ${
                selected
                  ? 'bg-brand-primary/10 text-brand-primary dark:bg-brand-azure/10 dark:text-blue-300 ring-1 ring-inset ring-brand-primary/15'
                  : 'text-ink-950/60 dark:text-paper-50/60 hover:bg-black/[0.04] hover:text-ink-950 dark:hover:bg-white/[0.05] dark:hover:text-paper-50'
              }`}
            >
              <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[13px] ${selected ? 'bg-brand-primary text-white' : 'bg-black/[0.04] dark:bg-white/[0.06]'}`}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
              {item.id === 'escalations' && (
                <span className="ms-auto h-1.5 w-1.5 rounded-full bg-attention" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </nav>

      <div className="m-3 rounded-xl border border-attention/20 bg-attention/[0.06] p-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-attention-dark">
          {lang === 'ar' ? 'إشارة الأولوية' : 'Priority signal'}
        </div>
        <p className="mt-1.5 text-[11px] leading-5 text-ink-950/55 dark:text-paper-50/55">
          {lang === 'ar' ? 'الذهبي مخصص للحالات التي تحتاج انتباهًا بشريًا.' : 'Gold is reserved for items that need human attention.'}
        </p>
      </div>
    </aside>
  )
}
