'use client'

import { useState, useEffect } from 'react'

/* ============================================================
   NeuraOps Dashboard — Gold Design System, Native React
   No dangerouslySetInnerHTML, no FOUC, no injected <script>
   ============================================================ */

const translations = {
  ar: {
    dir: 'rtl', lang: 'ar', langBtn: 'EN',
    brand: 'NeuraOps', pilotBadge: 'PILOT MVP',
    navDashboard: 'الرئيسية', navChat: 'المحادثة', navEscalations: 'التصعيدات', navSettings: 'الإعدادات',
    dashTitle: 'لوحة مؤشرات الـ Pilot', dashSub: 'نظرة عامة على أداء المساعد الذكي',
    statConvos: 'محادثات اليوم', statRate: 'نسبة الحل الآلي', statResponse: 'متوسط وقت الرد', statSatisfaction: 'رضا العملاء',
    trendUp: 'عن الأسبوع الماضي',
    chartTitle: 'المحادثات خلال آخر 7 أيام',
    agentPerf: 'أداء الوكلاء', agentDist: 'توزيع المحادثات',
    healthCheck: 'فحص الاتصال بـ Supabase', checkNow: 'فحص الآن', checking: 'جارٍ الفحص...',
    connected: 'متصل', storesCount: 'متجر', notConnected: 'تعذر الاتصال',
    chatLive: 'تجربة حية — مساعد NeuraOps الذكي', chatPlaceholder: 'اكتب سؤالك هنا...',
    aiName: 'NeuraOps AI', thinking: 'يفكر...', welcomeMsg: '👋 مرحباً! أنا مساعدك الذكي. كيف يمكنني مساعدتك؟',
    quickOrder: 'وين طلبي؟', quickReturn: 'سياسة الإرجاع', quickHours: 'أوقات الدوام', quickPayment: 'طرق الدفع',
    escalationsTitle: 'التصعيدات المعلقة', escalationsEmpty: 'ستظهر التصعيدات هنا بعد بدء المحادثات الحقيقية.',
    settingsTitle: 'الإعدادات', settingsEmpty: 'قريباً — إعدادات SLA، أوقات العمل، والرسائل التلقائية.',
    router: 'Router', orderTracker: 'Order Tracker', returns: 'Returns',
  },
  en: {
    dir: 'ltr', lang: 'en', langBtn: 'عربي',
    brand: 'NeuraOps', pilotBadge: 'PILOT MVP',
    navDashboard: 'Dashboard', navChat: 'Chat', navEscalations: 'Escalations', navSettings: 'Settings',
    dashTitle: 'Pilot Dashboard', dashSub: 'Overview of your AI assistant performance',
    statConvos: 'Conversations Today', statRate: 'Auto-Resolution Rate', statResponse: 'Avg Response Time', statSatisfaction: 'Customer Satisfaction',
    trendUp: 'vs last week',
    chartTitle: 'Conversations — Last 7 Days',
    agentPerf: 'Agent Performance', agentDist: 'Conversation Distribution',
    healthCheck: 'Supabase Connection Check', checkNow: 'Check Now', checking: 'Checking...',
    connected: 'Connected', storesCount: 'stores', notConnected: 'Connection failed',
    chatLive: 'Live Demo — NeuraOps AI Assistant', chatPlaceholder: 'Type your question...',
    aiName: 'NeuraOps AI', thinking: 'Thinking...', welcomeMsg: "👋 Hi! I'm your AI assistant. How can I help you?",
    quickOrder: "Where's my order?", quickReturn: 'Return policy', quickHours: 'Business hours', quickPayment: 'Payment methods',
    escalationsTitle: 'Pending Escalations', escalationsEmpty: 'Escalations will appear here once real conversations start.',
    settingsTitle: 'Settings', settingsEmpty: 'Coming soon — SLA settings, work hours, and auto-messages.',
    router: 'Router', orderTracker: 'Order Tracker', returns: 'Returns',
  }
}

