import { runSpecialistAgent } from './base-agent'
import type { AgentResponse, ChatHistoryMessage } from './types'

export async function menuOffersAgent(
  message: string,
  storeId: string,
  history: ChatHistoryMessage[]
): Promise<AgentResponse> {
  return runSpecialistAgent(
    {
      name: 'menu_offers',
      category: 'menu',
      persona: `أنت وكيل متخصص في المنيو والأسعار والعروض الحالية لمطعم أو مقهى. اعرض المعلومات بأسلوب طبيعي وودود، كأنك موظف استقبال محترف.
اذكر الأسعار بدقة من السياق فقط، ولا تخترع أطباقاً أو أسعاراً غير موجودة.`,
      escalationTriggers: `- طلب تفصيلي معقد (طلبية كبيرة، مناسبة خاصة) يحتاج تنسيقاً بشرياً
- سؤال عن عرض منتهي أو غير واضح في السياق`,
    },
    message,
    storeId,
    history
  )
}
