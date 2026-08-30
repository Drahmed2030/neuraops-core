import type { Metadata } from 'next'
import { TrustPage } from '@/components/trust/TrustPage'

export const metadata: Metadata = {
  title: 'Website Terms — NeuraOps',
  description: 'Pilot-stage website and LeadOps demonstration terms.',
  alternates: { canonical: '/terms' },
  openGraph: { url: '/terms' },
}

export default function TermsPage() {
  return <TrustPage
    eyebrow={{ en: 'Legal', ar: 'قانوني' }}
    title={{ en: 'Website and demo terms', ar: 'شروط الموقع والتجربة' }}
    intro={{
      en: 'These interim terms apply to the public NeuraOps website and demonstration experience. A paid pilot is governed by a separate written scope and commercial agreement.',
      ar: 'تنطبق هذه الشروط المؤقتة على موقع NeuraOps العام وتجربة العرض. ويخضع أي Pilot مدفوع لنطاق مكتوب واتفاق تجاري منفصل.',
    }}
    sections={{
      en: [
        { title: 'Permitted use', body: 'Use the service lawfully and only with information you are entitled to submit. Do not probe, disrupt, reverse engineer, overload, or attempt unauthorized access to the service or another user’s information.' },
        { title: 'Pilot-stage service', body: 'Features may change, be limited, or be unavailable. Demonstration scores and responses are illustrative operational outputs, not guarantees of sales, conversion, revenue, or suitability for a particular business.' },
        { title: 'No professional or high-stakes advice', body: 'NeuraOps and LeadOps do not provide medical, legal, financial, employment, credit, or other regulated professional advice. Do not use the demo for patient data or high-stakes automated decisions.' },
        { title: 'Commercial pilots', body: 'Submitting a fit-check request does not create a contract or payment obligation. Scope, fees, responsibilities, data terms, and acceptance criteria must be confirmed in a separate written agreement before a paid pilot begins.' },
        { title: 'Intellectual property', body: 'NeuraOps technology, branding, and website materials remain protected by applicable intellectual-property laws. You retain rights in information you lawfully submit and permit its processing only as needed to provide the requested experience.' },
        { title: 'Liability and governing framework', body: 'The public demo is provided on an as-available basis to the extent permitted by law. Mandatory rights are not excluded. These interim terms are governed by the laws applicable in the Kingdom of Saudi Arabia, subject to any mandatory consumer or data-protection rules that apply.' },
      ],
      ar: [
        { title: 'الاستخدام المسموح', body: 'استخدم الخدمة بصورة قانونية وبمعلومات يحق لك تقديمها. لا تحاول فحص الخدمة عدائيًا أو تعطيلها أو هندستها عكسيًا أو إغراقها أو الوصول غير المصرح به إلى الخدمة أو معلومات مستخدم آخر.' },
        { title: 'خدمة في مرحلة الـPilot', body: 'قد تتغير الميزات أو تكون محدودة أو غير متاحة. درجات وردود العرض نتائج تشغيلية توضيحية وليست ضمانًا للمبيعات أو التحويل أو الإيرادات أو الملاءمة لعمل محدد.' },
        { title: 'ليست استشارة مهنية أو قرارًا عالي المخاطر', body: 'لا تقدم NeuraOps أو LeadOps استشارات طبية أو قانونية أو مالية أو وظيفية أو ائتمانية أو مهنية منظمة. لا تستخدم العرض لبيانات المرضى أو القرارات الآلية عالية المخاطر.' },
        { title: 'برامج الـPilot التجارية', body: 'إرسال طلب فحص الملاءمة لا ينشئ عقدًا أو التزامًا بالدفع. يجب تأكيد النطاق والرسوم والمسؤوليات وشروط البيانات ومعايير القبول في اتفاق مكتوب منفصل قبل بدء Pilot مدفوع.' },
        { title: 'الملكية الفكرية', body: 'تظل تقنية NeuraOps وعلامتها ومواد الموقع محمية بموجب قوانين الملكية الفكرية ذات الصلة. وتحتفظ بحقوقك في المعلومات التي تقدمها بصورة قانونية وتسمح بمعالجتها فقط بالقدر اللازم لتقديم التجربة المطلوبة.' },
        { title: 'المسؤولية والإطار النظامي', body: 'تقدم التجربة العامة حسب التوفر وبالقدر الذي يسمح به النظام، ولا يتم استبعاد الحقوق الإلزامية. تخضع هذه الشروط المؤقتة للأنظمة المعمول بها في المملكة العربية السعودية، مع مراعاة أي قواعد إلزامية لحماية المستهلك أو البيانات.' },
      ],
    }}
    action={{ href: '/contact', en: 'Contact NeuraOps', ar: 'تواصل مع NeuraOps' }}
  />
}
