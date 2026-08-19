import OpenAI from 'openai'
import { retrieveContext } from './rag'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface HistoryMessage {
  role: string
  content: string
}

export async function routerAgent(
  message: string,
  storeId: string,
  history: HistoryMessage[]
) {
  const context = await retrieveContext(message, storeId)

  const systemPrompt = `أنت مساعد ذكي لمتجر. رد بالعربية بشكل ودي ومختصر.

السياق المتاح:
${context.chunks.map((c: any) => c.content).join('\n---\n')}

أجب حصراً بصيغة JSON بهذا الشكل:
{"answer": "الرد هنا", "confidence": 0.9, "should_escalate": false, "escalation_reason": null}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...history.slice(-4).map((m) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 500,
    temperature: 0.3,
  })

  const raw = response.choices[0].message.content || '{}'
  const parsed = JSON.parse(raw)

  return {
    agent: 'router',
    answer: parsed.answer || 'عذراً، لم أتمكن من فهم سؤالك.',
    confidence: parsed.confidence ?? 0,
    should_escalate: parsed.should_escalate ?? false,
    escalation_reason: parsed.escalation_reason ?? null,
    retrieved_chunks: context.chunks.map((c: any) => c.content),
  }
}
