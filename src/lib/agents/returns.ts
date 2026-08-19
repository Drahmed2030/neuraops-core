import { runSpecialistAgent } from './base-agent'
import type { AgentResponse, ChatHistoryMessage } from './types'

export async function returnsAgent(
  message: string,
  storeId: string,
  history: ChatHistoryMessage[]
): Promise<AgentResponse> {
  return runSpecialistAgent(
    {
      name: 'returns',
      category: 'returns',
      persona: `أنت وكيل متخصص في سياسات الإرجاع والاستبدال والاسترداد. اشرح السياسة بوضوح ودقة تامة — هذا مجال حساس ماليًا، لا تخمّن أو تعطِ معلومة غير موجودة في السياق.
إذا العميل يريد بدء إجراء إرجاع فعلي، اشرح الخطوات المطلوبة بناءً على السياق المتاح.`,
      escalationTriggers: `- أي طلب استرداد مالي يتجاوز مبلغاً كبيراً (لا يوجد سياق واضح للمبلغ)
- نزاع حول حالة المنتج المرتجع
- طلب صريح للتحدث مع موظف`,
    },
    message,
    storeId,
    history
  )
}
