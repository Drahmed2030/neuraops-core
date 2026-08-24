'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useUI } from '@/lib/ui-context'
import { Header } from '@/components/layout/Header'
import { ThinkingIndicator } from '@/components/dashboard/ThinkingIndicator'
import type { Message } from '@/types/ui'

export default function DemoChatPage() {
  const { t, lang } = useUI()
  const params = useParams()
  const storeSlug = params?.slug as string

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: t.welcomeMsg },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [storeName, setStoreName] = useState<string>(storeSlug)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [requestingHuman, setRequestingHuman] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (storeSlug) setStoreName(storeSlug.replace(/-/g, ' '))
  }, [storeSlug])

  function getSessionId() {
    const key = `neuraops-demo-session:${storeSlug}`
    let value = window.sessionStorage.getItem(key)
    if (!value) {
      value = `demo-${crypto.randomUUID()}`
      window.sessionStorage.setItem(key, value)
    }
    return value
  }

  async function sendMessage(overrideText?: string) {
    const text = (overrideText ?? input).trim()
    if (!text || loading || !storeSlug) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          storeId: storeSlug,
          sessionId: getSessionId(),
          history: messages.slice(-6),
          channel: 'web_widget',
        }),
      })

      if (!res.ok) {
        let detail = `HTTP ${res.status}`
        try {
          const errBody = await res.json()
          detail = errBody.error || detail
        } catch {
          // not JSON, keep HTTP status
        }
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: lang === 'ar' ? `⚠️ خطأ فعلي من الخادم: ${detail}` : `⚠️ Real server error: ${detail}`,
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
              ? 'تم تحويل محادثتك لفريق المتجر — سيردون عليك قريباً 🙏'
              : "Your conversation has been handed to the store's team — they'll reply soon 🙏",
          },
        ])
      } else if (data.error) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: `⚠️ ${data.error}` },
        ])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.answer || '—' }])
      }
    } catch (err: any) {
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

  async function handleRequestHuman() {
    if (!conversationId) return
    setRequestingHuman(true)
    try {
      const res = await fetch('/api/escalations/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          storeId: storeSlug,
          sessionId: getSessionId(),
          reason: lang === 'ar' ? 'العميل طلب التحدث مع موظف' : 'Customer requested a human',
        }),
      })
      if (res.ok) {
        setIsPaused(true)
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: lang === 'ar'
              ? '🙋 تم إشعار فريق المتجر — سيتواصلون معك قريباً.'
              : "🙋 The store's team has been notified — they'll be with you shortly.",
          },
        ])
      }
    } catch {
      // Non-fatal
    } finally {
      setRequestingHuman(false)
    }
  }

  const quickReplies = [t.quickOrder, t.quickReturn, t.quickHours, t.quickPayment]

  return (
    <div className="min-h-screen flex flex-col">
      <Header variant="marketing" />

      <div className="px-5 py-2.5 bg-gold/10 border-b border-gold/20 text-[12px] text-gold flex items-center justify-between gap-2 font-sans">
        <div className="flex items-center gap-1.5">
          <span className="w-[7px] h-[7px] rounded-full bg-green-500 animate-pulse-dot" />
          {lang === 'ar' ? `تجربة حية — ${storeName}` : `Live Demo — ${storeName}`}
        </div>
        {conversationId && !isPaused && (
          <button
            type="button"
            onClick={handleRequestHuman}
            disabled={requestingHuman}
            className="text-[11px] font-semibold underline underline-offset-2 disabled:opacity-50 flex-shrink-0"
          >
            {requestingHuman
              ? (lang === 'ar' ? 'جارٍ...' : 'Requesting...')
              : (lang === 'ar' ? 'تحدث مع موظف' : 'Talk to a human')}
          </button>
        )}
      </div>

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
            className="w-11 h-11 rounded-[10px] bg-gold disabled:opacity-40 disabled:cursor-not-allowed border-none text-lg flex-shrink-0"
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
