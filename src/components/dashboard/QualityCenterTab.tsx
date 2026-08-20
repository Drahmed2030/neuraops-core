'use client'

import { useEffect, useState } from 'react'
import { useUI } from '@/lib/ui-context'

const DEMO_STORE_ID = 'demo-store'

interface QualityItem {
  messageId: string
  conversationId: string
  customerQuestion: string | null
  assistantReply: string
  agentUsed: string | null
  confidence: number | null
  createdAt: string
  rating: 'correct' | 'needs_edit' | 'escalated' | null
  note: string | null
}

const AGENT_LABELS: Record<string, { ar: string; en: string }> = {
  router: { ar: 'الموجّه', en: 'Router' },
  order_tracker: { ar: 'تتبع الطلبات', en: 'Order Tracker' },
  returns: { ar: 'الإرجاع', en: 'Returns' },
  product_expert: { ar: 'المنتجات', en: 'Products' },
  menu_offers: { ar: 'المنيو', en: 'Menu' },
  store_info: { ar: 'معلومات المتجر', en: 'Store Info' },
}

export function QualityCenterTab() {
  const { lang } = useUI()
  const [items, setItems] = useState<QualityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    setLoading(true)
    try {
      const res = await fetch(`/api/quality?storeId=${DEMO_STORE_ID}&limit=20`)
      const data = await res.json()
      if (res.ok) setItems(data.items || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  async function rate(item: QualityItem, rating: 'correct' | 'needs_edit' | 'escalated') {
    setSavingId(item.messageId)
    // Optimistic update
    setItems(prev => prev.map(i => i.messageId === item.messageId ? { ...i, rating } : i))
    try {
      await fetch('/api/quality/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: item.messageId,
          conversationId: item.conversationId,
          storeId: DEMO_STORE_ID,
          rating,
        }),
      })
    } catch {
      // Revert on failure
      setItems(prev => prev.map(i => i.messageId === item.messageId ? { ...i, rating: item.rating } : i))
    } finally {
      setSavingId(null)
    }
  }

  const ratedCount = items.filter(i => i.rating !== null).length
  const correctCount = items.filter(i => i.rating === 'correct').length

  return (
    <div>
      <h1 className="text-[24px] font-extrabold tracking-tight mb-1">
        {lang === 'ar' ? 'مركز جودة الردود' : 'Response Quality Center'}
      </h1>
      <p className="text-[13.5px] text-ink-950/55 dark:text-paper-50/55 mb-6">
        {lang === 'ar'
          ? 'راجع ردود مساعدك الذكي الحقيقية وقيّمها — هذا يحسّن دقته باستمرار'
          : 'Review your real AI replies and tag them — this continuously improves accuracy'}
      </p>

      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-2xl p-4 border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800">
            <div className="text-[20px] font-extrabold font-sans">{ratedCount}/{items.length}</div>
            <div className="text-[11px] text-ink-950/45 dark:text-paper-50/45 mt-1">
              {lang === 'ar' ? 'تم تقييمها' : 'Reviewed'}
            </div>
          </div>
          <div className="rounded-2xl p-4 border border-gold/35 bg-gradient-to-b from-gold/10 to-white dark:to-ink-800">
            <div className="text-[20px] font-extrabold font-sans">
              {ratedCount > 0 ? Math.round((correctCount / ratedCount) * 100) : 0}%
            </div>
            <div className="text-[11px] text-ink-950/45 dark:text-paper-50/45 mt-1">
              {lang === 'ar' ? 'دقة (من المُقيَّم)' : 'Accuracy (of reviewed)'}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <span className="w-6 h-6 border-2 border-black/15 dark:border-white/15 border-t-gold rounded-full animate-spin" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800 p-10 text-center">
          <div className="text-[15px] font-semibold mb-2">
            {lang === 'ar' ? 'لا توجد محادثات بعد' : 'No conversations yet'}
          </div>
          <p className="text-[13px] text-ink-950/50 dark:text-paper-50/50">
            {lang === 'ar'
              ? 'بمجرد أن يرد مساعدك على عميل حقيقي، ستظهر المحادثات هنا للمراجعة.'
              : 'Once your assistant replies to a real customer, conversations will appear here for review.'}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {items.map(item => (
          <div
            key={item.messageId}
            className="rounded-2xl border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-gold font-sans">
                {item.agentUsed ? (AGENT_LABELS[item.agentUsed]?.[lang] || item.agentUsed) : '—'}
              </span>
              <span className="text-[10.5px] text-ink-950/35 dark:text-paper-50/35 font-sans">
                {new Date(item.createdAt).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}
              </span>
            </div>

            {item.customerQuestion && (
              <div className="mb-2.5">
                <div className="text-[10.5px] text-ink-950/40 dark:text-paper-50/40 mb-1 font-semibold">
                  {lang === 'ar' ? 'سؤال العميل' : "Customer's question"}
                </div>
                <div className="text-[13px] px-3 py-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.03]">
                  {item.customerQuestion}
                </div>
              </div>
            )}

            <div className="mb-4">
              <div className="text-[10.5px] text-ink-950/40 dark:text-paper-50/40 mb-1 font-semibold">
                {lang === 'ar' ? 'رد المساعد' : "Assistant's reply"}
              </div>
              <div className="text-[13px] px-3 py-2 rounded-lg bg-gold/[0.06] border border-gold/15">
                {item.assistantReply}
              </div>
            </div>

            <div className="flex gap-2">
              <RatingButton
                active={item.rating === 'correct'}
                onClick={() => rate(item, 'correct')}
                disabled={savingId === item.messageId}
                color="green"
                label={lang === 'ar' ? 'صحيح' : 'Correct'}
                icon="✓"
              />
              <RatingButton
                active={item.rating === 'needs_edit'}
                onClick={() => rate(item, 'needs_edit')}
                disabled={savingId === item.messageId}
                color="yellow"
                label={lang === 'ar' ? 'يحتاج تعديل' : 'Needs Edit'}
                icon="✎"
              />
              <RatingButton
                active={item.rating === 'escalated'}
                onClick={() => rate(item, 'escalated')}
                disabled={savingId === item.messageId}
                color="red"
                label={lang === 'ar' ? 'يجب أن يُصعَّد' : 'Should Escalate'}
                icon="⚠"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RatingButton({
  active, onClick, disabled, color, label, icon,
}: {
  active: boolean
  onClick: () => void
  disabled: boolean
  color: 'green' | 'yellow' | 'red'
  label: string
  icon: string
}) {
  const colorClasses = {
    green: active ? 'bg-green-500 text-white border-green-500' : 'border-green-500/25 text-green-500 hover:bg-green-500/10',
    yellow: active ? 'bg-yellow-500 text-white border-yellow-500' : 'border-yellow-500/25 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-500/10',
    red: active ? 'bg-red-500 text-white border-red-500' : 'border-red-500/25 text-red-500 hover:bg-red-500/10',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 px-3 py-2 rounded-lg border text-[11.5px] font-semibold transition-colors disabled:opacity-50 ${colorClasses[color]}`}
    >
      {icon} {label}
    </button>
  )
}
