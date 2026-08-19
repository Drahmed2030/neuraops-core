"use client"

import { useEffect, useRef } from 'react'

export default function TrialPage() {
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
    styleEl.id = 'trialpage-styles'
    styleEl.textContent = `
    /* ================================================
       NeuraOps Design System v3 — shared tokens
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
      --error: #EF4444;
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
    html { font-size: 16px; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; scroll-behavior: smooth; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      background: var(--bg); color: var(--text); line-height: 1.5; min-height: 100dvh;
      transition: background-color 0.4s ease, color 0.4s ease; overflow-x: hidden;
    }
    [dir="rtl"] body, [dir="rtl"] button, [dir="rtl"] input, [dir="rtl"] select, [dir="rtl"] textarea, [dir="rtl"] a {
      font-family: 'IBM Plex Sans Arabic', 'Inter', sans-serif;
    }

    .bg-mesh {
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background-image:
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(201, 169, 97, 0.09), transparent),
        linear-gradient(var(--grid) 1px, transparent 1px),
        linear-gradient(90deg, var(--grid) 1px, transparent 1px);
      background-size: 100% 100%, 56px 56px, 56px 56px;
    }
    [data-theme="dark"] .bg-mesh {
      background-image:
        radial-gradient(ellipse 70% 40% at 50% -10%, rgba(201, 169, 97, 0.11), transparent),
        linear-gradient(var(--grid) 1px, transparent 1px),
        linear-gradient(90deg, var(--grid) 1px, transparent 1px);
    }

    /* Header */
    .header {
      position: sticky; top: 0; z-index: 100;
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 20px; padding-top: max(12px, env(safe-area-inset-top));
      background: var(--header-bg); backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border-bottom: 1px solid var(--border); direction: ltr;
    }
    .header-left, .header-right { display: flex; align-items: center; gap: 10px; }
    .back-link {
      display: flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 500;
      color: var(--text-secondary); text-decoration: none; padding: 8px 12px; border-radius: 9px;
      transition: all 0.2s ease;
    }
    .back-link:hover { color: var(--text); background: var(--gold-soft); }
    .theme-toggle {
      width: 42px; height: 26px; border-radius: 100px; background: var(--border-strong);
      border: none; position: relative; cursor: pointer; transition: background 0.3s ease;
    }
    .theme-toggle::after {
      content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px;
      border-radius: 50%; background: var(--bg-elevated); box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    [data-theme="dark"] .theme-toggle::after { transform: translateX(16px); }
    .lang-btn {
      background: transparent; border: 1px solid var(--border-strong); color: var(--text-secondary);
      font-size: 12.5px; font-weight: 500; padding: 6px 11px; border-radius: 8px; cursor: pointer;
      transition: all 0.2s ease; font-family: 'Inter', sans-serif;
    }
    .lang-btn:hover { border-color: var(--gold); color: var(--text); }
    .brand {
      display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 15.5px;
      letter-spacing: -0.02em; color: var(--text); text-decoration: none;
    }
    .brand-logo {
      width: 26px; height: 26px; background: var(--gold); color: #0A0A0F; border-radius: 7px;
      display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px;
      font-family: 'Inter', sans-serif;
    }

    .main { position: relative; z-index: 1; max-width: 640px; margin: 0 auto; padding: 0 20px 140px; }

    /* Step progress */
    .progress-wrap { padding: 32px 0 8px; }
    .progress-track { height: 4px; background: var(--border); border-radius: 4px; overflow: hidden; margin-bottom: 12px; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, var(--gold), var(--gold-hover)); border-radius: 4px; transition: width 0.5s cubic-bezier(0.4,0,0.2,1); width: 25%; }
    .progress-label { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--text-tertiary); font-weight: 500; direction: ltr; }
    .progress-label .step-current { color: var(--gold); font-weight: 700; }

    /* Step header */
    .step-head { text-align: center; padding: 28px 0 32px; }
    .step-eyebrow { font-size: 12.5px; font-weight: 600; color: var(--gold); letter-spacing: 0.04em; margin-bottom: 10px; text-transform: uppercase; }
    .step-title { font-size: clamp(1.5rem, 4vw, 1.9rem); font-weight: 700; letter-spacing: -0.03em; margin-bottom: 10px; }
    .step-sub { font-size: 14.5px; color: var(--text-secondary); max-width: 420px; margin: 0 auto; line-height: 1.6; }

    /* Card container for each step */
    .step-panel { display: none; }
    .step-panel.active { display: block; animation: fadeSlide 0.4s cubic-bezier(0.4,0,0.2,1); }
    @keyframes fadeSlide { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

    /* Store type cards */
    .type-grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 8px; }
    .type-card {
      display: flex; align-items: center; gap: 16px; padding: 18px 20px; border-radius: 16px;
      border: 1.5px solid var(--border); background: var(--surface-solid); cursor: pointer;
      transition: all 0.22s cubic-bezier(0.4,0,0.2,1); text-align: start;
    }
    .type-card:hover { border-color: var(--gold-border); transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .type-card.selected { border-color: var(--gold); background: var(--gold-soft); box-shadow: 0 0 0 1px var(--gold); }
    .type-icon {
      width: 48px; height: 48px; border-radius: 13px; background: var(--gold-soft);
      display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0;
    }
    .type-card.selected .type-icon { background: var(--gold); }
    .type-info { flex: 1; }
    .type-name { font-size: 15.5px; font-weight: 700; margin-bottom: 3px; }
    .type-desc { font-size: 13px; color: var(--text-tertiary); line-height: 1.4; }
    .type-check {
      width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--border-strong);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s ease;
    }
    .type-card.selected .type-check { background: var(--gold); border-color: var(--gold); color: #0A0A0F; }

    /* Form fields */
    .field-group { margin-bottom: 18px; }
    .field-label { display: block; font-size: 13.5px; font-weight: 600; margin-bottom: 8px; color: var(--text); }
    .field-label .optional { font-weight: 400; color: var(--text-tertiary); font-size: 12.5px; }
    .field-input, .field-select, .field-textarea {
      width: 100%; padding: 13px 16px; border-radius: 12px; border: 1.5px solid var(--border);
      background: var(--surface-solid); color: var(--text); font-size: 14.5px;
      font-family: 'IBM Plex Sans Arabic', 'Inter', sans-serif; transition: all 0.2s ease; outline: none;
    }
    [dir="ltr"] .field-input, [dir="ltr"] .field-select, [dir="ltr"] .field-textarea { font-family: 'Inter', sans-serif; }
    .field-input:focus, .field-select:focus, .field-textarea:focus { border-color: var(--gold); box-shadow: 0 0 0 3px var(--gold-soft); }
    .field-input::placeholder, .field-textarea::placeholder { color: var(--text-tertiary); }
    .field-textarea { resize: vertical; min-height: 90px; line-height: 1.6; }
    .field-hint { font-size: 12px; color: var(--text-tertiary); margin-top: 6px; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 480px) { .field-row { grid-template-columns: 1fr; } }

    .phone-input-wrap { display: flex; gap: 8px; direction: ltr; }
    .phone-code {
      width: 90px; padding: 13px 10px; border-radius: 12px; border: 1.5px solid var(--border);
      background: var(--surface-solid); color: var(--text); font-size: 14px; font-family: 'Inter';
      text-align: center; font-weight: 600;
    }
    .phone-input-wrap .field-input { flex: 1; direction: ltr; text-align: left; }

    /* Quick-select tags for FAQ topics */
    .tag-grid { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 4px; }
    .tag-chip {
      padding: 9px 16px; border-radius: 100px; border: 1.5px solid var(--border);
      background: var(--surface-solid); font-size: 13px; font-weight: 500; cursor: pointer;
      transition: all 0.2s ease; color: var(--text-secondary);
    }
    .tag-chip:hover { border-color: var(--gold-border); }
    .tag-chip.selected { background: var(--gold); border-color: var(--gold); color: #0A0A0F; font-weight: 600; }

    /* Upload zone */
    .upload-zone {
      border: 1.5px dashed var(--border-strong); border-radius: 16px; padding: 28px 20px;
      text-align: center; cursor: pointer; transition: all 0.22s ease; background: var(--surface-solid);
      margin-bottom: 20px;
    }
    .upload-zone:hover { border-color: var(--gold); background: var(--gold-soft); }
    .upload-zone.has-file { border-color: var(--success); background: rgba(34,197,94,0.06); border-style: solid; }
    .upload-icon { font-size: 28px; margin-bottom: 10px; }
    .upload-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
    .upload-hint { font-size: 12.5px; color: var(--text-tertiary); }
    .upload-input { display: none; }

    .divider-or {
      display: flex; align-items: center; gap: 14px; margin: 22px 0; color: var(--text-tertiary);
      font-size: 12.5px; font-weight: 500;
    }
    .divider-or::before, .divider-or::after { content: ''; flex: 1; height: 1px; background: var(--border); }

    /* Review summary (step 4) */
    .review-card {
      background: var(--surface-solid); border: 1px solid var(--border); border-radius: 16px;
      padding: 20px; margin-bottom: 14px;
    }
    .review-row {
      display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0;
      border-bottom: 1px solid var(--border); gap: 12px;
    }
    .review-row:last-child { border-bottom: none; }
    .review-key { font-size: 13px; color: var(--text-tertiary); flex-shrink: 0; }
    .review-val { font-size: 13.5px; font-weight: 600; text-align: end; }
    .review-edit { font-size: 12px; color: var(--gold); cursor: pointer; font-weight: 600; }

    /* Agent activation checklist */
    .agent-check-list { display: flex; flex-direction: column; gap: 10px; margin-top: 18px; }
    .agent-check-item {
      display: flex; align-items: center; gap: 12px; padding: 13px 16px; border-radius: 12px;
      background: var(--surface-solid); border: 1px solid var(--border); opacity: 0.4;
      transition: all 0.4s cubic-bezier(0.4,0,0.2,1);
    }
    .agent-check-item.done { opacity: 1; border-color: var(--gold-border); background: var(--gold-soft); }
    .agent-check-icon {
      width: 30px; height: 30px; border-radius: 9px; background: var(--gold-soft);
      display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0;
    }
    .agent-check-item.done .agent-check-icon { background: var(--gold); }
    .agent-check-name { flex: 1; font-size: 13.5px; font-weight: 600; }
    .agent-check-status { font-size: 11.5px; color: var(--text-tertiary); font-weight: 500; }
    .agent-check-item.done .agent-check-status { color: var(--success); }
    .check-spinner {
      width: 16px; height: 16px; border: 2px solid var(--border-strong); border-top-color: var(--gold);
      border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Success state */
    .success-wrap { text-align: center; padding: 20px 0; }
    .success-ring {
      width: 84px; height: 84px; border-radius: 50%; background: var(--gold-soft);
      border: 2px solid var(--gold); display: flex; align-items: center; justify-content: center;
      font-size: 36px; margin: 0 auto 24px; animation: successPop 0.5s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes successPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .link-box {
      display: flex; align-items: center; gap: 10px; background: var(--surface-solid);
      border: 1.5px solid var(--gold-border); border-radius: 13px; padding: 13px 16px; margin: 24px 0;
      direction: ltr;
    }
    .link-text { flex: 1; font-size: 13px; font-family: 'Inter'; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .copy-btn {
      background: var(--gold); color: #0A0A0F; border: none; border-radius: 9px; padding: 8px 14px;
      font-size: 12.5px; font-weight: 700; cursor: pointer; flex-shrink: 0; transition: all 0.2s ease;
      font-family: 'Inter';
    }
    .copy-btn:hover { background: var(--gold-hover); }
    .copy-btn.copied { background: var(--success); color: #fff; }

    /* Nav buttons */
    .nav-actions { display: flex; gap: 10px; margin-top: 28px; }
    .btn-primary {
      background: var(--gold); color: #0A0A0F; font-weight: 600; font-size: 15px; padding: 14px 24px;
      border-radius: 12px; border: none; cursor: pointer; flex: 1; transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
      box-shadow: 0 4px 18px var(--gold-glow); display: flex; align-items: center; justify-content: center; gap: 8px;
      font-family: 'IBM Plex Sans Arabic', 'Inter', sans-serif;
    }
    .btn-primary:hover { background: var(--gold-hover); transform: translateY(-2px); box-shadow: 0 8px 28px var(--gold-glow); }
    .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }
    .btn-secondary {
      background: transparent; color: var(--text); font-weight: 500; font-size: 15px; padding: 14px 22px;
      border-radius: 12px; border: 1.5px solid var(--border-strong); cursor: pointer; transition: all 0.2s ease;
      font-family: 'IBM Plex Sans Arabic', 'Inter', sans-serif;
    }
    .btn-secondary:hover { border-color: var(--gold); background: var(--gold-soft); }
    .btn-full { width: 100%; }

    .trust-line {
      display: flex; align-items: center; justify-content: center; gap: 18px; margin-top: 20px;
      font-size: 12px; color: var(--text-tertiary); flex-wrap: wrap;
    }
    .trust-item { display: flex; align-items: center; gap: 5px; }

    button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible {
      outline: 2px solid var(--gold); outline-offset: 2px;
    }

    /* Confetti canvas */
    #confettiCanvas { position: fixed; inset: 0; pointer-events: none; z-index: 200; }
  `
    document.head.appendChild(styleEl)

    const script = document.createElement('script')
    script.id = 'trialpage-script'
    script.textContent = `
    /* ================= i18n ================= */
    const translations = {
      ar: {
        dir: "rtl", lang: "ar", langBtn: "EN", backArrow: "→",
        backLink: "الرئيسية", brand: "NeuraOps", nextBtn: "التالي", backBtn: "رجوع",
        nextBtnActivate: "التالي — تفعيل المساعد",
        stepName1: "نوع المتجر", stepName2: "بيانات المتجر", stepName3: "تدريب المساعد", stepName4: "التفعيل",
        s1Eyebrow: "الخطوة 1 من 4", s1Title: "اختر نوع متجرك", s1Sub: "نصمم مساعدك الذكي خصيصاً لطبيعة نشاطك التجاري",
        type1Name: "مقهى / كافيه", type1Desc: "للمقاهي والكافيهات والمشروبات",
        type2Name: "مطعم", type2Desc: "للمطاعم والوجبات والمأكولات",
        type3Name: "متجر تجاري", type3Desc: "للمتاجر والمنتجات والأزياء",
        type4Name: "نشاط آخر", type4Desc: "خدمات، حجوزات، أو نشاط مخصص",
        s2Eyebrow: "الخطوة 2 من 4", s2Title: "بيانات متجرك", s2Sub: "حتى يتعرّف المساعد الذكي على هويتك ويتحدث باسمك",
        fStoreName: "اسم المتجر / المطعم", fStoreNamePh: "مثال: قهوة الأصالة",
        fPhone: "رقم الجوال (واتساب)",
        fCity: "المدينة", fCityChoose: "اختر مدينتك",
        cBuraidah: "بريدة", cUnaizah: "عنيزة", cRiyadh: "الرياض", cJeddah: "جدة", cDammam: "الدمام", cDubai: "دبي", cOther: "أخرى",
        fChannel: "قناة التواصل الرئيسية", fChannelChoose: "اختر القناة",
        chWhats: "واتساب", chInsta: "إنستغرام", chBoth: "الاثنان معاً", chWeb: "موقع إلكتروني",
        s3Eyebrow: "الخطوة 3 من 4", s3Title: "درِّب مساعدك الذكي", s3Sub: "أخبره بأكثر ما يسألك عنه عملاؤك يومياً",
        uploadTitle: "ارفع قائمة منتجاتك أو ملف الأسئلة الشائعة", uploadHint: "PDF أو Word أو صورة — اختياري",
        orDivider: "أو أكمل بالإجابة أدناه",
        fTopics: "أكثر الأسئلة التي تستقبلها", optional: "(اختياري)",
        tag1: "أسعار المنتجات", tag2: "أوقات الدوام", tag3: "التوصيل والشحن", tag4: "سياسة الإرجاع",
        tag5: "توفر المنتجات", tag6: "طرق الدفع", tag7: "موقع الفرع", tag8: "العروض والخصومات",
        fHours: "أوقات الدوام", fHoursPh: "مثال: من 8 صباحاً حتى 11 مساءً يومياً",
        s4Eyebrow: "الخطوة 4 من 4", s4Title: "جارٍ تفعيل نظامك", s4Sub: "هذا يأخذ لحظات فقط — لا تغلق الصفحة",
        check1: "بناء قاعدة المعرفة", check2: "تفعيل الوكلاء الذكيين", check3: "ربط قناة التواصل", check4: "اختبار جودة الردود",
        successTitle: "تم التفعيل بنجاح 🎉", successSub: "مساعدك الذكي جاهز للعمل. جرّبه الآن أو شاركه مع فريقك.",
        revStore: "المتجر", revAgents: "الوكلاء المفعّلون", revAgentsVal: "6 وكلاء ذكاء اصطناعي",
        revPlan: "الخطة", revPlanVal: "Pilot — مجاني 30 يوم",
        copyBtn: "نسخ", copiedBtn: "تم النسخ ✓",
        tryDemoBtn: "🚀 جرّب كعميل الآن", shareBtn: "↗ شارك مع فريقك",
        trust1: "بياناتك آمنة", trust2: "بدون بطاقة ائتمان",
        uploadedFile: "تم رفع الملف بنجاح ✓"
      },
      en: {
        dir: "ltr", lang: "en", langBtn: "عربي", backArrow: "←",
        backLink: "Home", brand: "NeuraOps", nextBtn: "Next", backBtn: "Back",
        nextBtnActivate: "Next — Activate Assistant",
        stepName1: "Store Type", stepName2: "Store Details", stepName3: "Train Assistant", stepName4: "Activation",
        s1Eyebrow: "Step 1 of 4", s1Title: "Choose your store type", s1Sub: "We tailor your AI assistant to your specific business",
        type1Name: "Cafe / Coffee Shop", type1Desc: "For cafes, coffee shops & beverages",
        type2Name: "Restaurant", type2Desc: "For restaurants, meals & food service",
        type3Name: "Retail Store", type3Desc: "For shops, products & fashion",
        type4Name: "Other Business", type4Desc: "Services, bookings, or custom needs",
        s2Eyebrow: "Step 2 of 4", s2Title: "Your store details", s2Sub: "So your AI assistant knows your identity and speaks in your name",
        fStoreName: "Store / Restaurant Name", fStoreNamePh: "e.g. The Original Coffee",
        fPhone: "Phone Number (WhatsApp)",
        fCity: "City", fCityChoose: "Select your city",
        cBuraidah: "Buraidah", cUnaizah: "Unaizah", cRiyadh: "Riyadh", cJeddah: "Jeddah", cDammam: "Dammam", cDubai: "Dubai", cOther: "Other",
        fChannel: "Primary Contact Channel", fChannelChoose: "Select channel",
        chWhats: "WhatsApp", chInsta: "Instagram", chBoth: "Both", chWeb: "Website",
        s3Eyebrow: "Step 3 of 4", s3Title: "Train your assistant", s3Sub: "Tell it what your customers ask most often",
        uploadTitle: "Upload your product list or FAQ file", uploadHint: "PDF, Word, or image — optional",
        orDivider: "Or fill in below",
        fTopics: "Most common questions you receive", optional: "(optional)",
        tag1: "Product Pricing", tag2: "Business Hours", tag3: "Shipping & Delivery", tag4: "Return Policy",
        tag5: "Stock Availability", tag6: "Payment Methods", tag7: "Store Location", tag8: "Offers & Discounts",
        fHours: "Business Hours", fHoursPh: "e.g. 8am to 11pm daily",
        s4Eyebrow: "Step 4 of 4", s4Title: "Activating your system", s4Sub: "This takes just a moment — don't close this page",
        check1: "Building knowledge base", check2: "Activating AI agents", check3: "Connecting channel", check4: "Testing response quality",
        successTitle: "Activated Successfully 🎉", successSub: "Your AI assistant is ready. Try it now or share with your team.",
        revStore: "Store", revAgents: "Active Agents", revAgentsVal: "6 AI Agents",
        revPlan: "Plan", revPlanVal: "Pilot — Free for 30 days",
        copyBtn: "Copy", copiedBtn: "Copied ✓",
        tryDemoBtn: "🚀 Try it as a customer", shareBtn: "↗ Share with your team",
        trust1: "Your data is secure", trust2: "No credit card required",
        uploadedFile: "File uploaded successfully ✓"
      }
    };

    let currentLang = localStorage.getItem("neuraops-lang") || "ar";

    function applyTranslations(lang) {
      const t = translations[lang];
      document.documentElement.setAttribute("dir", t.dir);
      document.documentElement.setAttribute("lang", t.lang);
      document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (t[key]) el.textContent = t[key];
      });
      document.querySelectorAll("[data-i18n-ph]").forEach(el => {
        const key = el.getAttribute("data-i18n-ph");
        if (t[key]) el.placeholder = t[key];
      });
      document.getElementById("langToggle").textContent = t.langBtn;
      document.getElementById("backArrow").textContent = t.backArrow;
      localStorage.setItem("neuraops-lang", lang);
    }

    document.getElementById("langToggle").addEventListener("click", () => {
      currentLang = currentLang === "ar" ? "en" : "ar";
      applyTranslations(currentLang);
      updateStepLabel();
    });

    // Theme
    const savedTheme = localStorage.getItem("neuraops-theme");
    if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);
    document.getElementById("themeToggle").addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("neuraops-theme", next);
    });

    applyTranslations(currentLang);

    /* ================= Wizard State ================= */
    let currentStep = 1;
    const totalSteps = 4;
    const formData = { type: null, storeName: "", phoneCode: "+966", phone: "", city: "", channel: "", topics: [], hours: "", fileUploaded: false };

    function updateStepLabel() {
      const t = translations[currentLang];
      document.getElementById("stepCurrentNum").textContent = currentStep;
      document.getElementById("stepCurrentName").textContent = t["stepName" + currentStep];
      document.getElementById("progressFill").style.width = (currentStep / totalSteps * 100) + "%";
    }

    function goToStep(n) {
      document.querySelectorAll(".step-panel").forEach(p => p.classList.remove("active"));
      document.querySelector(\`.step-panel[data-step="\${n}"]\`).classList.add("active");
      currentStep = n;
      updateStepLabel();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    // STEP 1: type selection
    document.querySelectorAll(".type-card").forEach(card => {
      card.addEventListener("click", () => {
        document.querySelectorAll(".type-card").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        formData.type = card.dataset.type;
        document.getElementById("s1Next").disabled = false;
      });
    });
    document.getElementById("s1Next").addEventListener("click", () => goToStep(2));

    // STEP 2: store info
    function validateStep2() {
      const name = document.getElementById("fStoreName").value.trim();
      const phone = document.getElementById("fPhone").value.trim();
      document.getElementById("s2Next").disabled = !(name.length > 1 && phone.length >= 8);
    }
    document.getElementById("fStoreName").addEventListener("input", validateStep2);
    document.getElementById("fPhone").addEventListener("input", validateStep2);
    document.getElementById("s2Back").addEventListener("click", () => goToStep(1));
    document.getElementById("s2Next").addEventListener("click", () => {
      formData.storeName = document.getElementById("fStoreName").value.trim();
      formData.phoneCode = document.getElementById("fPhoneCode").value;
      formData.phone = document.getElementById("fPhone").value.trim();
      formData.city = document.getElementById("fCity").value;
      formData.channel = document.getElementById("fChannel").value;
      goToStep(3);
    });

    // STEP 3: knowledge training
    document.querySelectorAll(".tag-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        chip.classList.toggle("selected");
        const tag = chip.dataset.tag;
        if (formData.topics.includes(tag)) {
          formData.topics = formData.topics.filter(t => t !== tag);
        } else {
          formData.topics.push(tag);
        }
      });
    });

    const uploadZone = document.getElementById("uploadZone");
    const uploadInput = document.getElementById("uploadInput");
    uploadZone.addEventListener("click", () => uploadInput.click());
    uploadInput.addEventListener("change", () => {
      if (uploadInput.files.length > 0) {
        formData.fileUploaded = true;
        uploadZone.classList.add("has-file");
        document.getElementById("uploadTitle").textContent = translations[currentLang].uploadedFile;
      }
    });

    document.getElementById("s3Back").addEventListener("click", () => goToStep(2));
    document.getElementById("s3Next").addEventListener("click", () => {
      formData.hours = document.getElementById("fHours").value.trim();
      goToStep(4);
      runActivation();
    });

    /* ================= STEP 4: Activation sequence ================= */
    function runActivation() {
      document.getElementById("activationLoading").style.display = "block";
      document.getElementById("activationSuccess").style.display = "none";

      const items = document.querySelectorAll(".agent-check-item");
      let i = 0;
      function markNext() {
        if (i >= items.length) {
          setTimeout(showSuccess, 500);
          return;
        }
        const item = items[i];
        const spinner = item.querySelector(".check-spinner");
        setTimeout(() => {
          item.classList.add("done");
          spinner.outerHTML = '<span style="color:var(--success);font-weight:700;font-size:15px;">✓</span><span class="agent-check-status" style="margin-inline-start:auto;">' + '</span>';
          i++;
          markNext();
        }, 700 + Math.random() * 500);
      }
      markNext();
    }

    function showSuccess() {
      document.getElementById("activationLoading").style.display = "none";
      document.getElementById("activationSuccess").style.display = "block";
      document.getElementById("revStoreVal").textContent = formData.storeName || "—";
      const slug = (formData.storeName || "your-store").toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "");
      const demoUrl = \`neuraops.app/demo/\${slug || "demo"}\`;
      document.getElementById("demoLinkText").textContent = demoUrl;
      launchConfetti();
    }

    document.getElementById("copyBtn").addEventListener("click", () => {
      const url = document.getElementById("demoLinkText").textContent;
      navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById("copyBtn");
        btn.textContent = translations[currentLang].copiedBtn;
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = translations[currentLang].copyBtn;
          btn.classList.remove("copied");
        }, 2000);
      });
    });

    document.getElementById("tryDemoBtn").addEventListener("click", () => {
      alert(currentLang === "ar" ? "سيتم توجيهك لتجربة الديمو التفاعلي." : "You'll be redirected to the interactive demo.");
    });

    document.getElementById("shareBtn").addEventListener("click", () => {
      const url = document.getElementById("demoLinkText").textContent;
      if (navigator.share) {
        navigator.share({ title: "NeuraOps", text: formData.storeName, url: "https://" + url });
      } else {
        navigator.clipboard.writeText(url);
      }
    });

    updateStepLabel();

    /* ================= Confetti ================= */
    function launchConfetti() {
      const canvas = document.getElementById("confettiCanvas");
      const ctx = canvas.getContext("2d");
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const colors = ["#C9A961", "#B8944F", "#F4E4C1", "#22C55E", "#0A0A0F"];
      const particles = Array.from({ length: 70 }, () => ({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 100,
        r: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        vy: 2 + Math.random() * 3,
        vx: -1.5 + Math.random() * 3,
        rot: Math.random() * 360,
        vrot: -6 + Math.random() * 12
      }));
      let frame = 0;
      const maxFrames = 150;
      function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
          p.x += p.vx; p.y += p.vy; p.rot += p.vrot;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot * Math.PI / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
          ctx.restore();
        });
        frame++;
        if (frame < maxFrames) requestAnimationFrame(draw);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      draw();
    }
  `
    document.body.appendChild(script)

    return () => {
      styleEl.remove()
      fontLink.remove()
      const oldScript = document.getElementById('trialpage-script')
      if (oldScript) oldScript.remove()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: `
  <div class="bg-mesh"></div>
  <canvas id="confettiCanvas"></canvas>

  <!-- Header -->
  <header class="header">
    <div class="header-left">
      <a href="/" class="back-link">
        <span id="backArrow">→</span>
        <span data-i18n="backLink">الرئيسية</span>
      </a>
      <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme"></button>
    </div>
    <div class="header-right">
      <button class="lang-btn" id="langToggle">EN</button>
      <a href="/" class="brand">
        <span data-i18n="brand">NeuraOps</span>
        <div class="brand-logo">N</div>
      </a>
    </div>
  </header>

  <main class="main">
    <!-- Progress -->
    <div class="progress-wrap">
      <div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>
      <div class="progress-label">
        <span><span class="step-current" id="stepCurrentNum">1</span> / 4</span>
        <span id="stepCurrentName" data-i18n="stepName1">نوع المتجر</span>
      </div>
    </div>

    <!-- STEP 1: Store type -->
    <section class="step-panel active" data-step="1">
      <div class="step-head">
        <div class="step-eyebrow" data-i18n="s1Eyebrow">الخطوة 1 من 4</div>
        <h1 class="step-title" data-i18n="s1Title">اختر نوع متجرك</h1>
        <p class="step-sub" data-i18n="s1Sub">نصمم مساعدك الذكي خصيصاً لطبيعة نشاطك التجاري</p>
      </div>

      <div class="type-grid" id="typeGrid">
        <div class="type-card" data-type="cafe">
          <div class="type-icon">☕</div>
          <div class="type-info">
            <div class="type-name" data-i18n="type1Name">مقهى / كافيه</div>
            <div class="type-desc" data-i18n="type1Desc">للمقاهي والكافيهات والمشروبات</div>
          </div>
          <div class="type-check">✓</div>
        </div>
        <div class="type-card" data-type="restaurant">
          <div class="type-icon">🍽️</div>
          <div class="type-info">
            <div class="type-name" data-i18n="type2Name">مطعم</div>
            <div class="type-desc" data-i18n="type2Desc">للمطاعم والوجبات والمأكولات</div>
          </div>
          <div class="type-check">✓</div>
        </div>
        <div class="type-card" data-type="retail">
          <div class="type-icon">🛍️</div>
          <div class="type-info">
            <div class="type-name" data-i18n="type3Name">متجر تجاري</div>
            <div class="type-desc" data-i18n="type3Desc">للمتاجر والمنتجات والأزياء</div>
          </div>
          <div class="type-check">✓</div>
        </div>
        <div class="type-card" data-type="other">
          <div class="type-icon">⚙️</div>
          <div class="type-info">
            <div class="type-name" data-i18n="type4Name">نشاط آخر</div>
            <div class="type-desc" data-i18n="type4Desc">خدمات، حجوزات، أو نشاط مخصص</div>
          </div>
          <div class="type-check">✓</div>
        </div>
      </div>

      <div class="nav-actions">
        <button class="btn-primary btn-full" id="s1Next" disabled data-i18n="nextBtn">التالي</button>
      </div>
    </section>

    <!-- STEP 2: Store info -->
    <section class="step-panel" data-step="2">
      <div class="step-head">
        <div class="step-eyebrow" data-i18n="s2Eyebrow">الخطوة 2 من 4</div>
        <h1 class="step-title" data-i18n="s2Title">بيانات متجرك</h1>
        <p class="step-sub" data-i18n="s2Sub">حتى يتعرّف المساعد الذكي على هويتك ويتحدث باسمك</p>
      </div>

      <div class="field-group">
        <label class="field-label" data-i18n="fStoreName">اسم المتجر / المطعم</label>
        <input type="text" class="field-input" id="fStoreName" data-i18n-ph="fStoreNamePh" placeholder="مثال: قهوة الأصالة" />
      </div>

      <div class="field-group">
        <label class="field-label" data-i18n="fPhone">رقم الجوال (واتساب)</label>
        <div class="phone-input-wrap">
          <select class="phone-code" id="fPhoneCode">
            <option value="+966">🇸🇦 +966</option>
            <option value="+971">🇦🇪 +971</option>
            <option value="+965">🇰🇼 +965</option>
            <option value="+973">🇧🇭 +973</option>
            <option value="+974">🇶🇦 +974</option>
            <option value="+968">🇴🇲 +968</option>
            <option value="+20">🇪🇬 +20</option>
            <option value="+1">🇺🇸 +1</option>
          </select>
          <input type="tel" class="field-input" id="fPhone" placeholder="5X XXX XXXX" />
        </div>
      </div>

      <div class="field-row">
        <div class="field-group">
          <label class="field-label" data-i18n="fCity">المدينة</label>
          <select class="field-select" id="fCity">
            <option value="" data-i18n="fCityChoose">اختر مدينتك</option>
            <option data-i18n="cBuraidah">بريدة</option>
            <option data-i18n="cUnaizah">عنيزة</option>
            <option data-i18n="cRiyadh">الرياض</option>
            <option data-i18n="cJeddah">جدة</option>
            <option data-i18n="cDammam">الدمام</option>
            <option data-i18n="cDubai">دبي</option>
            <option data-i18n="cOther">أخرى</option>
          </select>
        </div>
        <div class="field-group">
          <label class="field-label" data-i18n="fChannel">قناة التواصل الرئيسية</label>
          <select class="field-select" id="fChannel">
            <option value="" data-i18n="fChannelChoose">اختر القناة</option>
            <option data-i18n="chWhats">واتساب</option>
            <option data-i18n="chInsta">إنستغرام</option>
            <option data-i18n="chBoth">الاثنان معاً</option>
            <option data-i18n="chWeb">موقع إلكتروني</option>
          </select>
        </div>
      </div>

      <div class="nav-actions">
        <button class="btn-secondary" id="s2Back" data-i18n="backBtn">رجوع</button>
        <button class="btn-primary" id="s2Next" disabled data-i18n="nextBtn">التالي</button>
      </div>
    </section>

    <!-- STEP 3: Knowledge training -->
    <section class="step-panel" data-step="3">
      <div class="step-head">
        <div class="step-eyebrow" data-i18n="s3Eyebrow">الخطوة 3 من 4</div>
        <h1 class="step-title" data-i18n="s3Title">درِّب مساعدك الذكي</h1>
        <p class="step-sub" data-i18n="s3Sub">أخبره بأكثر ما يسألك عنه عملاؤك يومياً</p>
      </div>

      <div class="upload-zone" id="uploadZone">
        <div class="upload-icon">📄</div>
        <div class="upload-title" id="uploadTitle" data-i18n="uploadTitle">ارفع قائمة منتجاتك أو ملف الأسئلة الشائعة</div>
        <div class="upload-hint" data-i18n="uploadHint">PDF أو Word أو صورة — اختياري</div>
        <input type="file" class="upload-input" id="uploadInput" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
      </div>

      <div class="divider-or"><span data-i18n="orDivider">أو أكمل بالإجابة أدناه</span></div>

      <div class="field-group">
        <label class="field-label" data-i18n="fTopics">أكثر الأسئلة التي تستقبلها <span class="optional" data-i18n="optional">(اختياري)</span></label>
        <div class="tag-grid" id="tagGrid">
          <div class="tag-chip" data-tag="prices" data-i18n="tag1">أسعار المنتجات</div>
          <div class="tag-chip" data-tag="hours" data-i18n="tag2">أوقات الدوام</div>
          <div class="tag-chip" data-tag="shipping" data-i18n="tag3">التوصيل والشحن</div>
          <div class="tag-chip" data-tag="returns" data-i18n="tag4">سياسة الإرجاع</div>
          <div class="tag-chip" data-tag="stock" data-i18n="tag5">توفر المنتجات</div>
          <div class="tag-chip" data-tag="payment" data-i18n="tag6">طرق الدفع</div>
          <div class="tag-chip" data-tag="location" data-i18n="tag7">موقع الفرع</div>
          <div class="tag-chip" data-tag="offers" data-i18n="tag8">العروض والخصومات</div>
        </div>
      </div>

      <div class="field-group">
        <label class="field-label" data-i18n="fHours">أوقات الدوام <span class="optional" data-i18n="optional">(اختياري)</span></label>
        <input type="text" class="field-input" id="fHours" data-i18n-ph="fHoursPh" placeholder="مثال: من 8 صباحاً حتى 11 مساءً يومياً" />
      </div>

      <div class="nav-actions">
        <button class="btn-secondary" id="s3Back" data-i18n="backBtn">رجوع</button>
        <button class="btn-primary" id="s3Next" data-i18n="nextBtnActivate">التالي — تفعيل المساعد</button>
      </div>
    </section>

    <!-- STEP 4: Activation -->
    <section class="step-panel" data-step="4">
      <div id="activationLoading">
        <div class="step-head">
          <div class="step-eyebrow" data-i18n="s4Eyebrow">الخطوة 4 من 4</div>
          <h1 class="step-title" data-i18n="s4Title">جارٍ تفعيل نظامك</h1>
          <p class="step-sub" data-i18n="s4Sub">هذا يأخذ لحظات فقط — لا تغلق الصفحة</p>
        </div>

        <div class="agent-check-list" id="agentCheckList">
          <div class="agent-check-item" data-agent="kb">
            <div class="agent-check-icon">⚙️</div>
            <div class="agent-check-name" data-i18n="check1">بناء قاعدة المعرفة</div>
            <div class="check-spinner"></div>
          </div>
          <div class="agent-check-item" data-agent="agents">
            <div class="agent-check-icon">🤖</div>
            <div class="agent-check-name" data-i18n="check2">تفعيل الوكلاء الذكيين</div>
            <div class="check-spinner"></div>
          </div>
          <div class="agent-check-item" data-agent="channel">
            <div class="agent-check-icon">🔗</div>
            <div class="agent-check-name" data-i18n="check3">ربط قناة التواصل</div>
            <div class="check-spinner"></div>
          </div>
          <div class="agent-check-item" data-agent="test">
            <div class="agent-check-icon">🧪</div>
            <div class="agent-check-name" data-i18n="check4">اختبار جودة الردود</div>
            <div class="check-spinner"></div>
          </div>
        </div>
      </div>

      <div id="activationSuccess" style="display:none;">
        <div class="success-wrap">
          <div class="success-ring">✓</div>
          <h1 class="step-title" data-i18n="successTitle">تم التفعيل بنجاح 🎉</h1>
          <p class="step-sub" data-i18n="successSub">مساعدك الذكي جاهز للعمل. جرّبه الآن أو شاركه مع فريقك.</p>
        </div>

        <div class="review-card">
          <div class="review-row">
            <span class="review-key" data-i18n="revStore">المتجر</span>
            <span class="review-val" id="revStoreVal">—</span>
          </div>
          <div class="review-row">
            <span class="review-key" data-i18n="revAgents">الوكلاء المفعّلون</span>
            <span class="review-val" data-i18n="revAgentsVal">6 وكلاء ذكاء اصطناعي</span>
          </div>
          <div class="review-row">
            <span class="review-key" data-i18n="revPlan">الخطة</span>
            <span class="review-val" data-i18n="revPlanVal">Pilot — مجاني 30 يوم</span>
          </div>
        </div>

        <div class="link-box">
          <span class="link-text" id="demoLinkText">neuraops.app/demo/your-store</span>
          <button class="copy-btn" id="copyBtn" data-i18n="copyBtn">نسخ</button>
        </div>

        <div class="nav-actions">
          <button class="btn-primary btn-full" id="tryDemoBtn" data-i18n="tryDemoBtn">🚀 جرّب كعميل الآن</button>
        </div>
        <div class="nav-actions">
          <button class="btn-secondary btn-full" id="shareBtn" data-i18n="shareBtn">↗ شارك مع فريقك</button>
        </div>

        <div class="trust-line">
          <span class="trust-item">🔒 <span data-i18n="trust1">بياناتك آمنة</span></span>
          <span class="trust-item">✅ <span data-i18n="trust2">بدون بطاقة ائتمان</span></span>
        </div>
      </div>
    </section>
  </main>

  
` }}
    />
  )
}
