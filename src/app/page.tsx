'use client'

import { useState } from 'react'

const DEMO_STORE_ID = 'demo-store'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat'>('dashboard')
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '👋 مرحباً! أنا مساعدك الذكي. كيف يمكنني مساعدتك؟' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [health, setHealth] = useState('اضغط فحص')

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
        body: JSON.stringify({ message: userMsg, storeId: DEMO_STORE_ID, sessionId: 'demo-1', history: messages.slice(-6) })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || data.error || 'عذراً، حدث خطأ.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'خطأ في الاتصال.' }])
    } finally {
      setLoading(false)
    }
  }

  const checkHealth = async () => {
    setHealth('جارٍ الفحص...')
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      setHealth(data.status === 'ok' ? `✅ متصل — ${data.stores_count} متجر` : `❌ ${data.error}`)
    } catch {
      setHealth('❌ تعذر الاتصال')
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui', background: '#04080F', minHeight: '100vh', color: '#B8D0E8' }}>
      <div style={{ background: '#0A1628', borderBottom: '1px solid #1A3A6A', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0AFFE0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#04080F' }}>N</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#F0F8FF' }}>NeuraOps</div>
            <div style={{ fontSize: 10, color: '#0AFFE0', letterSpacing: 1 }}>PILOT MVP</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['dashboard', 'chat'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: activeTab === tab ? '#0AFFE0' : '#0F2040', color: activeTab === tab ? '#04080F' : '#B8D0E8' }}>
              {tab === 'dashboard' ? '🏠 الرئيسية' : '💬 المحادثة'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
          <h1 style={{ color: '#F0F8FF', fontSize: 22, fontWeight: 800, marginBottom: 4 }}>NeuraOps — لوحة التحكم</h1>
          <p style={{ color: '#4A7A9B', marginBottom: 24, fontSize: 13 }}>Pilot MVP — يعمل على السحابة</p>
          <div style={{ background: '#0F2040', border: '1px solid #1A3A6A', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#F0F8FF', marginBottom: 12 }}>🔍 فحص الاتصال بـ Supabase</div>
            <button onClick={checkHealth} style={{ background: '#0AFFE0', color: '#04080F', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>فحص الآن</button>
            <div style={{ marginTop: 12, fontSize: 13, color: '#0AFFE0' }}>{health}</div>
          </div>
        </div>
      )}

      {activeTab === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 61px)' }}>
          <div style={{ padding: '10px 20px', background: '#0A1628', borderBottom: '1px solid #1A3A6A', fontSize: 12, color: '#0AFFE0' }}>✦ تجربة حية — مساعد NeuraOps الذكي</div>
          <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 700, margin: '0 auto', width: '100%' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-start' : 'flex-end', maxWidth: '78%' }}>
                {m.role === 'assistant' && <div style={{ fontSize: 10, color: '#0AFFE0', marginBottom: 4 }}>🧠 NeuraOps AI</div>}
                <div style={{ padding: '10px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.7, background: m.role === 'user' ? '#0F2040' : 'rgba(10,255,224,0.07)', border: m.role === 'user' ? '1px solid #1A3A6A' : '1px solid rgba(10,255,224,0.15)', color: '#F0F8FF', direction: 'rtl', textAlign: 'right' }}>{m.content}</div>
              </div>
            ))}
            {loading && <div style={{ alignSelf: 'flex-end', fontSize: 12, color: '#0AFFE0' }}>⟳ يفكر...</div>}
          </div>
          <div style={{ padding: '12px 20px', background: '#0A1628', borderTop: '1px solid #1A3A6A', maxWidth: 700, margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="اكتب سؤالك هنا..." dir="rtl" style={{ flex: 1, background: '#0F2040', border: '1px solid #1A3A6A', borderRadius: 9, padding: '11px 14px', color: '#F0F8FF', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
              <button onClick={sendMessage} disabled={loading} style={{ width: 42, height: 42, borderRadius: 9, background: loading ? '#1A3A6A' : '#0AFFE0', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 17 }}>✈</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
