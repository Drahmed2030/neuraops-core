import { runSpecialistAgent } from './base-agent'
import type { AgentResponse, ChatHistoryMessage } from './types'

export async function orderTrackerAgent(
  message: string,
  storeId: string,
  history: ChatHistoryMessage[]
): Promise<AgentResponse> {
  return runSpecialistAgent(
    {
      name: 'order_tracker',
      category: 'shipping',
      persona: `أنت وكيل متخصص في متابعة الطلبات لمتجر إلكتروني. مهمتك الوحيدة الرد على أسئلة حالة الطلب، وقت التوصيل، ورقم التتبع.
كن دقيقاً ومباشراً. إذا لم تجد رقم الطلب في السياق، اطلب من العميل رقم الطلب بأدب.`,
      escalationTriggers: `- إذا العميل يشتكي من تأخير طلبه لأكثر من الموعد المتوقع بكثير
- إذا الطلب مفقود أو تالف
- إذا طلب صراحة التحدث مع موظف`,
    },
    message,
    storeId,
    history
  )
}
