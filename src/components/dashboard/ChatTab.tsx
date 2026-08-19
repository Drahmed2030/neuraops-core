'use client'

import { useState, useRef, useEffect } from 'react'
import { useUI } from '@/lib/ui-context'
import type { Message } from '@/types/ui'

const DEMO_STORE_ID = 'demo-store'

export function ChatTab() {
  const { t } = useUI()
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: t.welcomeMsg }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
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
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || data.error || '—' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error.' }])
    } finally {
      setLoading(false)
    }
  }

  const quickReplies = [t.quickOrder, t.quickReturn, t.quickHours, t.quickPayment]

  return (
    <div className="flex flex-col h-[calc(100dvh-61px)] -mx-6 -my-6">
      <div className="px-5 py-2.5 bg-paper-50/90 dark:bg-ink-950/90 border-b border-black/[0.07] dark:border-white/[0.07] text-[12px] text-gold flex items-center gap-1.5 font-sans">
        <span className="w-[7px] h-[7px] rounded-full bg-green-500 animate-pulse-dot" />
        {t.chatLive}
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
        {loading && <div className="self-end text-[12px] text-gold">⟳ {t.thinking}</div>}
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
