import type { Metadata } from 'next'
import { TrustPage } from '@/components/trust/TrustPage'

export const metadata: Metadata = {
  title: 'About NeuraOps',
  description: 'Learn what NeuraOps is building and how it operates during the commercial pilot stage.',
  alternates: { canonical: '/about' },
  openGraph: { url: '/about' },
}

export default function AboutPage() {
  return <TrustPage
    eyebrow={{ en: 'About', ar: 'عن NeuraOps' }}
    title={{ en: 'Focused automation, with accountable human oversight', ar: 'أتمتة مركزة مع إشراف بشري مسؤول' }}
    intro={{
      en: 'NeuraOps is an independent, founder-led technology venture operating from Saudi Arabia and currently validating its products through limited commercial pilots.',
      ar: 'NeuraOps مشروع تقني مستقل يقوده المؤسس من المملكة العربية السعودية، ويختبر منتجاته حاليًا من خلال برامج تجريبية تجارية محدودة.',
    }}
    sections={{
      en: [
        { title: 'What we are building', body: 'LeadOps is a focused operating layer for capturing, qualifying, prioritizing, and following up inbound opportunities. It is not positioned as a replacement for a full CRM.' },
        { title: 'How we work', body: 'We begin with one narrow workflow, document the rules, keep important or ambiguous cases reviewable by a person, and expand only when evidence supports it.' },
        { title: 'Product structure', body: 'NeuraOps is the broader automation and operations platform. Cliniverse AI is the healthcare-focused product direction within that wider ecosystem.' },
        { title: 'Current stage', body: 'We are in commercial pilot stage. Examples on this website are illustrative unless explicitly identified as verified customer evidence.' },
      ],
      ar: [
        { title: 'ما الذي نبنيه', body: 'LeadOps طبقة تشغيل مركزة لاستقبال الفرص الواردة وتأهيلها وترتيب أولوياتها ومتابعتها، ولا يتم تقديمه كبديل كامل لأنظمة CRM.' },
        { title: 'كيف نعمل', body: 'نبدأ بسير عمل واحد محدود، ونوثق القواعد، ونبقي الحالات المهمة أو غير الواضحة قابلة للمراجعة البشرية، ولا نتوسع إلا عندما تدعم الأدلة ذلك.' },
        { title: 'هيكل المنتجات', body: 'NeuraOps هي منصة الأتمتة والعمليات الأوسع. وتمثل Cliniverse AI اتجاه المنتج المتخصص في الرعاية الصحية داخل هذه المنظومة.' },
        { title: 'المرحلة الحالية', body: 'نحن في مرحلة Pilot تجارية. جميع الأمثلة في الموقع توضيحية ما لم يتم تعريفها صراحة كدليل موثق لعميل.' },
      ],
    }}
    action={{ href: '/contact', en: 'Discuss a pilot', ar: 'ناقش برنامجًا تجريبيًا' }}
  />
}
