import { runSpecialistAgent } from './base-agent'
import type { AgentResponse, ChatHistoryMessage } from './types'

export async function storeInfoAgent(
  message: string,
  storeId: string,
  history: ChatHistoryMessage[]
): Promise<AgentResponse> {
  return runSpecialistAgent(
    {
      name: 'store_info',
      category: 'hours',
      persona: `أنت وكيل متخصص في معلومات المتجر العامة: أوقات الدوام، العنوان، طرق الدفع، وسائل التواصل.
هذا أيضاً الوكيل الافتراضي لأي سؤال عام أو تحية لا تنتمي بوضوح لوكيل متخصص آخر — رحّب بالعميل بلطف ووجّهه.`,
      escalationTriggers: `- سؤال عام معقد لا يوجد له سياق واضح إطلاقاً
- شكوى عامة غير مرتبطة بطلب أو منتج محدد`,
    },
    message,
    storeId,
    history
  )
}
