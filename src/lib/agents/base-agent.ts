import OpenAI from 'openai'
import { retrieveContext } from './rag'
import type { AgentName, AgentResponse, ChatHistoryMessage } from './types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface AgentConfig {
  name: AgentName
  persona: string
  category?: string
  escalationTriggers: string
}

/**
 * Runs a specialist agent: retrieves relevant knowledge-base context,
 * then generates a response using that agent's specific persona/prompt.
 * Every specialist agent (order_tracker, returns, etc.) calls this
 * with its own AgentConfig instead of duplicating the OpenAI logic.
 */
export async function runSpecialistAgent(
  config: AgentConfig,
  message: string,
  storeId: string,
  history: ChatHistoryMessage[]
): Promise<AgentResponse> {
  const context = await retrieveContext(message, storeId, config.category)

  const systemPrompt = `${config.persona}

السياق المتاح من قاعدة المعرفة:
${context.chunks.map((c: any) => c.content).join('\n---\n')}

متى تصعّد للموظف البشري:
${config.escalationTriggers}

أجب حصراً بصيغة JSON:
{"answer": "الرد هنا بالعربية", "confidence": 0.9, "should_escalate": false, "escalation_reason": null}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...history.slice(-4).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 500,
    temperature: 0.3,
  })

  const raw = response.choices[0].message.content || '{}'
  const parsed = JSON.parse(raw)

  return {
    agent: config.name,
    answer: parsed.answer || 'عذراً، لم أتمكن من فهم سؤالك.',
    confidence: parsed.confidence ?? 0,
    should_escalate: parsed.should_escalate ?? false,
    escalation_reason: parsed.escalation_reason ?? null,
    retrieved_chunks: context.chunks.map((c: any) => c.content),
  }
}
