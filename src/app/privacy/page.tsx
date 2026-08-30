import type { Metadata } from 'next'
import { TrustPage } from '@/components/trust/TrustPage'

export const metadata: Metadata = {
  title: 'Privacy Notice — NeuraOps',
  description: 'How NeuraOps handles information submitted through LeadOps and its website.',
  alternates: { canonical: '/privacy' },
  openGraph: { url: '/privacy' },
}

export default function PrivacyPage() {
  return <TrustPage
    eyebrow={{ en: 'Trust center', ar: 'مركز الثقة' }}
    title={{ en: 'Privacy notice', ar: 'إشعار الخصوصية' }}
    intro={{
      en: 'This notice explains how NeuraOps handles information submitted through this website and the LeadOps pilot experience.',
      ar: 'يوضح هذا الإشعار كيفية تعامل NeuraOps مع المعلومات المقدمة عبر هذا الموقع وتجربة LeadOps التجريبية.',
    }}
    sections={{
      en: [
        { title: 'Information you choose to provide', body: 'The intake may collect your name, email address, phone number, business need, budget band, urgency, and decision role. Contact fields are optional unless a specific pilot agreement says otherwise.' },
        { title: 'How information is used', body: 'We use submissions to demonstrate qualification, respond to enquiries, assess pilot fit, provide human review where needed, protect the service, and improve the workflow.' },
        { title: 'Automation and human review', body: 'LeadOps uses explicit qualification rules and may use AI to assist with a response. Important, ambiguous, low-confidence, or provider-failure cases may be routed to a person. Do not submit patient data, passwords, payment-card data, or other highly sensitive information.' },
        { title: 'Service providers and international processing', body: 'We use contracted infrastructure and technology providers to host, secure, and operate the service. Processing may occur outside your country, subject to the provider arrangements available to this pilot-stage service.' },
        { title: 'Retention and your choices', body: 'We keep pilot information only for as long as reasonably needed for the stated purposes, security, dispute handling, or an agreed pilot. You may request access, correction, or deletion through the contact route below. A request may require identity verification.' },
        { title: 'Scope', body: 'This is an interim pilot-stage privacy notice. Customer-specific data roles, retention periods, security commitments, and regulatory terms are agreed separately before a production pilot that requires them.' },
      ],
      ar: [
        { title: 'المعلومات التي تختار تقديمها', body: 'قد يجمع نموذج الاستقبال الاسم والبريد الإلكتروني والهاتف واحتياج العمل ونطاق الميزانية والاستعجال ودورك في القرار. بيانات التواصل اختيارية ما لم ينص اتفاق Pilot محدد على غير ذلك.' },
        { title: 'كيفية استخدام المعلومات', body: 'نستخدم الطلبات لعرض آلية التأهيل، والرد على الاستفسارات، وتقييم ملاءمة الـPilot، وتوفير المراجعة البشرية عند الحاجة، وحماية الخدمة وتحسين سير العمل.' },
        { title: 'الأتمتة والمراجعة البشرية', body: 'يستخدم LeadOps قواعد تأهيل واضحة، وقد يستخدم AI للمساعدة في صياغة الرد. وقد تحال الحالات المهمة أو غير الواضحة أو منخفضة الثقة أو حالات تعطل المزود إلى شخص. لا ترسل بيانات مرضى أو كلمات مرور أو بيانات بطاقات دفع أو معلومات شديدة الحساسية.' },
        { title: 'مزودو الخدمة والمعالجة الدولية', body: 'نستخدم مزودي بنية تحتية وتقنية متعاقدين لاستضافة الخدمة وتأمينها وتشغيلها. وقد تتم المعالجة خارج بلدك وفق ترتيبات المزودين المتاحة لهذه الخدمة في مرحلة الـPilot.' },
        { title: 'الاحتفاظ وخياراتك', body: 'نحتفظ بمعلومات الـPilot فقط للمدة المعقولة اللازمة للأغراض الموضحة أو للأمن أو معالجة النزاعات أو اتفاق Pilot. يمكنك طلب الوصول أو التصحيح أو الحذف عبر مسار التواصل أدناه، وقد نطلب التحقق من الهوية.' },
        { title: 'النطاق', body: 'هذا إشعار خصوصية مؤقت لمرحلة الـPilot. يتم الاتفاق بشكل منفصل على أدوار البيانات ومدد الاحتفاظ والتزامات الأمن والمتطلبات التنظيمية الخاصة بالعميل قبل أي Pilot إنتاجي يحتاج إليها.' },
      ],
    }}
    action={{ href: '/contact?intent=privacy', en: 'Submit a privacy request', ar: 'أرسل طلب خصوصية' }}
  />
}
