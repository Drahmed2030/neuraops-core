'use client'

import { useState } from 'react'
import { useUI } from '@/lib/ui-context'
import { Header } from '@/components/layout/Header'
import { StatsTab } from '@/components/dashboard/StatsTab'
import { ChatTab } from '@/components/dashboard/ChatTab'
import { ReportTab } from '@/components/dashboard/ReportTab'
import { QualityCenterTab } from '@/components/dashboard/QualityCenterTab'
import { EmptyStateTab } from '@/components/dashboard/EmptyStateTab'

type Tab = 'dashboard' | 'chat' | 'report' | 'quality' | 'escalations' | 'settings'

export default function DashboardPage() {
  const { t } = useUI()
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  return (
    <div className="min-h-screen">
      <Header
        variant="app"
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as Tab)}
      />

      <div className={activeTab === 'chat' ? '' : 'p-6 max-w-[900px] mx-auto'}>
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
    </div>
  )
}
