'use client'

import { useEffect, useState } from 'react'
import { useUI } from '@/lib/ui-context'
import { Header } from '@/components/layout/Header'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { StatsTab } from '@/components/dashboard/StatsTab'
import { ChatTab } from '@/components/dashboard/ChatTab'
import { ReportTab } from '@/components/dashboard/ReportTab'
import { QualityCenterTab } from '@/components/dashboard/QualityCenterTab'
import { EmptyStateTab } from '@/components/dashboard/EmptyStateTab'

type Tab = 'dashboard' | 'chat' | 'report' | 'quality' | 'escalations' | 'settings'

const validTabs: Tab[] = ['dashboard', 'chat', 'report', 'quality', 'escalations', 'settings']

function tabFromHash(): Tab {
  if (typeof window === 'undefined') return 'dashboard'
  const value = window.location.hash.replace('#', '') as Tab
  return validTabs.includes(value) ? value : 'dashboard'
}

export default function DashboardPage() {
  const { t } = useUI()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  useEffect(() => {
    const syncFromHash = () => setActiveTab(tabFromHash())
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  function selectTab(tab: Tab) {
    setActiveTab(tab)
    const nextUrl = tab === 'dashboard' ? '/dashboard' : `/dashboard#${tab}`
    window.history.replaceState(null, '', nextUrl)
  }

  return (
    <div className="min-h-screen">
      <Header
        variant="app"
        activeTab={activeTab}
        onTabChange={(tab) => selectTab(tab as Tab)}
        showDesktopAppNav={false}
      />

      <DashboardSidebar activeTab={activeTab} onTabChange={selectTab} />

      <main className={`md:ps-60 ${activeTab === 'chat' ? '' : 'p-6'}`}>
        <div className={activeTab === 'chat' ? '' : 'max-w-[1100px] mx-auto'}>
          {activeTab === 'dashboard' && <StatsTab />}
          {activeTab === 'chat' && <ChatTab />}
          {activeTab === 'report' && <ReportTab />}
          {activeTab === 'quality' && <QualityCenterTab />}
          {activeTab === 'escalations' && (
            <EmptyStateTab icon="🔔" title={t.escalationsTitle} emptyText={t.escalationsEmpty} />
          )}
          {activeTab === 'settings' && (
            <EmptyStateTab icon="⚙️" title={t.settingsTitle} emptyText={t.settingsEmpty} />
          )}
        </div>
      </main>
    </div>
  )
}
