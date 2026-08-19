"use client"

import { useEffect, useRef } from 'react'

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const fontLink = document.createElement('link')
    fontLink.rel = 'stylesheet'
    fontLink.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap'
    document.head.appendChild(fontLink)

    const styleEl = document.createElement('style')
    styleEl.id = 'landingpage-styles'
    styleEl.textContent = `
    /* ================================================
       NeuraOps Design System v3 — Global 2026
       Target: European precision + Gulf luxury + E-com SaaS
       ================================================ */

    :root {
      --gold: #C9A961;
      --gold-hover: #B8944F;
      --gold-soft: rgba(201, 169, 97, 0.14);
      --gold-glow: rgba(201, 169, 97, 0.28);
      --gold-border: rgba(201, 169, 97, 0.35);

      --bg: #F7F6F2;
      --bg-elevated: #FFFFFF;
      --surface: rgba(255, 255, 255, 0.78);
      --surface-solid: #FFFFFF;
      --text: #0F0F0F;
      --text-secondary: #5A5A5A;
      --text-tertiary: #8C8C8C;
      --border: rgba(0, 0, 0, 0.07);
      --border-strong: rgba(0, 0, 0, 0.12);
      --header-bg: rgba(247, 246, 242, 0.82);
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.04);
      --shadow-md: 0 8px 30px rgba(0,0,0,0.06);
      --shadow-lg: 0 20px 50px rgba(0,0,0,0.08);
      --grid: rgba(0,0,0,0.025);
      --success: #22C55E;
    }

    [data-theme="dark"] {
      --bg: #050507;
      --bg-elevated: #0C0C10;
      --surface: rgba(17, 17, 20, 0.72);
      --surface-solid: #111114;
      --text: #F4F4F5;
      --text-secondary: #A1A1AA;
      --text-tertiary: #71717A;
      --border: rgba(255, 255, 255, 0.07);
      --border-strong: rgba(255, 255, 255, 0.12);
      --header-bg: rgba(5, 5, 7, 0.85);
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
      --shadow-md: 0 8px 30px rgba(0,0,0,0.45);
      --shadow-lg: 0 20px 50px rgba(0,0,0,0.55);
      --grid: rgba(255,255,255,0.03);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    html {
      font-size: 16px;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      scroll-behavior: smooth;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      min-height: 100dvh;
      transition: background-color 0.4s ease, color 0.4s ease;
      overflow-x: hidden;
    }

    [dir="rtl"] body,
    [dir="rtl"] button,
    [dir="rtl"] input,
    [dir="rtl"] a {
      font-family: 'IBM Plex Sans Arabic', 'Inter', sans-serif;
    }

    /* Ambient background */
    .bg-mesh {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background-image:
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(201, 169, 97, 0.09), transparent),
        linear-gradient(var(--grid) 1px, transparent 1px),
        linear-gradient(90deg, var(--grid) 1px, transparent 1px);
      background-size: 100% 100%, 56px 56px, 56px 56px;
      opacity: 1;
    }

    [data-theme="dark"] .bg-mesh {
      background-image:
        radial-gradient(ellipse 70% 40% at 50% -10%, rgba(201, 169, 97, 0.11), transparent),
        linear-gradient(var(--grid) 1px, transparent 1px),
        linear-gradient(90deg, var(--grid) 1px, transparent 1px);
    }

    /* ========== Header ========== */
    .header {
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      padding-top: max(12px, env(safe-area-inset-top));
      background: var(--header-bg);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border-bottom: 1px solid var(--border);
      direction: ltr;
    }

    .header-left, .header-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-start-now {
      background: var(--gold);
      color: #0A0A0F;
      font-weight: 600;
      font-size: 13.5px;
      padding: 9px 16px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
      box-shadow: 0 2px 10px var(--gold-glow);
      white-space: nowrap;
    }
    .btn-start-now:hover {
      background: var(--gold-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 16px var(--gold-glow);
    }

    .theme-toggle {
      width: 42px;
      height: 26px;
      border-radius: 100px;
      background: var(--border-strong);
      border: none;
      position: relative;
      cursor: pointer;
      transition: background 0.3s ease;
    }
    .theme-toggle::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--bg-elevated);
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    [data-theme="dark"] .theme-toggle::after {
      transform: translateX(16px);
    }

    .lang-btn {
      background: transparent;
      border: 1px solid var(--border-strong);
      color: var(--text-secondary);
      font-size: 12.5px;
      font-weight: 500;
      padding: 6px 11px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: 'Inter', sans-serif;
    }
    .lang-btn:hover {
      border-color: var(--gold);
      color: var(--text);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 15.5px;
      letter-spacing: -0.02em;
      color: var(--text);
      text-decoration: none;
    }
    .brand-logo {
      width: 26px;
      height: 26px;
      background: var(--gold);
      color: #0A0A0F;
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      font-family: 'Inter', sans-serif;
    }

    /* ========== Main ========== */
    .main {
      position: relative;
      z-index: 1;
      max-width: 1120px;
      margin: 0 auto;
      padding: 0 20px 100px;
    }

    /* Hero */
    .hero {
      padding: 48px 0 40px;
      text-align: center;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: var(--gold-soft);
      color: var(--gold);
      font-size: 12.5px;
      font-weight: 500;
      padding: 7px 15px;
      border-radius: 100px;
      margin-bottom: 28px;
      border: 1px solid var(--gold-border);
      letter-spacing: 0.01em;
    }
    .badge-dot {
      width: 6px;
      height: 6px;
      background: var(--gold);
      border-radius: 50%;
      box-shadow: 0 0 0 3px rgba(201, 169, 97, 0.25);
      animation: pulse 2.2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.65; transform: scale(0.9); }
    }

    .hero-title {
      font-size: clamp(2.15rem, 6.5vw, 3.4rem);
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: -0.035em;
      margin-bottom: 20px;
      max-width: 820px;
      margin-inline: auto;
    }
    .hero-title .highlight {
      color: var(--gold);
      position: relative;
    }

    .hero-sub {
      font-size: clamp(1rem, 2.2vw, 1.15rem);
      line-height: 1.7;
      color: var(--text-secondary);
      max-width: 580px;
      margin: 0 auto 36px;
    }
    .hero-sub strong {
      color: var(--text);
      font-weight: 600;
    }

    .cta-group {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: center;
      margin-bottom: 40px;
    }

    .btn-primary {
      background: var(--gold);
      color: #0A0A0F;
      font-weight: 600;
      font-size: 15.5px;
      padding: 14px 28px;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 18px var(--gold-glow);
    }
    .btn-primary:hover {
      background: var(--gold-hover);
      transform: translateY(-2px);
      box-shadow: 0 8px 28px var(--gold-glow);
    }

    .btn-secondary {
      background: transparent;
      color: var(--text);
      font-weight: 500;
      font-size: 15.5px;
      padding: 14px 26px;
      border-radius: 12px;
      border: 1.5px solid var(--border-strong);
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }
    .btn-secondary:hover {
      border-color: var(--gold);
      background: var(--gold-soft);
    }

    /* Live Ticker — Signature */
    .ticker-wrap {
      max-width: 640px;
      margin: 0 auto 56px;
      position: relative;
    }
    .ticker {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1px;
      background: var(--border);
      border: 1px solid var(--border);
      border-radius: 18px;
      overflow: hidden;
      box-shadow: var(--shadow-md);
      direction: ltr;
      backdrop-filter: blur(12px);
      background: var(--surface);
    }
    .stat {
      background: var(--surface-solid);
      padding: 22px 12px 18px;
      text-align: center;
      position: relative;
    }
    .stat-value {
      font-size: clamp(1.5rem, 4vw, 1.85rem);
      font-weight: 700;
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
      font-family: 'Inter', sans-serif;
      line-height: 1.1;
      margin-bottom: 5px;
      color: var(--text);
    }
    .stat-value .unit {
      font-size: 0.78rem;
      font-weight: 500;
      color: var(--text-secondary);
      margin-inline-start: 1px;
    }
    .stat-label {
      font-size: 11.5px;
      color: var(--text-tertiary);
      font-weight: 500;
    }
    .live-badge {
      position: absolute;
      top: 10px;
      right: 12px;
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      font-weight: 600;
      color: var(--gold);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .live-dot {
      width: 6px;
      height: 6px;
      background: var(--success);
      border-radius: 50%;
      animation: livePulse 1.5s ease-in-out infinite;
    }
    @keyframes livePulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.45); }
      50% { box-shadow: 0 0 0 5px rgba(34, 197, 94, 0); }
    }

    /* Product Visual — Agents Preview */
    .product-visual {
      position: relative;
      max-width: 920px;
      margin: 0 auto 64px;
      padding: 8px;
      border-radius: 24px;
      background: linear-gradient(135deg, rgba(201,169,97,0.18), rgba(201,169,97,0.04));
      border: 1px solid var(--gold-border);
      box-shadow: var(--shadow-lg);
    }
    .product-frame {
      background: var(--surface-solid);
      border-radius: 18px;
      padding: 20px 16px 24px;
      border: 1px solid var(--border);
      overflow: hidden;
    }
    .product-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 18px;
      padding: 0 6px;
      direction: ltr;
    }
    .product-title {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .product-title span {
      width: 8px;
      height: 8px;
      background: var(--success);
      border-radius: 50%;
    }
    .product-meta {
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .agents-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    @media (max-width: 640px) {
      .agents-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .agent-card {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 14px 12px;
      transition: all 0.25s ease;
      position: relative;
      overflow: hidden;
    }
    .agent-card:hover {
      border-color: var(--gold-border);
      transform: translateY(-3px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.06);
    }
    [data-theme="dark"] .agent-card:hover {
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }
    .agent-num {
      position: absolute;
      top: 10px;
      inset-inline-end: 10px;
      font-size: 11px;
      font-weight: 600;
      color: var(--gold);
      opacity: 0.7;
      font-family: 'Inter', sans-serif;
    }
    .agent-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: var(--gold-soft);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      margin-bottom: 10px;
    }
    .agent-name {
      font-size: 13.5px;
      font-weight: 600;
      margin-bottom: 3px;
      color: var(--text);
    }
    .agent-desc {
      font-size: 11.5px;
      color: var(--text-tertiary);
      line-height: 1.4;
    }

    /* Social Proof */
    .social-proof {
      text-align: center;
      padding: 28px 0 48px;
      border-top: 1px solid var(--border);
    }
    .social-label {
      font-size: 12.5px;
      font-weight: 500;
      color: var(--text-tertiary);
      margin-bottom: 20px;
      letter-spacing: 0.02em;
    }
    .logos {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 28px 36px;
      opacity: 0.55;
    }
    .logo-item {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-secondary);
      letter-spacing: -0.01em;
      font-family: 'Inter', sans-serif;
    }

    /* Value props */
    .values {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 64px;
    }
    @media (max-width: 720px) {
      .values { grid-template-columns: 1fr; }
    }
    .value-card {
      background: var(--surface);
      backdrop-filter: blur(12px);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px 20px;
      transition: all 0.25s ease;
    }
    .value-card:hover {
      border-color: var(--gold-border);
      box-shadow: var(--shadow-md);
    }
    .value-icon {
      width: 40px;
      height: 40px;
      border-radius: 11px;
      background: var(--gold-soft);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      margin-bottom: 14px;
    }
    .value-title {
      font-size: 15.5px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .value-desc {
      font-size: 13.5px;
      color: var(--text-secondary);
      line-height: 1.55;
    }

    /* Final CTA band */
    .final-cta {
      background: linear-gradient(135deg, rgba(201,169,97,0.12), rgba(201,169,97,0.04));
      border: 1px solid var(--gold-border);
      border-radius: 20px;
      padding: 40px 28px;
      text-align: center;
      margin-bottom: 40px;
    }
    .final-cta h2 {
      font-size: clamp(1.5rem, 4vw, 1.9rem);
      font-weight: 700;
      letter-spacing: -0.025em;
      margin-bottom: 10px;
    }
    .final-cta p {
      color: var(--text-secondary);
      margin-bottom: 24px;
      font-size: 15px;
    }

    /* Bottom bar mobile */
    .bottom-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 12px 16px;
      padding-bottom: max(12px, env(safe-area-inset-bottom));
      background: var(--header-bg);
      backdrop-filter: blur(18px);
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: center;
      z-index: 90;
    }
    .bottom-cta {
      background: linear-gradient(135deg, #C9A961, #B8944F);
      color: #0A0A0F;
      font-weight: 600;
      font-size: 15px;
      padding: 14px 28px;
      border-radius: 13px;
      border: none;
      cursor: pointer;
      text-decoration: none;
      box-shadow: 0 4px 20px var(--gold-glow);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      max-width: 380px;
      transition: all 0.2s ease;
    }
    .bottom-cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 28px var(--gold-glow);
    }

    @media (min-width: 768px) {
      .bottom-bar { display: none; }
    }

    /* Focus */
    button:focus-visible,
    a:focus-visible {
      outline: 2px solid var(--gold);
      outline-offset: 2px;
    }
  `
    document.head.appendChild(styleEl)

    const script = document.createElement('script')
    script.id = 'landingpage-script'
    script.textContent = `
    const agentsData = {
      ar: [
        { icon: "💬", name: "وكيل الردود", desc: "يرد فوراً على الاستفسارات الشائعة" },
        { icon: "📦", name: "وكيل الطلبات", desc: "تتبع الشحنات وتحديث الحالة" },
        { icon: "↩️", name: "وكيل الإرجاع", desc: "إدارة المرتجعات والاستبدالات" },
        { icon: "💳", name: "وكيل الدفع", desc: "حل مشاكل الدفع والفواتير" },
        { icon: "🎁", name: "وكيل العروض", desc: "اقتراح المنتجات والعروض" },
        { icon: "🛡️", name: "وكيل التصعيد", desc: "يحول الحالات المعقدة للفريق" }
      ],
      en: [
        { icon: "💬", name: "Reply Agent", desc: "Instant answers to common questions" },
        { icon: "📦", name: "Orders Agent", desc: "Tracking & status updates" },
        { icon: "↩️", name: "Returns Agent", desc: "Returns & exchange handling" },
        { icon: "💳", name: "Payments Agent", desc: "Payment & invoice issues" },
        { icon: "🎁", name: "Offers Agent", desc: "Product & promo suggestions" },
        { icon: "🛡️", name: "Escalation Agent", desc: "Routes complex cases to humans" }
      ]
    };

    const translations = {
      ar: {
        dir: "rtl", lang: "ar",
        startNow: "ابدأ الآن",
        brand: "NeuraOps",
        badge: "نظام تشغيل ذكي · جيل 2026",
        title1: "دعمك الآلي",
        title2: "يعمل <span class=\"highlight\">بذكاء</span>،",
        title3: "على مدار الساعة",
        subtitle: "<strong>NeuraOps</strong> يربط متجرك بستة وكلاء ذكاء اصطناعي متخصصين، يردون على عملائك فوراً، بدقة، وبأسلوبك الخاص — دون تدخل بشري.",
        ctaPrimary: "ابدأ تجربتك المجانية <span style=\"font-size:1.05em\">←</span>",
        ctaSecondary: "شاهد العرض التوضيحي",
        live: "مباشر",
        unitSec: "ث",
        labelResponse: "متوسط وقت الرد",
        labelRate: "نسبة الحل الآلي",
        labelConvos: "محادثة اليوم",
        agentsTitle: "NeuraOps Agents — Active",
        agentsMeta: "6 وكلاء متخصصين يعملون الآن",
        socialLabel: "موثوق به من متاجر رائدة في أكثر من 28 دولة",
        v1Title: "رد فوري 24/7",
        v1Desc: "وكلاء يعملون بلا توقف. متوسط الرد أقل من 5 ثوانٍ حتى في ذروة الموسم.",
        v2Title: "بأسلوب علامتك",
        v2Desc: "يتعلم نبرة صوتك وسياساتك. الردود تبدو كأنها من فريقك تماماً.",
        v3Title: "حل آلي عالي",
        v3Desc: "أكثر من 78% من المحادثات تُحل دون تدخل بشري — وترتفع مع الوقت.",
        finalTitle: "جاهز لتحويل دعم عملائك؟",
        finalSub: "تجربة مجانية 14 يوم · بدون بطاقة ائتمان · إعداد في أقل من 10 دقائق",
        finalCta: "ابدأ تجربتك المجانية الآن",
        bottomCta: "✨ ابدأ تجربتك المجانية",
        langBtn: "EN"
      },
      en: {
        dir: "ltr", lang: "en",
        startNow: "Start Now",
        brand: "NeuraOps",
        badge: "Intelligent OS · Gen 2026",
        title1: "Your AI Support",
        title2: "Works <span class=\"highlight\">Intelligently</span>,",
        title3: "Around the Clock",
        subtitle: "<strong>NeuraOps</strong> connects your store to six specialized AI agents that respond to customers instantly, accurately, and in your unique style — with zero human intervention.",
        ctaPrimary: "Start Free Trial <span style=\"font-size:1.05em\">→</span>",
        ctaSecondary: "Watch Demo",
        live: "LIVE",
        unitSec: "s",
        labelResponse: "Avg Response Time",
        labelRate: "Auto Resolution",
        labelConvos: "Conversations Today",
        agentsTitle: "NeuraOps Agents — Active",
        agentsMeta: "6 specialized agents running",
        socialLabel: "Trusted by leading stores in 28+ countries",
        v1Title: "Instant 24/7 Replies",
        v1Desc: "Agents never sleep. Average response under 5 seconds even during peak seasons.",
        v2Title: "In Your Brand Voice",
        v2Desc: "Learns your tone and policies. Replies feel exactly like your team.",
        v3Title: "High Auto-Resolution",
        v3Desc: "Over 78% of conversations resolved without humans — and improving over time.",
        finalTitle: "Ready to transform your support?",
        finalSub: "14-day free trial · No credit card · Setup in under 10 minutes",
        finalCta: "Start Your Free Trial Now",
        bottomCta: "✨ Start Free Trial",
        langBtn: "عربي"
      }
    };

    let currentLang = localStorage.getItem("neuraops-lang") || "ar";

    function renderAgents(lang) {
      const grid = document.getElementById("agentsGrid");
      const data = agentsData[lang];
      grid.innerHTML = data.map((a, i) => \`
        <div class="agent-card">
          <div class="agent-num">0\${i + 1}</div>
          <div class="agent-icon">\${a.icon}</div>
          <div class="agent-name">\${a.name}</div>
          <div class="agent-desc">\${a.desc}</div>
        </div>
      \`).join("");
    }

    function setLanguage(lang) {
      currentLang = lang;
      const t = translations[lang];
      document.documentElement.setAttribute("dir", t.dir);
      document.documentElement.setAttribute("lang", t.lang);

      document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (t[key]) el.innerHTML = t[key];
      });

      document.getElementById("langToggle").textContent = t.langBtn;
      renderAgents(lang);
      localStorage.setItem("neuraops-lang", lang);
    }

    // Theme
    const savedTheme = localStorage.getItem("neuraops-theme");
    if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);

    document.getElementById("themeToggle").addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("neuraops-theme", next);
    });

    document.getElementById("langToggle").addEventListener("click", () => {
      setLanguage(currentLang === "ar" ? "en" : "ar");
    });

    setLanguage(currentLang);

    // Count-up animation
    function animateValue(el, start, end, duration, decimals = 0) {
      const startTime = performance.now();
      const range = end - start;
      function update(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = start + range * ease;
        el.textContent = decimals > 0 ? current.toFixed(decimals) : Math.round(current).toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
    }

    window.addEventListener("load", () => {
      setTimeout(() => {
        animateValue(document.getElementById("statResponse"), 0, 4.2, 1500, 1);
        animateValue(document.getElementById("statRate"), 0, 78, 1700);
        animateValue(document.getElementById("statConvos"), 0, 247, 1900);
      }, 350);
    });

    // Subtle live update
    setInterval(() => {
      const el = document.getElementById("statConvos");
      const current = parseInt(el.textContent.replace(/,/g, "")) || 247;
      animateValue(el, current, current + Math.floor(Math.random() * 3) + 1, 700);
    }, 11000);
  `
    document.body.appendChild(script)

    return () => {
      styleEl.remove()
      fontLink.remove()
      const oldScript = document.getElementById('landingpage-script')
      if (oldScript) oldScript.remove()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: `
  <div class="bg-mesh"></div>

  <!-- Header -->
  <header class="header">
    <div class="header-left">
      <a href="/trial" class="btn-start-now" data-i18n="startNow">ابدأ الآن</a>
      <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme"></button>
    </div>
    <div class="header-right">
      <button class="lang-btn" id="langToggle">EN</button>
      <a href="#" class="brand">
        <span data-i18n="brand">NeuraOps</span>
        <div class="brand-logo">N</div>
      </a>
    </div>
  </header>

  <main class="main">
    <!-- Hero -->
    <section class="hero">
      <div class="badge">
        <span class="badge-dot"></span>
        <span data-i18n="badge">نظام تشغيل ذكي · جيل 2026</span>
      </div>

      <h1 class="hero-title">
        <span data-i18n="title1">دعمك الآلي</span><br>
        <span data-i18n="title2">يعمل <span class="highlight">بذكاء</span>،</span><br>
        <span data-i18n="title3">على مدار الساعة</span>
      </h1>

      <p class="hero-sub" data-i18n="subtitle">
        <strong>NeuraOps</strong> يربط متجرك بستة وكلاء ذكاء اصطناعي متخصصين، يردون على عملائك فوراً، بدقة، وبأسلوبك الخاص — دون تدخل بشري.
      </p>

      <div class="cta-group">
        <a href="/trial" class="btn-primary" data-i18n="ctaPrimary">
          ابدأ تجربتك المجانية
          <span style="font-size:1.05em">←</span>
        </a>
        <button class="btn-secondary" data-i18n="ctaSecondary">
          شاهد العرض التوضيحي
        </button>
      </div>

      <!-- Live Ticker -->
      <div class="ticker-wrap">
        <div class="ticker">
          <div class="stat">
            <div class="stat-value"><span id="statResponse">0</span><span class="unit" data-i18n="unitSec">ث</span></div>
            <div class="stat-label" data-i18n="labelResponse">متوسط وقت الرد</div>
          </div>
          <div class="stat">
            <div class="stat-value"><span id="statRate">0</span><span class="unit">%</span></div>
            <div class="stat-label" data-i18n="labelRate">نسبة الحل الآلي</div>
          </div>
          <div class="stat" style="position:relative">
            <div class="live-badge">
              <span class="live-dot"></span>
              <span data-i18n="live">مباشر</span>
            </div>
            <div class="stat-value"><span id="statConvos">0</span></div>
            <div class="stat-label" data-i18n="labelConvos">محادثة اليوم</div>
          </div>
        </div>
      </div>

      <!-- Product Visual: 6 Agents -->
      <div class="product-visual">
        <div class="product-frame">
          <div class="product-header">
            <div class="product-title">
              <span></span>
              <span data-i18n="agentsTitle">NeuraOps Agents — Active</span>
            </div>
            <div class="product-meta" data-i18n="agentsMeta">6 specialized agents running</div>
          </div>

          <div class="agents-grid" id="agentsGrid">
            <!-- Filled by JS for i18n -->
          </div>
        </div>
      </div>
    </section>

    <!-- Social Proof -->
    <section class="social-proof">
      <p class="social-label" data-i18n="socialLabel">موثوق به من متاجر رائدة في أكثر من 28 دولة</p>
      <div class="logos">
        <span class="logo-item">Salla</span>
        <span class="logo-item">Zid</span>
        <span class="logo-item">Shopify</span>
        <span class="logo-item">Woo</span>
        <span class="logo-item">Magento</span>
        <span class="logo-item">ExpandCart</span>
      </div>
    </section>

    <!-- Value props -->
    <section class="values">
      <div class="value-card">
        <div class="value-icon">⚡</div>
        <div class="value-title" data-i18n="v1Title">رد فوري 24/7</div>
        <div class="value-desc" data-i18n="v1Desc">وكلاء يعملون بلا توقف. متوسط الرد أقل من 5 ثوانٍ حتى في ذروة الموسم.</div>
      </div>
      <div class="value-card">
        <div class="value-icon">🎯</div>
        <div class="value-title" data-i18n="v2Title">بأسلوب علامتك</div>
        <div class="value-desc" data-i18n="v2Desc">يتعلم نبرة صوتك وسياساتك. الردود تبدو كأنها من فريقك تماماً.</div>
      </div>
      <div class="value-card">
        <div class="value-icon">📈</div>
        <div class="value-title" data-i18n="v3Title">حل آلي عالي</div>
        <div class="value-desc" data-i18n="v3Desc">أكثر من 78% من المحادثات تُحل دون تدخل بشري — وترتفع مع الوقت.</div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="final-cta">
      <h2 data-i18n="finalTitle">جاهز لتحويل دعم عملائك؟</h2>
      <p data-i18n="finalSub">تجربة مجانية 14 يوم · بدون بطاقة ائتمان · إعداد في أقل من 10 دقائق</p>
      <a href="/trial" class="btn-primary" data-i18n="finalCta">
        ابدأ تجربتك المجانية الآن
      </a>
    </section>
  </main>

  <!-- Mobile sticky CTA -->
  <div class="bottom-bar">
    <a href="/trial" class="bottom-cta" data-i18n="bottomCta">
      ✨ ابدأ تجربتك المجانية
    </a>
  </div>

  
` }}
    />
  )
}
