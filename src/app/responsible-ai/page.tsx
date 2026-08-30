import type { Metadata } from 'next'
import { TrustPage } from '@/components/trust/TrustPage'

export const metadata: Metadata = { title: 'Responsible AI — NeuraOps', description: 'How NeuraOps combines explicit rules, AI assistance, and human oversight.' }

export default function ResponsibleAiPage() {
  return <TrustPage
    eyebrow={{ en: 'Trust center', ar: 'مركز الثقة' }}
    title={{ en: 'Responsible AI principles', ar: 'مبادئ AI المسؤول' }}
    intro={{
      en: 'LeadOps is designed so AI assists an explainable workflow rather than becoming an unreviewable decision maker.',
      ar: 'صمم LeadOps بحيث يساعد AI سير عمل قابلًا للتفسير، بدلًا من أن يصبح صاحب قرار غير قابل للمراجعة.',
    }}
    sections={{
      en: [
        { title: 'Explainable rules first', body: 'Core qualification uses explicit, testable rules. AI may assist with response drafting and confidence signals, but it is not the sole basis for important workflow decisions.' },
        { title: 'Human oversight', body: 'Important, ambiguous, low-confidence, or provider-failure cases can be routed for human review. Operators can follow the lead lifecycle instead of treating model output as final truth.' },
        { title: 'Truthful evidence', body: 'We separate illustrative demonstrations from verified customer evidence and do not publish fabricated customers, outcomes, conversion rates, or certifications.' },
        { title: 'Restricted use', body: 'The public demo is not designed for medical, legal, employment, credit, insurance, or other high-impact automated decisions. Customer pilots with regulated data require a separate risk and compliance assessment.' },
        { title: 'Monitoring and improvement', body: 'We review failures, escalation quality, false qualification patterns, and user feedback during pilots. Expansion decisions should follow evidence, not model novelty.' },
      ],
      ar: [
        { title: 'القواعد القابلة للتفسير أولًا', body: 'يعتمد التأهيل الأساسي على قواعد واضحة قابلة للاختبار. وقد يساعد AI في صياغة الرد وإشارات الثقة، لكنه ليس الأساس الوحيد للقرارات التشغيلية المهمة.' },
        { title: 'الإشراف البشري', body: 'يمكن إحالة الحالات المهمة أو غير الواضحة أو منخفضة الثقة أو حالات تعطل المزود للمراجعة البشرية. ويمكن للمشغل متابعة دورة حياة العميل بدل اعتبار مخرجات النموذج حقيقة نهائية.' },
        { title: 'الأدلة الصادقة', body: 'نفصل بين العروض التوضيحية والأدلة الموثقة للعملاء، ولا ننشر عملاء أو نتائج أو نسب تحويل أو شهادات مختلقة.' },
        { title: 'الاستخدام المقيد', body: 'لم يصمم العرض العام للقرارات الطبية أو القانونية أو الوظيفية أو الائتمانية أو التأمينية أو غيرها من القرارات عالية الأثر. وتتطلب برامج العملاء ذات البيانات المنظمة تقييم مخاطر وامتثال منفصلًا.' },
        { title: 'المراقبة والتحسين', body: 'نراجع الأعطال وجودة التصعيد وأنماط التأهيل الخاطئ وملاحظات المستخدمين أثناء برامج الـPilot. ويجب أن تتبع قرارات التوسع الأدلة لا حداثة النموذج.' },
      ],
    }}
    action={{ href: '/contact?intent=feedback', en: 'Share feedback', ar: 'شارك ملاحظاتك' }}
  />
}
