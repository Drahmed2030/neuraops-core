import type { Metadata } from 'next'
import { TrustPage } from '@/components/trust/TrustPage'

export const metadata: Metadata = {
  title: 'Contact NeuraOps',
  description: 'Request a LeadOps pilot fit check or contact NeuraOps about privacy, security, or product feedback.',
  alternates: { canonical: '/contact' },
  openGraph: { url: '/contact' },
}

export default function ContactPage({ searchParams }: { searchParams: { intent?: string } }) {
  const intent = ['privacy', 'security', 'feedback'].includes(searchParams.intent || '') ? searchParams.intent : 'pilot'
  return <TrustPage
    eyebrow={{ en: 'Contact', ar: 'تواصل' }}
    title={{ en: 'Start with a focused request', ar: 'ابدأ بطلب واضح ومركز' }}
    intro={{
      en: 'Use the structured contact route so your request is recorded and can be routed for human review. Submitting it does not create a contract or payment obligation.',
      ar: 'استخدم مسار التواصل المنظم حتى يتم تسجيل طلبك وإحالته للمراجعة البشرية عند الحاجة. إرسال الطلب لا ينشئ عقدًا أو التزامًا بالدفع.',
    }}
    sections={{
      en: [
        { title: 'Pilot enquiries', body: 'Describe the single inbound workflow you want to improve, its urgency, and your role in the decision. We will use that information to assess fit before discussing scope or fees.' },
        { title: 'Privacy and security', body: 'Choose the relevant request type and provide only the minimum information needed. Do not include passwords, patient information, API keys, payment-card data, or exploit data that could expose another person’s information.' },
        { title: 'Response expectations', body: 'NeuraOps is currently founder-led. Requests are reviewed manually and no guaranteed response time is claimed on the public pilot service.' },
      ],
      ar: [
        { title: 'استفسارات الـPilot', body: 'صف سير العمل الوارد الواحد الذي تريد تحسينه، ودرجة استعجاله، ودورك في القرار. سنستخدم هذه المعلومات لتقييم الملاءمة قبل مناقشة النطاق أو الرسوم.' },
        { title: 'الخصوصية والأمن', body: 'اختر نوع الطلب المناسب وقدم الحد الأدنى اللازم فقط. لا ترسل كلمات مرور أو معلومات مرضى أو مفاتيح API أو بيانات بطاقات دفع أو معلومات استغلال قد تكشف بيانات شخص آخر.' },
        { title: 'توقعات الرد', body: 'تعمل NeuraOps حاليًا بقيادة المؤسس. تتم مراجعة الطلبات يدويًا ولا ندعي زمن استجابة مضمونًا في خدمة الـPilot العامة.' },
      ],
    }}
    action={{ href: `/lead/demo-store?intent=${intent}`, en: 'Open the secure request form', ar: 'افتح نموذج الطلب الآمن' }}
  />
}
