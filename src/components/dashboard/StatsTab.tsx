'use client'

import { useState } from 'react'
import { useUI } from '@/lib/ui-context'
import type { HealthState } from '@/types/ui'

export function StatsTab() {
  const { t } = useUI()
  const [health, setHealth] = useState<HealthState>({ status: 'idle', text: '' })

  async function checkHealth() {
    setHealth({ status: 'checking', text: t.checking })
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      if (data.status === 'ok') {
        setHealth({ status: 'ok', text: `✅ ${t.connected} — ${data.stores_count} ${t.storesCount}` })
      } else {
        setHealth({ status: 'error', text: `❌ ${t.notConnected}` })
      }
    } catch {
      setHealth({ status: 'error', text: `❌ ${t.notConnected}` })
    }
  }

  const stats = [
    { icon: '💬', label: t.statConvos, value: '247', trend: '+12%' },
    { icon: '✅', label: t.statRate, value: '78%', trend: '+8%', highlight: true },
    { icon: '⚡', label: t.statResponse, value: '4.2s', trend: '-0.6s' },
    { icon: '😊', label: t.statSatisfaction, value: '4.7/5', trend: '+0.3' },
  ]

  const agents = [
    { name: t.routerAgent, pct: 32 },
    { name: t.orderTrackerAgent, pct: 28 },
    { name: t.returnsAgent, pct: 20 },
  ]

  return (
    <div>
      <h1 className="text-[24px] font-extrabold tracking-tight mb-1">{t.dashTitle}</h1>
      <p className="text-[13.5px] text-ink-950/55 dark:text-paper-50/55 mb-6">{t.dashSub}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {stats.map((s, i) => (
          <div
            key={i}
            className={`rounded-2xl p-[18px] border ${
              s.highlight
                ? 'border-brand-primary/35 bg-gradient-to-b from-brand-primary/10 to-white dark:to-ink-800'
                : 'border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800'
            }`}
          >
            <div className="text-xl mb-2.5">{s.icon}</div>
            <div className="text-[11.5px] text-ink-950/45 dark:text-paper-50/45 mb-1">{s.label}</div>
            <div className="text-[26px] font-extrabold font-sans tracking-tight">{s.value}</div>
            <div className="text-[11px] text-green-500 mt-1.5 font-semibold">
              ↑ {s.trend} {t.trendUp}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-5 border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800 mb-5">
        <div className="text-[14px] font-bold mb-3">🔍 {t.healthCheck}</div>
        <button
          type="button"
          onClick={checkHealth}
          disabled={health.status === 'checking'}
          className="px-5 py-2.5 rounded-lg bg-brand-primary text-ink-950 font-bold text-[13px] disabled:opacity-60 enabled:hover:bg-brand-azure transition-colors"
        >
          {t.checkNow}
        </button>
        {health.text && (
          <div className="mt-3 text-[13px] font-semibold text-brand-primary">{health.text}</div>
        )}
      </div>

      <div className="rounded-2xl p-5 border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800">
        <div className="text-[14px] font-bold mb-4">🤖 {t.agentPerf}</div>
        {agents.map((a, i) => (
          <div key={i} className="flex items-center gap-2.5 mb-3 last:mb-0">
            <div className="flex-1">
              <div className="text-[12.5px] mb-1 text-ink-950/60 dark:text-paper-50/60">{a.name}</div>
              <div className="h-1 rounded-full bg-black/[0.07] dark:bg-white/[0.07]">
                <div
                  className="h-full rounded-full bg-brand-primary"
                  style={{ width: `${a.pct}%` }}
                />
              </div>
            </div>
            <div className="w-9 text-end text-[12.5px] font-bold font-sans">{a.pct}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}
