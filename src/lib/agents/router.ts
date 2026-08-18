import OpenAI from 'openai'
import { AgentName, AgentResponse } from '@/types'
import { retrieveContext } from './rag'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function routerAgent(
  message: string,
  storeId: string,
  conversationHistory: { role: string; content: string }[]
): Promise<AgentResponse> {

  // Retrieve relevant context from knowledge base
  const context = await retrieveContext(message, storeId)

  const systemPrompt = `أنت مساعد ذكي لمتجر. مهمتك الرد على أسئلة العملاء بدقة وبشكل ودي.

السياق المتاح من قاعدة المعرفة:
${context.chunks.map(c => c.content).join('\n---\n')}

قواعد مهمة:
- رد دائماً بالعربية
- كن موجزاً ومفيداً
- إذا لم تجد الإجابة في السياق، اعترف بذلك بأدب
- إذا طلب العميل التحدث مع موظف، أبلغ بذلك في JSON
- قيم مستوى ثقتك في الإجابة من 0 إلى 1

أجب بـ JSON بهذا الشكل:
{
  "answer": "الرد هنا",
  "agent": "router",
  "confidence": 0.9,
  "should_escalate": false,
  "escalation_reason": null
}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      { role: 'user', content: message }
    ],
    response_format: { type: 'json_object' },
    max_tokens: 500,
    temperature: 0.3,
  })

  const raw = response.choices[0].message.content || '{}'
  const parsed = JSON.parse(raw)

  // Auto-escalate if confidence too low
  if (parsed.confidence < 0.5 && !parsed.should_escalate) {
    parsed.should_escalate = true
    parsed.escalation_reason = 'ثقة منخفضة في الإجابة'
  }

  return {
    agent: (parsed.agent || 'router') as AgentName,
    answer: parsed.answer || 'عذراً، لم أتمكن من فهم سؤالك. هل يمكنك إعادة صياغته؟',
    confidence: parsed.confidence || 0,
    should_escalate: parsed.should_escalate || false,
    escalation_reason: parsed.escalation_reason,
    retrieved_chunks: context.chunks.map(c => c.content),
  }
}
