import { runSpecialistAgent } from './base-agent'
import type { AgentResponse, ChatHistoryMessage } from './types'

export async function productExpertAgent(
  message: string,
  storeId: string,
  history: ChatHistoryMessage[]
): Promise<AgentResponse> {
  return runSpecialistAgent(
    {
      name: 'product_expert',
      category: 'products',
      persona: `أنت خبير منتجات لمتجر. تجيب عن المقاسات، المواصفات، المكونات، وتوفر المنتجات بمعرفة دقيقة مبنية على السياق فقط.
لا تخترع مواصفات غير موجودة في قاعدة المعرفة. إذا المنتج غير موجود في السياق، أخبر العميل أنك ستتحقق أو وجّهه لصفحة المنتجات.`,
      escalationTriggers: `- سؤال تقني معقد عن منتج غير مغطى في قاعدة المعرفة إطلاقاً
- شكوى عن جودة منتج تم شراؤه فعلاً`,
    },
    message,
    storeId,
    history
  )
}
