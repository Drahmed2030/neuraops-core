import type { Lang } from '@/types/ui'

export const translations = {
  ar: {
    dir: 'rtl' as const,
    lang: 'ar' as const,
    langBtn: 'EN',
    brand: 'NeuraOps',
    pilotBadge: 'PILOT MVP',

    // Nav
    navHome: 'الرئيسية',
    navAgents: 'الوكلاء',
    navPricing: 'الأسعار',
    navAbout: 'حول',
    navDashboard: 'الرئيسية',
    navChat: 'المحادثة',
    navEscalations: 'التصعيدات',
    navSettings: 'الإعدادات',
    startNow: 'ابدأ الآن',

    // Hero
    heroEyebrow: 'نظام تشغيل ذكي · جيل 2026',
    heroTitleLine1: 'دعمك الآلي',
    heroTitleLine2: 'يعمل',
    heroTitleAccent: 'بذكاء،',
    heroTitleLine3: 'على مدار الساعة',
    heroSub: 'NeuraOps يربط متجرك بستة وكلاء ذكاء اصطناعي متخصصين، يردون على عملائك فوراً، بدقة، وبأسلوبك الخاص — دون تدخل بشري.',
    ctaPrimary: 'ابدأ تجربتك المجانية',
    ctaSecondary: 'شاهد العرض التوضيحي',
    tickerConvos: 'محادثة',
    tickerConvosLabel: 'اليوم عبر المنصة',
    tickerRate: '%',
    tickerRateLabel: 'نسبة الحل الآلي',
    tickerSpeed: 'ث',
    tickerSpeedLabel: 'متوسط وقت الرد',

    // Trust
    trustLabel: 'موثوق من متاجر ومطاعم رائدة',

    // Agents section
    agentsEyebrow: 'النظام الأساسي',
    agentsTitle: 'ستة وكلاء ذكاء اصطناعي، يعملون كفريق واحد',
    agentsSub: 'كل وكيل مُدرَّب على مهمة محددة بدقة — يفهم السياق، يسترجع المعرفة، ويقرر متى يحتاج تدخلاً بشرياً.',
    agent1Name: 'Order Tracker', agent1Desc: 'يتابع حالة الطلبات ووقت التوصيل، ويحدّث العميل تلقائياً بأي تغيير.',
    agent2Name: 'Returns & Refunds', agent2Desc: 'يشرح سياسات الإرجاع والاستبدال بدقة، ويبدأ الإجراء مباشرة عند الحاجة.',
    agent3Name: 'Product Expert', agent3Desc: 'يجيب عن المقاسات والمواصفات والتوفر بمعرفة عميقة بكتالوج منتجاتك.',
    agent4Name: 'Menu & Offers', agent4Desc: 'يعرض المنيو والأسعار والعروض الحالية بأسلوب طبيعي ومحدّث لحظياً.',
    agent5Name: 'Store Info', agent5Desc: 'يوفّر أوقات الدوام والعنوان وطرق الدفع في أي وقت يسأل فيه العميل.',
    agent6Name: 'General Router', agent6Desc: 'يحلل نية كل رسالة ويوجهها للوكيل الأنسب، فوراً ودون احتكاك.',

    // Stats band
    statResolve: 'نسبة الحل الآلي الكامل',
    statSpeed: 'متوسط وقت أول رد',
    statCsat: 'رضا العملاء المُقاس',
    statUptime: 'تغطية دون توقف',

    // Pricing
    pricingEyebrow: 'الأسعار',
    pricingTitle: 'خطة تناسب حجم عملك',
    pricingSub: 'ابدأ مجاناً، وارتقِ عندما تحتاج قدرة أكبر — بدون عقود طويلة الأمد.',
    planPilotName: 'Pilot', planPilotDesc: 'للتجربة الأولى قبل الاشتراك', planPilotPrice: 'مجاني', planPilotPeriod: '/ 30 يوم',
    planStarterName: 'Starter', planStarterDesc: 'للمقاهي والمتاجر الصغيرة', planStarterPrice: '349', planStarterPeriod: 'ر.س / شهرياً',
    planProName: 'Pro', planProDesc: 'للمطاعم والمتاجر الأكبر', planProPrice: '699', planProPeriod: 'ر.س / شهرياً',
    planBadge: 'الأكثر طلباً',
    planCta: 'اشترك الآن', planCtaFree: 'ابدأ التجربة',

    // Footer
    footerTagline: 'دعم ذكي للأعمال الحديثة.',
    footerRights: '© 2026 NeuraOps. جميع الحقوق محفوظة.',

    // Trial wizard
    backLink: 'الرئيسية',
    stepName1: 'نوع المتجر', stepName2: 'بيانات المتجر', stepName3: 'تدريب المساعد', stepName4: 'التفعيل',
    s1Eyebrow: 'الخطوة 1 من 4', s1Title: 'اختر نوع متجرك', s1Sub: 'نصمم مساعدك الذكي خصيصاً لطبيعة نشاطك التجاري',
    type1Name: 'مقهى / كافيه', type1Desc: 'للمقاهي والكافيهات والمشروبات',
    type2Name: 'مطعم', type2Desc: 'للمطاعم والوجبات والمأكولات',
    type3Name: 'متجر تجاري', type3Desc: 'للمتاجر والمنتجات والأزياء',
    type4Name: 'نشاط آخر', type4Desc: 'خدمات، حجوزات، أو نشاط مخصص',
    nextBtn: 'التالي', backBtn: 'رجوع', nextBtnActivate: 'التالي — تفعيل المساعد',

    s2Eyebrow: 'الخطوة 2 من 4', s2Title: 'بيانات متجرك', s2Sub: 'حتى يتعرّف المساعد الذكي على هويتك ويتحدث باسمك',
    fStoreName: 'اسم المتجر / المطعم', fStoreNamePh: 'مثال: قهوة الأصالة',
    fPhone: 'رقم الجوال (واتساب)',
    fCity: 'المدينة', fCityChoose: 'اختر مدينتك',
    cBuraidah: 'بريدة', cUnaizah: 'عنيزة', cRiyadh: 'الرياض', cJeddah: 'جدة', cDammam: 'الدمام', cDubai: 'دبي', cOther: 'أخرى',
    fChannel: 'قناة التواصل الرئيسية', fChannelChoose: 'اختر القناة',
    chWhats: 'واتساب', chInsta: 'إنستغرام', chBoth: 'الاثنان معاً', chWeb: 'موقع إلكتروني',

    s3Eyebrow: 'الخطوة 3 من 4', s3Title: 'درِّب مساعدك الذكي', s3Sub: 'أخبره بأكثر ما يسألك عنه عملاؤك يومياً',
    uploadTitle: 'ارفع قائمة منتجاتك أو ملف الأسئلة الشائعة', uploadHint: 'PDF أو Word أو صورة — اختياري',
    uploadedFile: 'تم رفع الملف بنجاح ✓',
    orDivider: 'أو أكمل بالإجابة أدناه',
    fTopics: 'أكثر الأسئلة التي تستقبلها', optional: '(اختياري)',
    tag1: 'أسعار المنتجات', tag2: 'أوقات الدوام', tag3: 'التوصيل والشحن', tag4: 'سياسة الإرجاع',
    tag5: 'توفر المنتجات', tag6: 'طرق الدفع', tag7: 'موقع الفرع', tag8: 'العروض والخصومات',
    fHours: 'أوقات الدوام', fHoursPh: 'مثال: من 8 صباحاً حتى 11 مساءً يومياً',

    s4Eyebrow: 'الخطوة 4 من 4', s4Title: 'جارٍ تفعيل نظامك', s4Sub: 'هذا يأخذ لحظات فقط — لا تغلق الصفحة',
    check1: 'بناء قاعدة المعرفة', check2: 'تفعيل الوكلاء الذكيين', check3: 'ربط قناة التواصل', check4: 'اختبار جودة الردود',
    successTitle: 'تم التفعيل بنجاح 🎉', successSub: 'مساعدك الذكي جاهز للعمل. جرّبه الآن أو شاركه مع فريقك.',
    revStore: 'المتجر', revAgents: 'الوكلاء المفعّلون', revAgentsVal: '6 وكلاء ذكاء اصطناعي',
    revPlan: 'الخطة', revPlanVal: 'Pilot — مجاني 30 يوم',
    copyBtn: 'نسخ', copiedBtn: 'تم النسخ ✓',
    tryDemoBtn: '🚀 جرّب كعميل الآن', shareBtn: '↗ شارك مع فريقك',
    trust1: 'بياناتك آمنة', trust2: 'بدون بطاقة ائتمان',

    // Dashboard
    dashTitle: 'لوحة مؤشرات الـ Pilot', dashSub: 'نظرة عامة على أداء المساعد الذكي',
    statConvos: 'محادثات اليوم', statRate: 'نسبة الحل الآلي', statResponse: 'متوسط وقت الرد', statSatisfaction: 'رضا العملاء',
    trendUp: 'عن الأسبوع الماضي',
    agentPerf: 'أداء الوكلاء',
    healthCheck: 'فحص الاتصال بـ Supabase', checkNow: 'فحص الآن', checking: 'جارٍ الفحص...',
    connected: 'متصل', storesCount: 'متجر', notConnected: 'تعذر الاتصال',
    chatLive: 'تجربة حية — مساعد NeuraOps الذكي', chatPlaceholder: 'اكتب سؤالك هنا...',
    aiName: 'NeuraOps AI', thinking: 'يفكر...', welcomeMsg: '👋 مرحباً! أنا مساعدك الذكي. كيف يمكنني مساعدتك؟',
    quickOrder: 'وين طلبي؟', quickReturn: 'سياسة الإرجاع', quickHours: 'أوقات الدوام', quickPayment: 'طرق الدفع',
    escalationsTitle: 'التصعيدات المعلقة', escalationsEmpty: 'ستظهر التصعيدات هنا بعد بدء المحادثات الحقيقية.',
    settingsTitle: 'الإعدادات', settingsEmpty: 'قريباً — إعدادات SLA، أوقات العمل، والرسائل التلقائية.',
    routerAgent: 'Router', orderTrackerAgent: 'Order Tracker', returnsAgent: 'Returns',
  },
  en: {
    dir: 'ltr' as const,
    lang: 'en' as const,
    langBtn: 'عربي',
    brand: 'NeuraOps',
    pilotBadge: 'PILOT MVP',

    navHome: 'Home', navAgents: 'Agents', navPricing: 'Pricing', navAbout: 'About',
    navDashboard: 'Dashboard', navChat: 'Chat', navEscalations: 'Escalations', navSettings: 'Settings',
    startNow: 'Get Started',

    heroEyebrow: 'Intelligent Operating System · 2026 Gen',
    heroTitleLine1: 'Your automated support', heroTitleLine2: 'works', heroTitleAccent: 'smart,', heroTitleLine3: 'around the clock',
    heroSub: 'NeuraOps connects your store to six specialized AI agents that respond to customers instantly, accurately, and in your own voice — no human intervention required.',
    ctaPrimary: 'Start Your Free Trial', ctaSecondary: 'Watch the Demo',
    tickerConvos: '', tickerConvosLabel: 'Conversations Today',
    tickerRate: '%', tickerRateLabel: 'Auto-Resolution Rate',
    tickerSpeed: 's', tickerSpeedLabel: 'Avg Response Time',

    trustLabel: 'Trusted by leading stores and restaurants',

    agentsEyebrow: 'The Core System',
    agentsTitle: 'Six AI agents, working as one team',
    agentsSub: 'Each agent is precisely trained for one task — understanding context, retrieving knowledge, and knowing when to escalate.',
    agent1Name: 'Order Tracker', agent1Desc: 'Tracks order status and delivery time, updating customers automatically on any change.',
    agent2Name: 'Returns & Refunds', agent2Desc: 'Explains return and exchange policies precisely, and initiates the process directly when needed.',
    agent3Name: 'Product Expert', agent3Desc: 'Answers questions on sizing, specs, and availability with deep knowledge of your catalog.',
    agent4Name: 'Menu & Offers', agent4Desc: 'Presents your menu, prices, and current offers naturally and updated in real time.',
    agent5Name: 'Store Info', agent5Desc: 'Provides hours, address, and payment methods whenever a customer asks.',
    agent6Name: 'General Router', agent6Desc: 'Analyzes every message intent and routes it to the right agent instantly.',

    statResolve: 'Full Auto-Resolution Rate', statSpeed: 'Avg First Response Time', statCsat: 'Measured CSAT', statUptime: 'Uninterrupted Coverage',

    pricingEyebrow: 'Pricing', pricingTitle: 'A plan that fits your business size',
    pricingSub: 'Start free, upgrade when you need more — no long-term contracts.',
    planPilotName: 'Pilot', planPilotDesc: 'For your first trial before subscribing', planPilotPrice: 'Free', planPilotPeriod: '/ 30 days',
    planStarterName: 'Starter', planStarterDesc: 'For cafes and small stores', planStarterPrice: '93', planStarterPeriod: 'USD / month',
    planProName: 'Pro', planProDesc: 'For larger restaurants and stores', planProPrice: '186', planProPeriod: 'USD / month',
    planBadge: 'Most Popular',
    planCta: 'Subscribe Now', planCtaFree: 'Start Trial',

    footerTagline: 'Intelligent support for modern business.',
    footerRights: '© 2026 NeuraOps. All rights reserved.',

    backLink: 'Home',
    stepName1: 'Store Type', stepName2: 'Store Details', stepName3: 'Train Assistant', stepName4: 'Activation',
    s1Eyebrow: 'Step 1 of 4', s1Title: 'Choose your store type', s1Sub: 'We tailor your AI assistant to your specific business',
    type1Name: 'Cafe / Coffee Shop', type1Desc: 'For cafes, coffee shops & beverages',
    type2Name: 'Restaurant', type2Desc: 'For restaurants, meals & food service',
    type3Name: 'Retail Store', type3Desc: 'For shops, products & fashion',
    type4Name: 'Other Business', type4Desc: 'Services, bookings, or custom needs',
    nextBtn: 'Next', backBtn: 'Back', nextBtnActivate: 'Next — Activate Assistant',

    s2Eyebrow: 'Step 2 of 4', s2Title: 'Your store details', s2Sub: 'So your AI assistant knows your identity and speaks in your name',
    fStoreName: 'Store / Restaurant Name', fStoreNamePh: 'e.g. The Original Coffee',
    fPhone: 'Phone Number (WhatsApp)',
    fCity: 'City', fCityChoose: 'Select your city',
    cBuraidah: 'Buraidah', cUnaizah: 'Unaizah', cRiyadh: 'Riyadh', cJeddah: 'Jeddah', cDammam: 'Dammam', cDubai: 'Dubai', cOther: 'Other',
    fChannel: 'Primary Contact Channel', fChannelChoose: 'Select channel',
    chWhats: 'WhatsApp', chInsta: 'Instagram', chBoth: 'Both', chWeb: 'Website',

    s3Eyebrow: 'Step 3 of 4', s3Title: 'Train your assistant', s3Sub: 'Tell it what your customers ask most often',
    uploadTitle: 'Upload your product list or FAQ file', uploadHint: 'PDF, Word, or image — optional',
    uploadedFile: 'File uploaded successfully ✓',
    orDivider: 'Or fill in below',
    fTopics: 'Most common questions you receive', optional: '(optional)',
    tag1: 'Product Pricing', tag2: 'Business Hours', tag3: 'Shipping & Delivery', tag4: 'Return Policy',
    tag5: 'Stock Availability', tag6: 'Payment Methods', tag7: 'Store Location', tag8: 'Offers & Discounts',
    fHours: 'Business Hours', fHoursPh: 'e.g. 8am to 11pm daily',

    s4Eyebrow: 'Step 4 of 4', s4Title: 'Activating your system', s4Sub: "This takes just a moment — don't close this page",
    check1: 'Building knowledge base', check2: 'Activating AI agents', check3: 'Connecting channel', check4: 'Testing response quality',
    successTitle: 'Activated Successfully 🎉', successSub: 'Your AI assistant is ready. Try it now or share with your team.',
    revStore: 'Store', revAgents: 'Active Agents', revAgentsVal: '6 AI Agents',
    revPlan: 'Plan', revPlanVal: 'Pilot — Free for 30 days',
    copyBtn: 'Copy', copiedBtn: 'Copied ✓',
    tryDemoBtn: '🚀 Try it as a customer', shareBtn: '↗ Share with your team',
    trust1: 'Your data is secure', trust2: 'No credit card required',

    dashTitle: 'Pilot Dashboard', dashSub: 'Overview of your AI assistant performance',
    statConvos: 'Conversations Today', statRate: 'Auto-Resolution Rate', statResponse: 'Avg Response Time', statSatisfaction: 'Customer Satisfaction',
    trendUp: 'vs last week',
    agentPerf: 'Agent Performance',
    healthCheck: 'Supabase Connection Check', checkNow: 'Check Now', checking: 'Checking...',
    connected: 'Connected', storesCount: 'stores', notConnected: 'Connection failed',
    chatLive: 'Live Demo — NeuraOps AI Assistant', chatPlaceholder: 'Type your question...',
    aiName: 'NeuraOps AI', thinking: 'Thinking...', welcomeMsg: "👋 Hi! I'm your AI assistant. How can I help you?",
    quickOrder: "Where's my order?", quickReturn: 'Return policy', quickHours: 'Business hours', quickPayment: 'Payment methods',
    escalationsTitle: 'Pending Escalations', escalationsEmpty: 'Escalations will appear here once real conversations start.',
    settingsTitle: 'Settings', settingsEmpty: 'Coming soon — SLA settings, work hours, and auto-messages.',
    routerAgent: 'Router', orderTrackerAgent: 'Order Tracker', returnsAgent: 'Returns',
  },
} as const

export type TranslationKey = keyof typeof translations.ar
export type Translations = typeof translations.ar | typeof translations.en

export function getTranslations(lang: Lang): Translations {
  return translations[lang]
}
