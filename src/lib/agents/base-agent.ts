import OpenAI from 'openai'
import { retrieveContext } from './rag'
import type { AgentName, AgentResponse, ChatHistoryMessage } from './types'
import {
  callWithTimeoutAndRetry,
  parseAgentResponse,
  providerFallbackReason,
} from '@/lib/reliability/ai.mjs'

let openaiClient: OpenAI | null = null

function getOpenAI() {
  if (openaiClient) return openaiClient
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')
  openaiClient = new OpenAI({ apiKey, maxRetries: 0 })
  return openaiClient
}

interface AgentConfig {
  name: AgentName
  persona: string
  category?: string
  escalationTriggers: string
}

function fallbackResponse(
  agent: AgentName,
  retrievedChunks: string[],
  reason: string
): AgentResponse {
  return {
    agent,
    answer: 'أعتذر، تعذر إكمال الرد الآلي الآن. تم تحويل طلبك للمراجعة البشرية.',
    confidence: 0,
    should_escalate: true,
    escalation_reason: reason,
    retrieved_chunks: retrievedChunks,
  }
}

export async function runSpecialistAgent(
  config: AgentConfig,
  message: string,
  storeId: string,
  history: ChatHistoryMessage[]
): Promise<AgentResponse> {
  const context = await retrieveContext(message, storeId, config.category)
  const retrievedChunks = context.chunks.map((c: any) => c.content)

  if (context.degraded) {
    return fallbackResponse(config.name, retrievedChunks, 'تعذر الوصول إلى سياق المعرفة بشكل موثوق')
  }

  const systemPrompt = `${config.persona}\n\nالسياق المتاح من قاعدة المعرفة:\n${retrievedChunks.join('\n---\n')}\n\nمتى تصعّد للموظف البشري:\n${config.escalationTriggers}\n\nأجب حصراً بصيغة JSON:\n{"answer": "الرد هنا بالعربية", "confidence": 0.9, "should_escalate": false, "escalation_reason": null}`

  try {
    const openai = getOpenAI()
    const response = await callWithTimeoutAndRetry(
      (signal: AbortSignal) => openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-4).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: message },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
        temperature: 0.3,
      }, { signal }),
      { timeoutMs: 10_000, retries: 1 }
    )

    const raw = response.choices[0]?.message?.content || ''
    const parsed = parseAgentResponse(raw)

    return {
      agent: config.name,
      ...parsed,
      retrieved_chunks: retrievedChunks,
    }
  } catch (error) {
    const reason = providerFallbackReason(error)
    console.error(`[agent:${config.name}] controlled provider fallback:`, reason)
    return fallbackResponse(
      config.name,
      retrievedChunks,
      reason === 'invalid_provider_response'
        ? 'استجابة غير صالحة من مزود الذكاء الاصطناعي'
        : 'تعذر الوصول إلى مزود الذكاء الاصطناعي'
    )
  }
}
