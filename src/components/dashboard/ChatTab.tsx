'use client'

import { useState, useRef, useEffect } from 'react'
import { useUI } from '@/lib/ui-context'
import { ThinkingIndicator } from './ThinkingIndicator'
import type { Message } from '@/types/ui'

const DEMO_STORE_ID = 'demo-store'

export function ChatTab() {
  const { t, lang } = useUI()
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: t.welcomeMsg }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [escalating, setEscalating] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function sendMessage(overrideText?: string) {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          storeId: DEMO_STORE_ID,
          sessionId: 'dashboard-demo',
          history: messages.slice(-6),
        }),
      })

      // Surface the REAL error instead of a generic "connection error" —
      // this is what lets us actually diagnose what's failing instead
      // of guessing.
      if (!res.ok) {
        let detail = `HTTP ${res.status}`
        try {
          const errBody = await res.json()
          detail = errBody.error || detail
        } catch {
          // response wasn't JSON — keep the HTTP status as the detail
        }
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: lang === 'ar'
              ? `⚠️ خطأ فعلي من الخادم: ${detail}`
              : `⚠️ Real server error: ${detail}`,
          },
        ])
        return
      }

      const data = await res.json()
      if (data.conversationId) setConversationId(data.conversationId)

      if (data.manuallyPaused) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: lang === 'ar'
              ? '🙋 تم إيقاف الردود التلقائية — فريقكم سيتابع من هنا.'
              : '🙋 Automated replies paused — your team will take it from here.',
          },
        ])
      } else if (data.error) {
        // API returned 200 but with an error payload — also surface
        // this verbatim instead of masking it.
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: lang === 'ar' ? `⚠️ ${data.error}` : `⚠️ ${data.error}`,
          },
        ])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.answer || '—' }])
      }
    } catch (err: any) {
      // A genuine network-level failure (DNS, offline, CORS, etc.) —
      // this is the ONLY case that should say "connection error", and
      // now it includes the real browser error message too.
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: lang === 'ar'
            ? `⚠️ خطأ اتصال حقيقي: ${err?.message || 'unknown'}`
            : `⚠️ Real connection error: ${err?.message || 'unknown'}`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function handleEscalate() {
    if (!conversationId) return
    setEscalating(true)
    try {
      const res = await fetch('/api/escalations/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          storeId: DEMO_STORE_ID,
          reason: lang === 'ar' ? 'طلب تصعيد يدوي من صاحب المتجر' : 'Manual escalation by store owner',
        }),
      })
      if (res.ok) {
        setIsPaused(true)
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: lang === 'ar'
              ? '✅ تم إيقاف الأتمتة لهذه المحادثة. سيتولاها فريقكم الآن.'
              : '✅ Automation stopped for this conversation. Your team has it now.',
          },
        ])
      }
    } catch {
      // Non-fatal — the owner can retry
    } finally {
      setEscalating(false)
      setShowConfirm(false)
    }
  }

  const quickReplies = [t.quickOrder, t.quickReturn, t.quickHours, t.quickPayment]

  return (
    <div className="flex flex-col h-[calc(100dvh-61px)] -mx-6 -my-6">
      <div className="px-5 py-2.5 bg-paper-50/90 dark:bg-ink-950/90 border-b border-black/[0.07] dark:border-white/[0.07] flex items-center justify-between gap-3">
        <div className="text-[12px] text-gold flex items-center gap-1.5 font-sans">
          <span className="w-[7px] h-[7px] rounded-full bg-green-500 animate-pulse-dot" />
          {t.chatLive}
        </div>

        {conversationId && !isPaused && (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/[0.06] text-red-500 text-[11.5px] font-bold flex items-center gap-1.5 hover:bg-red-500/10 transition-colors flex-shrink-0"
          >
            🙋 {lang === 'ar' ? 'أوقف الأتمتة' : 'Stop Automation'}
          </button>
        )}
        {isPaused && (
          <span className="px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/25 text-gold text-[11.5px] font-bold flex-shrink-0">
            {lang === 'ar' ? '🙋 مع فريقكم الآن' : '🙋 With your team now'}
          </span>
        )}
      </div>

      {showConfirm && (
        <div className="px-5 py-3.5 bg-red-500/[0.06] border-b border-red-500/20">
          <div className="text-[13px] font-semibold mb-2.5">
            {lang === 'ar'
              ? 'هل تريد إيقاف الردود الآلية لهذه المحادثة وتحويلها لفريقكم؟'
              : 'Stop automated replies for this conversation and hand it to your team?'}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleEscalate}
              disabled={escalating}
              className="px-4 py-2 rounded-lg bg-red-500 text-white text-[12.5px] font-bold disabled:opacity-50"
            >
              {escalating
                ? (lang === 'ar' ? 'جارٍ...' : 'Working...')
                : (lang === 'ar' ? 'نعم، أوقف الأتمتة' : 'Yes, stop automation')}
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              disabled={escalating}
              className="px-4 py-2 rounded-lg border border-black/10 dark:border-white/10 text-[12.5px] font-medium"
            >
              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 px-5 py-5 overflow-y-auto flex flex-col gap-3 max-w-[700px] mx-auto w-full">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[78%] ${m.role === 'user' ? 'self-start' : 'self-end'}`}>
            {m.role === 'assistant' && (
              <div className="text-[10px] text-gold mb-1 font-semibold">🧠 {t.aiName}</div>
            )}
            <div
              className={`px-[15px] py-[11px] rounded-2xl text-[13.5px] leading-relaxed ${
                m.role === 'user'
                  ? 'bg-white dark:bg-ink-800 border border-black/[0.07] dark:border-white/[0.07]'
                  : 'bg-gold/10 border border-gold/35'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <ThinkingIndicator />}
      </div>

      <div className="px-5 py-3.5 bg-paper-50/90 dark:bg-ink-950/90 border-t border-black/[0.07] dark:border-white/[0.07] max-w-[700px] mx-auto w-full">
        <div className="flex gap-2 mb-2.5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder={t.chatPlaceholder}
            className="flex-1 px-4 py-3 rounded-[10px] border-[1.5px] border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800 text-[13.5px] outline-none focus:border-gold transition-colors"
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={loading}
            className="w-11 h-11 rounded-[10px] bg-gold disabled:bg-black/10 dark:disabled:bg-white/10 disabled:cursor-not-allowed text-lg flex-shrink-0"
          >
            ✈
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickReplies.map(q => (
            <button
              key={q}
              type="button"
              onClick={() => sendMessage(q)}
              className="px-3.5 py-1.5 rounded-full border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800 text-[11.5px] text-ink-950/60 dark:text-paper-50/60 hover:border-gold/40 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
