'use client'

import { useEffect, useState } from 'react'
import { useUI } from '@/lib/ui-context'

interface ReportData {
  reportDay: number
  totalConversations: number
  resolvedCount: number
  escalatedCount: number
  avgFirstResponseSeconds: number
  topTopics: { topic: string; count: number }[]
  generatedAt: string
}

interface TrialStatus {
  trialState: string
  daysRemaining: number | null
  proofDeadline: string | null
}

const AGENT_LABELS: Record<string, { ar: string; en: string; icon: string }> = {
  order_tracker: { ar: 'تتبع الطلبات', en: 'Order Tracking', icon: '📦' },
  returns: { ar: 'الإرجاع والاستبدال', en: 'Returns & Exchanges', icon: '↩️' },
  product_expert: { ar: 'استفسارات المنتجات', en: 'Product Questions', icon: '🏷️' },
  menu_offers: { ar: 'المنيو والعروض', en: 'Menu & Offers', icon: '🍽️' },
  store_info: { ar: 'معلومات المتجر', en: 'Store Info', icon: '📍' },
}

/**
 * Displays a single proof-week report (day 3, 6, or 7). Every number
 * shown here comes from real conversation/escalation data computed
 * by generateProofReport() on the backend — never a placeholder.
 * Per the Manus report's investor-credibility rule, "resolved" is
 * defined explicitly next to the number, not left ambiguous.
 */
export function ProofReportView({ storeSlug, day }: { storeSlug: string; day: 3 | 6 | 7 }) {
  const { t, lang } = useUI()
  const [report, setReport] = useState<ReportData | null>(null)
  const [trial, setTrial] = useState<TrialStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [reportRes, statusRes] = await Promise.all([
          fetch(`/api/trial/report?storeId=${storeSlug}&day=${day}`),
          fetch(`/api/trial/status?storeId=${storeSlug}`),
        ])
        const reportData = await reportRes.json()
        const statusData = await statusRes.json()

        if (!cancelled) {
          if (reportRes.ok) setReport(reportData)
          else setError(reportData.error || 'no_report')
          if (statusRes.ok) setTrial(statusData)
        }
      } catch {
        if (!cancelled) setError('connection_failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [storeSlug, day])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-6 h-6 border-2 border-black/15 dark:border-white/15 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800 p-10 text-center">
        <div className="text-[15px] font-semibold mb-2">
          {lang === 'ar' ? 'لا يوجد تقرير بعد' : 'No report yet'}
        </div>
        <p className="text-[13px] text-ink-950/50 dark:text-paper-50/50">
          {lang === 'ar'
            ? 'التقرير يُبنى تلقائياً بعد بدء أسبوع الإثبات وأول محادثات حقيقية.'
            : 'The report is generated automatically once the proof week starts and real conversations happen.'}
        </p>
      </div>
    )
  }

  const resolutionRate = report.totalConversations > 0
    ? Math.round((report.resolvedCount / report.totalConversations) * 100)
    : 0

  const responseMinutes = Math.floor(report.avgFirstResponseSeconds / 60)
  const responseSeconds = report.avgFirstResponseSeconds % 60
  const responseDisplay = responseMinutes > 0
    ? `${responseMinutes}${lang === 'ar' ? 'د ' : 'm '}${responseSeconds}${lang === 'ar' ? 'ث' : 's'}`
    : `${responseSeconds}${lang === 'ar' ? 'ث' : 's'}`

  return (
    <div>
      {/* Days remaining banner */}
      {trial?.daysRemaining !== null && trial?.trialState === 'proof_active' && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-gold/[0.06] border border-gold/20">
          <span className="text-[18px]">⏳</span>
          <div className="text-[13.5px] font-medium">
            {lang === 'ar'
              ? `تبقّى ${trial?.daysRemaining} ${trial?.daysRemaining === 1 ? 'يوم' : 'أيام'} من أسبوع الإثبات`
              : `${trial?.daysRemaining} ${trial?.daysRemaining === 1 ? 'day' : 'days'} left in your proof week`}
          </div>
        </div>
      )}

      {/* Headline stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon="💬"
          value={String(report.totalConversations)}
          label={lang === 'ar' ? 'محادثات' : 'Conversations'}
        />
        <StatCard
          icon="✅"
          value={`${resolutionRate}%`}
          label={lang === 'ar' ? 'نسبة الحل' : 'Resolution Rate'}
          highlight
        />
        <StatCard
          icon="⚡"
          value={responseDisplay}
          label={lang === 'ar' ? 'متوسط الرد' : 'Avg Response'}
        />
        <StatCard
          icon="🔔"
          value={String(report.escalatedCount)}
          label={lang === 'ar' ? 'تصعيدات' : 'Escalated'}
        />
      </div>

      {/* Explicit definition — per the investor-credibility rule:
          never show a resolution % without saying what "resolved" means */}
      <div className="mb-6 px-4 py-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] text-[12px] text-ink-950/50 dark:text-paper-50/50 leading-relaxed">
        <strong className="text-ink-950/70 dark:text-paper-50/70">
          {lang === 'ar' ? 'كيف نحسب "الحل": ' : 'How we define "resolved": '}
        </strong>
        {lang === 'ar'
          ? 'محادثة رد عليها المساعد ولم تُصعَّد لفريقكم. المصادر: سجل المحادثات والتصعيدات الفعلي منذ بدء أسبوع الإثبات.'
          : 'A conversation the assistant answered and that was not escalated to your team. Source: real conversation and escalation logs since your proof week started.'}
      </div>

      {/* Top topics — real agent usage breakdown */}
      {report.topTopics.length > 0 && (
        <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800 p-5 mb-6">
          <div className="text-[13.5px] font-bold mb-4">
            {lang === 'ar' ? 'أكثر المواضيع تكراراً' : 'Most Common Topics'}
          </div>
          {report.topTopics.map((topic, i) => {
            const label = AGENT_LABELS[topic.topic]
            const maxCount = report.topTopics[0]?.count || 1
            const pct = Math.round((topic.count / maxCount) * 100)
            return (
              <div key={i} className="flex items-center gap-3 mb-3 last:mb-0">
                <span className="text-[16px] w-6 text-center flex-shrink-0">{label?.icon || '💬'}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12.5px] font-medium">
                      {label ? (lang === 'ar' ? label.ar : label.en) : topic.topic}
                    </span>
                    <span className="text-[12px] text-ink-950/40 dark:text-paper-50/40 font-sans">
                      {topic.count}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.06]">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="text-[11px] text-ink-950/35 dark:text-paper-50/35 text-center font-sans">
        {lang === 'ar' ? 'آخر تحديث: ' : 'Last updated: '}
        {new Date(report.generatedAt).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}
      </div>
    </div>
  )
}

function StatCard({ icon, value, label, highlight }: { icon: string; value: string; label: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border ${
      highlight
        ? 'border-gold/35 bg-gradient-to-b from-gold/10 to-white dark:to-ink-800'
        : 'border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800'
    }`}>
      <div className="text-[16px] mb-2">{icon}</div>
      <div className="text-[20px] font-extrabold font-sans tracking-tight">{value}</div>
      <div className="text-[11px] text-ink-950/45 dark:text-paper-50/45 mt-1">{label}</div>
    </div>
  )
}
