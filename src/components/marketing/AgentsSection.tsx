'use client'

import { useUI } from '@/lib/ui-context'

const CAPABILITY_ICONS = ['📥', '🧮', '🧠', '🚦', '🤝', '📊']

export function AgentsSection() {
  const { lang } = useUI()
  const isArabic = lang === 'ar'

  const capabilities = isArabic
    ? [
        { name: 'استقبال الطلب', desc: 'يجمع بيانات العميل المحتمل واحتياجه من نموذج ويب بسيط وواضح.' },
        { name: 'تأهيل قابل للتفسير', desc: 'يحسب درجة التأهيل بقواعد محددة وقابلة للاختبار بدل الاعتماد على رأي AI فقط.' },
        { name: 'مساعدة بالذكاء الاصطناعي', desc: 'يصيغ ردًا مناسبًا ويفهم السياق مع fallback آمن عند انخفاض الثقة أو تعطل المزود.' },
        { name: 'تحديد الأولوية', desc: 'يصنف الطلب إلى مؤهل، غير مؤهل، أو يحتاج مراجعة بشرية حسب الدرجة والثقة.' },
        { name: 'تصعيد بشري', desc: 'يحيل الحالات المهمة أو الغامضة إلى شخص حقيقي مع الحفاظ على حالة المحادثة والتصعيد.' },
        { name: 'متابعة وقياس', desc: 'يعرض حالة العميل المحتمل والمتابعة والفوز/الخسارة ومؤشرات Pilot الأساسية.' },
      ]
    : [
        { name: 'Inbound capture', desc: 'Collects the prospect’s need and voluntarily supplied contact details through a simple web intake.' },
        { name: 'Explainable qualification', desc: 'Scores leads with explicit, testable rules instead of relying on AI judgment alone.' },
        { name: 'AI-assisted response', desc: 'Drafts a useful response and handles provider failure or low confidence with a safe fallback.' },
        { name: 'Priority decision', desc: 'Classifies the lead as qualified, unqualified, or needing human review based on score and confidence.' },
        { name: 'Human handoff', desc: 'Escalates valuable or ambiguous cases to a person while preserving lifecycle and escalation integrity.' },
        { name: 'Follow-up & learning', desc: 'Tracks lead state, follow-up, won/lost outcomes, and the minimum analytics needed for a pilot.' },
      ]

  return (
    <section className="px-5 py-20 sm:px-10 sm:py-24">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-[12px] font-bold tracking-[0.15em] uppercase mb-4 text-gold font-sans">
            {isArabic ? 'سير العمل' : 'The workflow'}
          </div>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.6rem)] font-extrabold tracking-tight mb-4 leading-tight">
            {isArabic ? 'من طلب وارد إلى فرصة قابلة للمتابعة' : 'From inbound request to actionable opportunity'}
          </h2>
          <p className="text-[16px] leading-relaxed text-ink-950/60 dark:text-paper-50/60">
            {isArabic
              ? 'LeadOps لا يحاول أن يكون CRM كاملًا. هو طبقة تشغيل مركزة تساعد فريقك على الاستجابة بسرعة، التأهيل بوضوح، ومعرفة متى يجب أن يتدخل إنسان.'
              : 'LeadOps is not trying to become a full CRM. It is a focused operating layer for faster response, clear qualification, and deliberate human intervention.'}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {capabilities.map((item, i) => (
            <div
              key={item.name}
              className="relative p-8 rounded-[18px] border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-ink-800 hover:-translate-y-1.5 hover:border-gold hover:shadow-gold-glow transition-all cursor-default"
            >
              <div className="absolute top-7 right-7 text-[13px] font-bold text-gold/60 font-sans">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="w-[52px] h-[52px] rounded-2xl bg-gold/10 border border-gold/25 flex items-center justify-center text-2xl mb-5">
                {CAPABILITY_ICONS[i]}
              </div>
              <div className="text-[19px] font-bold mb-2.5">{item.name}</div>
              <div className="text-[14px] leading-relaxed text-ink-950/60 dark:text-paper-50/60">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
