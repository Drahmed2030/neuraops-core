import OpenAI from 'openai'
import { retrieveContext } from './rag'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
export async function routerAgent(message: string, storeId: string, history: {role:string,content:string}[]) {
  const context = await retrieveContext(message, storeId)
  const systemPrompt = أنت مساعد ذكي لمتجر. رد بالعربية بشكل ودي ومختصر.\nالسياق:\n${context.chunks.map((c:any)=>c.content).join('\n---\n')}\nأجب بـ JSON: {"answer":"...","agent":"router","confidence":0.9,"should_escalate":false,"escalation_reason":null}
  const response = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }, ...history.slice(-6).map((m:any)=>({role:m.role,content:m.content})), { role: 'user', content: message }], response_format: { type: 'json_object' }, max_tokens: 500, temperature: 0.3 })
  const parsed = JSON.parse(response.choices[0].message.content || '{}')
  return { agent: 'router', answer: parsed.answer  'عذراً، لم أفهم سؤالك.', confidence: parsed.confidence  0, should_escalate: parsed.should_escalate || false, escalation_reason: parsed.escalation_reason, retrieved_chunks: context.chunks.map((c:any)=>c.content) }
}
