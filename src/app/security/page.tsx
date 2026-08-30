import type { Metadata } from 'next'
import { TrustPage } from '@/components/trust/TrustPage'

export const metadata: Metadata = {
  title: 'Security — NeuraOps',
  description: 'NeuraOps pilot-stage security approach and responsible reporting route.',
  alternates: { canonical: '/security' },
  openGraph: { url: '/security' },
}

export default function SecurityPage() {
  return <TrustPage
    eyebrow={{ en: 'Trust center', ar: 'مركز الثقة' }}
    title={{ en: 'Security approach', ar: 'نهج الأمن' }}
    intro={{
      en: 'NeuraOps applies proportionate safeguards for a limited commercial-pilot service and expands controls as the product and customer risk justify them.',
      ar: 'تطبق NeuraOps ضمانات أمنية متناسبة مع خدمة تجارية تجريبية محدودة، وتوسع الضوابط كلما بررت مخاطر المنتج والعملاء ذلك.',
    }}
    sections={{
      en: [
        { title: 'Current safeguards', body: 'The service uses HTTPS, scoped access patterns, server-side validation, rate limiting, controlled AI failure handling, and human escalation for important or ambiguous workflow states.' },
        { title: 'Data minimization', body: 'The public LeadOps intake is designed to work without highly sensitive information. Users are instructed not to submit patient data, credentials, payment-card information, or regulated high-risk records.' },
        { title: 'Pilot onboarding', body: 'Before a production pilot, we review the intended data, access needs, retention, subprocessors, incident contacts, and any customer-specific security requirements. Unsupported requirements must be resolved before launch.' },
        { title: 'Responsible reporting', body: 'If you believe you found a vulnerability, do not access data, disrupt service, or publicly disclose the issue. Use the security contact route below and include only the minimum detail needed to reproduce it safely.' },
        { title: 'Limitations', body: 'No internet service can guarantee absolute security. This page describes the current approach and is not a certification or claim of compliance with a standard that has not been independently verified.' },
      ],
      ar: [
        { title: 'الضمانات الحالية', body: 'تستخدم الخدمة HTTPS وأنماط وصول محددة والتحقق من المدخلات على الخادم وتحديد معدل الطلبات ومعالجة محكومة لتعطل AI وتصعيدًا بشريًا للحالات المهمة أو غير الواضحة.' },
        { title: 'تقليل البيانات', body: 'صمم نموذج LeadOps العام ليعمل دون معلومات شديدة الحساسية. ويطلب من المستخدمين عدم تقديم بيانات المرضى أو بيانات الدخول أو بطاقات الدفع أو السجلات المنظمة عالية المخاطر.' },
        { title: 'تهيئة الـPilot', body: 'قبل أي Pilot إنتاجي نراجع البيانات المقصودة واحتياجات الوصول والاحتفاظ والمزودين الفرعيين وجهات اتصال الحوادث وأي متطلبات أمنية خاصة بالعميل. ويجب حل المتطلبات غير المدعومة قبل الإطلاق.' },
        { title: 'الإبلاغ المسؤول', body: 'إذا اعتقدت أنك وجدت ثغرة، فلا تصل إلى البيانات أو تعطل الخدمة أو تنشر المشكلة. استخدم مسار التواصل الأمني أدناه وقدم الحد الأدنى اللازم لإعادة المشكلة بأمان.' },
        { title: 'القيود', body: 'لا يمكن لأي خدمة إنترنت ضمان أمن مطلق. تصف هذه الصفحة النهج الحالي ولا تمثل شهادة أو ادعاء امتثال لمعيار لم يتم التحقق منه بصورة مستقلة.' },
      ],
    }}
    action={{ href: '/contact?intent=security', en: 'Report a security concern', ar: 'أبلغ عن ملاحظة أمنية' }}
  />
}