type Lang = 'ar' | 'en'
type Theme = 'dark' | 'light'
type Tab = 'dashboard' | 'chat' | 'escalations' | 'settings'
type Message = { role: 'user' | 'assistant'; content: string }

const DEMO_STORE_ID = 'demo-store'

export default function Dashboard() {
  const [lang, setLang] = useState<Lang>('ar')
  const [themeMode, setThemeMode] = useState<Theme>('dark')
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [health, setHealth] = useState<{ status: 'idle' | 'checking' | 'ok' | 'error'; text: string }>({ status: 'idle', text: '' })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedLang = localStorage.getItem('neuraops-lang') as Lang | null
    const savedTheme = localStorage.getItem('neuraops-theme') as Theme | null
    if (savedLang) setLang(savedLang)
    if (savedTheme) setThemeMode(savedTheme)
    setMessages([{ role: 'assistant', content: translations[savedLang || 'ar'].welcomeMsg }])
  }, [])

  const t = translations[lang]
  const isDark = themeMode === 'dark'

  const colors = isDark ? {
    bg: '#050507', bgElevated: '#0C0C10', surface: 'rgba(17,17,20,0.72)', surfaceSolid: '#111114',
    text: '#F4F4F5', textSecondary: '#A1A1AA', textTertiary: '#71717A',
    border: 'rgba(255,255,255,0.07)', borderStrong: 'rgba(255,255,255,0.12)',
  } : {
    bg: '#F7F6F2', bgElevated: '#FFFFFF', surface: 'rgba(255,255,255,0.78)', surfaceSolid: '#FFFFFF',
    text: '#0F0F0F', textSecondary: '#5A5A5A', textTertiary: '#8C8C8C',
    border: 'rgba(0,0,0,0.07)', borderStrong: 'rgba(0,0,0,0.12)',
  }
  const gold = '#C9A961'
  const goldSoft = 'rgba(201,169,97,0.14)'
  const goldBorder = 'rgba(201,169,97,0.35)'

  function toggleLang() {
    const next: Lang = lang === 'ar' ? 'en' : 'ar'
    setLang(next)
    localStorage.setItem('neuraops-lang', next)
  }
  function toggleTheme() {
    const next: Theme = themeMode === 'dark' ? 'light' : 'dark'
    setThemeMode(next)
    localStorage.setItem('neuraops-theme', next)
  }

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
        body: JSON.stringify({ message: text, storeId: DEMO_STORE_ID, sessionId: 'dashboard-demo', history: messages.slice(-6) })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || data.error || '—' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: lang === 'ar' ? 'خطأ في الاتصال.' : 'Connection error.' }])
    } finally {
      setLoading(false)
    }
  }

  // Prevent FOUC: don't render theme-dependent content until mounted+hydrated
  if (!mounted) {
    return <div style={{ background: '#050507', minHeight: '100vh' }} />
  }

  return (
    <div dir={t.dir} style={{
      fontFamily: lang === 'ar' ? "'IBM Plex Sans Arabic','Inter',sans-serif" : "'Inter',sans-serif",
      background: colors.bg, color: colors.text, minHeight: '100vh',
      transition: 'background-color 0.4s ease, color 0.4s ease',
    }}>
      {/* Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Topbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', background: isDark ? 'rgba(5,5,7,0.85)' : 'rgba(247,246,242,0.85)',
        backdropFilter: 'blur(20px)', borderBottom: `1px solid ${colors.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: gold, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#0A0A0F', fontFamily: 'Inter',
          }}>N</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'Inter', letterSpacing: '-0.02em' }}>{t.brand}</div>
            <div style={{ fontSize: 10, color: gold, letterSpacing: 1 }}>{t.pilotBadge}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {(['dashboard', 'chat', 'escalations', 'settings'] as Tab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                background: activeTab === tab ? gold : 'transparent',
                color: activeTab === tab ? '#0A0A0F' : colors.textSecondary,
                fontFamily: lang === 'ar' ? 'IBM Plex Sans Arabic' : 'Inter',
                transition: 'all 0.2s ease',
              }}>
              {tab === 'dashboard' && '🏠 '}{tab === 'chat' && '💬 '}{tab === 'escalations' && '🔔 '}{tab === 'settings' && '⚙️ '}
              {t[`nav${tab.charAt(0).toUpperCase() + tab.slice(1)}` as keyof typeof t]}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, direction: 'ltr' }}>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleLang() }}
            style={{
              background: 'transparent', border: `1px solid ${colors.borderStrong}`, color: colors.textSecondary,
              fontSize: 12, fontWeight: 500, padding: '6px 11px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Inter',
              zIndex: 10, position: 'relative',
            }}>{t.langBtn}</button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleTheme() }}
            aria-label="Toggle theme"
            style={{
              width: 42, height: 26, borderRadius: 100, background: colors.borderStrong, border: 'none',
              position: 'relative', cursor: 'pointer', zIndex: 10, padding: 0,
            }}>
            <span style={{
              position: 'absolute', top: 3, left: isDark ? 19 : 3, width: 20, height: 20, borderRadius: '50%',
              background: colors.bgElevated, transition: 'left 0.3s ease', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 10, pointerEvents: 'none',
            }}>{isDark ? '🌙' : '☀️'}</span>
          </button>
        </div>
      </div>

      <div style={{ padding: activeTab === 'chat' ? 0 : '24px', maxWidth: activeTab === 'chat' ? 'none' : 900, margin: activeTab === 'chat' ? 0 : '0 auto' }}>

        {/* ===== DASHBOARD TAB ===== */}
        {activeTab === 'dashboard' && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>{t.dashTitle}</h1>
            <p style={{ fontSize: 13.5, color: colors.textSecondary, marginBottom: 24 }}>{t.dashSub}</p>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { icon: '💬', label: t.statConvos, value: '247', trend: '+12%' },
                { icon: '✅', label: t.statRate, value: '78%', trend: '+8%', highlight: true },
                { icon: '⚡', label: t.statResponse, value: '4.2s', trend: '-0.6s' },
                { icon: '😊', label: t.statSatisfaction, value: '4.7/5', trend: '+0.3' },
              ].map((s, i) => (
                <div key={i} style={{
                  background: colors.surfaceSolid, border: `1px solid ${s.highlight ? goldBorder : colors.border}`,
                  borderRadius: 16, padding: 18,
                  ...(s.highlight ? { background: `linear-gradient(180deg, ${goldSoft}, ${colors.surfaceSolid})` } : {}),
                }}>
                  <div style={{ fontSize: 20, marginBottom: 10 }}>{s.icon}</div>
                  <div style={{ fontSize: 11.5, color: colors.textTertiary, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Inter', letterSpacing: '-0.02em' }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#22C55E', marginTop: 6, fontWeight: 600 }}>↑ {s.trend} {t.trendUp}</div>
                </div>
              ))}
            </div>

            {/* Health check card */}
            <div style={{
              background: colors.surfaceSolid, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20, marginBottom: 20,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🔍 {t.healthCheck}</div>
              <button onClick={checkHealth} disabled={health.status === 'checking'} style={{
                background: gold, color: '#0A0A0F', border: 'none', borderRadius: 9, padding: '10px 20px',
                fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                opacity: health.status === 'checking' ? 0.6 : 1,
              }}>{t.checkNow}</button>
              {health.text && <div style={{ marginTop: 12, fontSize: 13, color: gold, fontWeight: 600 }}>{health.text}</div>}
            </div>

            {/* Agent performance */}
            <div style={{
              background: colors.surfaceSolid, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>🤖 {t.agentPerf}</div>
              {[
                { name: t.router, pct: 32 },
                { name: t.orderTracker, pct: 28 },
                { name: t.returns, pct: 20 },
              ].map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, marginBottom: 4, color: colors.textSecondary }}>{a.name}</div>
                    <div style={{ height: 4, background: colors.border, borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${a.pct}%`, background: gold, borderRadius: 2 }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, fontFamily: 'Inter', width: 36, textAlign: 'end' }}>{a.pct}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== CHAT TAB ===== */}
        {activeTab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 61px)' }}>
            <div style={{
              padding: '10px 20px', background: isDark ? 'rgba(5,5,7,0.9)' : 'rgba(247,246,242,0.9)',
              borderBottom: `1px solid ${colors.border}`, fontSize: 12, color: gold, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: '#22C55E', display: 'inline-block',
                animation: 'ping 1.5s ease-in-out infinite',
              }} />
              {t.chatLive}
            </div>

            <div style={{ flex: 1, padding: '18px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 700, margin: '0 auto', width: '100%' }}>
              {messages.map((m, i) => (
                <div key={i} style={{ alignSelf: m.role === 'user' ? (lang === 'ar' ? 'flex-start' : 'flex-start') : 'flex-end', maxWidth: '78%' }}>
                  {m.role === 'assistant' && <div style={{ fontSize: 10, color: gold, marginBottom: 4, fontWeight: 600 }}>🧠 {t.aiName}</div>}
                  <div style={{
                    padding: '11px 15px', borderRadius: 13, fontSize: 13.5, lineHeight: 1.7,
                    background: m.role === 'user' ? colors.surfaceSolid : goldSoft,
                    border: m.role === 'user' ? `1px solid ${colors.border}` : `1px solid ${goldBorder}`,
                    color: colors.text,
                  }}>{m.content}</div>
                </div>
              ))}
              {loading && <div style={{ alignSelf: 'flex-end', fontSize: 12, color: gold }}>⟳ {t.thinking}</div>}
            </div>

            <div style={{ padding: '14px 20px', background: isDark ? 'rgba(5,5,7,0.9)' : 'rgba(247,246,242,0.9)', borderTop: `1px solid ${colors.border}`, maxWidth: 700, margin: '0 auto', width: '100%' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder={t.chatPlaceholder} style={{
                    flex: 1, background: colors.surfaceSolid, border: `1.5px solid ${colors.border}`, borderRadius: 10,
                    padding: '12px 16px', color: colors.text, fontSize: 13.5, outline: 'none', fontFamily: 'inherit',
                  }} />
                <button onClick={() => sendMessage()} disabled={loading} style={{
                  width: 44, height: 44, borderRadius: 10, background: loading ? colors.borderStrong : gold,
                  border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 17,
                }}>✈</button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[t.quickOrder, t.quickReturn, t.quickHours, t.quickPayment].map(q => (
                  <button key={q} onClick={() => sendMessage(q)} style={{
                    background: colors.surfaceSolid, border: `1px solid ${colors.border}`, borderRadius: 100,
                    padding: '6px 13px', fontSize: 11.5, color: colors.textSecondary, cursor: 'pointer', fontFamily: 'inherit',
                  }}>{q}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== ESCALATIONS TAB ===== */}
        {activeTab === 'escalations' && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>🔔 {t.escalationsTitle}</h1>
            <div style={{
              background: colors.surfaceSolid, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 40,
              textAlign: 'center', color: colors.textTertiary, fontSize: 13.5,
            }}>{t.escalationsEmpty}</div>
          </div>
        )}

        {/* ===== SETTINGS TAB ===== */}
        {activeTab === 'settings' && (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>⚙️ {t.settingsTitle}</h1>
            <div style={{
              background: colors.surfaceSolid, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 40,
              textAlign: 'center', color: colors.textTertiary, fontSize: 13.5,
            }}>{t.settingsEmpty}</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes ping { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  )
}
