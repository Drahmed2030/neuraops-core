import OpenAI from 'openai'
import type { AgentName, RoutingDecision, ChatHistoryMessage } from './types'
import {
  callWithTimeoutAndRetry,
  parseRoutingResponse,
  providerFallbackReason,
} from '@/lib/reliability/ai.mjs'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0 })

const AGENT_DESCRIPTIONS: Record<Exclude<AgentName, 'router'>, string> = {
  order_tracker: 'أسئلة عن حالة الطلب، رقم التتبع، وقت التوصيل، هل الطلب شُحن أو وصل',
  returns: 'أسئلة عن الإرجاع، الاستبدال، الاسترداد، سياسة الاستبدال',
  product_expert: 'أسئلة عن المقاسات، المواصفات، توفر منتج معين، تفاصيل المنتج',
  menu_offers: 'أسئلة عن المنيو، الأسعار، العروض الحالية، الخصومات',
  store_info: 'أسئلة عن أوقات الدوام، العنوان، طرق الدفع، معلومات التواصل',
}

/**
 * Analyzes the customer's message BEFORE any response is generated,
 * and decides which single specialist agent should handle it.
 * Provider failures degrade to a deterministic low-confidence route so
 * the orchestrator can escalate instead of throwing an unhandled 500.
 */
export async function routeMessage(
  message: string,
  history: ChatHistoryMessage[]
): Promise<RoutingDecision> {
  const agentList = Object.entries(AGENT_DESCRIPTIONS)
    .map(([id, desc]) => `- ${id}: ${desc}`)
    .join('\n')

  const systemPrompt = `أنت موجّه ذكي (Router) في نظام دعم آلي متعدد الوكلاء. مهمتك الوحيدة: تحليل رسالة العميل وتحديد أي وكيل متخصص يجب أن يتولى الرد.

الوكلاء المتاحون:
${agentList}

قواعد:
- اختر وكيلاً واحداً فقط، الأنسب لنية الرسالة
- إذا الرسالة لا تنتمي بوضوح لأي وكيل متخصص (تحية عامة، سؤال غامض، شكوى عامة)، اخترRouter نفسه غير متاح كخيار — استخدم "store_info" كافتراضي آمن
- قيّم ثقتك في القرار من 0 إلى 1

أجب حصراً بصيغة JSON:
{"agent": "order_tracker", "reasoning": "سبب مختصر", "confidence": 0.9}`

  try {
    const response = await callWithTimeoutAndRetry(
      (signal: AbortSignal) => openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-4).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: message },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 150,
        temperature: 0.1,
      }, { signal }),
      { timeoutMs: 8_000, retries: 1 }
    )

    const raw = response.choices[0]?.message?.content || ''
    return parseRoutingResponse(raw) as RoutingDecision
  } catch (error) {
    const reason = providerFallbackReason(error)
    console.error('[router] controlled provider fallback:', reason)
    return {
      agent: 'store_info',
      reasoning: reason,
      confidence: 0,
    }
  }
}
