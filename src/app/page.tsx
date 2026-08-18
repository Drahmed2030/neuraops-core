'use client'

import { useState } from 'react'

// Demo store ID — replace with real store ID after setup
const DEMO_STORE_ID = 'demo'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'escalations'>('dashboard')
  const [messages, setMessages] = useState<{role: string, content: string}[]>([
    { role: 'assistant', content: '👋 مرحباً! أنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [health, setHealth] = useState<string>('جارٍ الفحص...')

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          storeId: DEMO_STORE_ID,
          sessionId: 'demo-session-1',
          history: messages.slice(-6),
        })
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer || 'عذراً، حدث خطأ.'
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'خطأ في الاتصال.' }])
    } finally {
      setLoading(false)
    }
  }

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      setHealth(data.status === 'ok' ? `✅ متصل — ${data.stores_count} متجر` : '❌ خطأ')
    } catch {
      setHealth('❌ تعذر الاتصال')
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#04080F', minHeight: '100vh', color: '#B8D0E8' }}>
      {/* Top bar */}
      <div style={{ background: '#0A1628', borderBottom: '1px solid #1A3A6A', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0AFFE0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#04080F' }}>N</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#F0F8FF' }}>NeuraOps</div>
            <div style={{ fontSize: 10, color: '#0AFFE0', letterSpacing: 1 }}>PILOT MVP</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['dashboard','chat','escalations'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: activeTab === tab ? '#0AFFE0' : '#0F2040',
                color: activeTab === tab ? '#04080F' : '#B8D0E8' }}>
              {tab === 'dashboard' ? '🏠 الرئيسية' : tab === 'chat' ? '💬 المحادثة' : '🔔 التصعيدات'}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard */}
      {activeTab === 'dashboard' && (
        <div style={{ padding: 24 }}>
          <h1 style={{ color: '#F0F8FF', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>لوحة مؤشرات الـ Pilot</h1>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'محادثات اليوم', val: '—', icon: '💬' },
              { label: 'نسبة الحل الآلي', val: '—', icon: '✅' },
              { label: 'تصعيدات معلقة', val: '—', icon: '🔔' },
            ].map((s,i) => (
              <div key={i} style={{ background: '#0F2040', border: '1px solid #1A3A6A', borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontSize: 11, color: '#4A7A9B', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#F0F8FF' }}>{s.val}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#0F2040', border: '1px solid #1A3A6A', borderRadius: 14, padding: 20 }}>
            <h3 style={{ color: '#F0F8FF', marginBottom: 12 }}>🔍 فحص الاتصال بـ Supabase</h3>
            <button onClick={checkHealth}
              style={{ background: '#0AFFE0', color: '#04080F', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              فحص الآن
            </button>
            <div style={{ marginTop: 12, fontSize: 13 }}>{health}</div>
          </div>
        </div>
      )}

      {/* Chat */}
      {activeTab === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }}>
          <div style={{ padding: '12px 20px', background: '#0A1628', borderBottom: '1px solid #1A3A6A', fontSize: 12, color: '#0AFFE0' }}>
            ✦ تجربة حية — مساعد NeuraOps الذكي
          </div>
          <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-start' : 'flex-end', maxWidth: '75%' }}>
                {m.role === 'assistant' && <div style={{ fontSize: 10, color: '#0AFFE0', marginBottom: 4 }}>🧠 NeuraOps AI</div>}
                <div style={{
                  padding: '10px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.6,
                  background: m.role === 'user' ? '#0F2040' : 'rgba(10,255,224,0.08)',
                  border: m.role === 'user' ? '1px solid #1A3A6A' : '1px solid rgba(10,255,224,0.15)',
                  color: '#F0F8FF'
                }}>{m.content}</div>
              </div>
            ))}
            {loading && <div style={{ alignSelf: 'flex-end', fontSize: 12, color: '#0AFFE0' }}>⟳ يفكر...</div>}
          </div>
          <div style={{ padding: '12px 20px', background: '#0A1628', borderTop: '1px solid #1A3A6A', display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="اكتب سؤالك..." dir="rtl"
              style={{ flex: 1, background: '#0F2040', border: '1px solid #1A3A6A', borderRadius: 9, padding: '10px 14px', color: '#F0F8FF', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
            <button onClick={sendMessage} disabled={loading}
              style={{ width: 40, height: 40, borderRadius: 9, background: '#0AFFE0', border: 'none', cursor: 'pointer', fontSize: 16 }}>✈</button>
          </div>
        </div>
      )}

      {/* Escalations placeholder */}
      {activeTab === 'escalations' && (
        <div style={{ padding: 24 }}>
          <h2 style={{ color: '#F0F8FF', marginBottom: 16 }}>🔔 التصعيدات المعلقة</h2>
          <div style={{ background: '#0F2040', border: '1px solid #1A3A6A', borderRadius: 14, padding: 20, textAlign: 'center', color: '#4A7A9B' }}>
            ستظهر التصعيدات هنا بعد تفعيل النظام وبدء المحادثات الحقيقية.
          </div>
        </div>
      )}
    </div>
  )
}
