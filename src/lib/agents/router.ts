import OpenAI from 'openai'
import { retrieveContext } from './rag'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
export async function routerAgent(message: string, storeId: string, history: {role:string,content:string}[]) {
  const context = await retrieveContext(message, storeId)
  const sys = أنت مساعد ذكي. رد بالعربية.\nالسياق:\n${context.chunks.map((c:any)=>c.content).join('\n')}\nأجب بـ JSON: {"answer":"...","confidence":0.9,"should_escalate":false,"escalation_reason":null}
  const res = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role:'system', content:sys }, ...history.slice(-4).map((m:any)=>({role:m.role as 'user'|'assistant', content:m.content})), { role:'user', content:message }], response_format:{ type:'json_object' }, max_tokens:500 })
  const p = JSON.parse(res.choices[0].message.content || '{}')
  return { agent:'router', answer: p.answer || 'عذراً، لم أفهم سؤالك.', confidence: p.confidence||0, should_escalate: p.should_escalate||false, escalation_reason: p.escalation_reason, retrieved_chunks: context.chunks.map((c:any)=>c.content) }
}
