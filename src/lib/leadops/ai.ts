import OpenAI from 'openai'
import { callWithTimeoutAndRetry } from '@/lib/reliability/ai.mjs'
import { parseLeadAiResponse } from './qualification.mjs'

let openaiClient: OpenAI | null = null

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

export async function generateLeadResponse(input: {
  need: string | null
  budgetBand: string
  urgency: string
  decisionAuthority: string
  score: number
}) {
  try {
    const openai = getOpenAIClient()
    const response = await callWithTimeoutAndRetry(
      (signal: AbortSignal) => openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You assist with inbound lead qualification. Be concise, professional, and never invent guarantees. Return JSON only: {"answer":"...","confidence":0.0}.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              need: input.need,
              budget_band: input.budgetBand,
              urgency: input.urgency,
              decision_authority: input.decisionAuthority,
              deterministic_score: input.score,
            }),
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 220,
        temperature: 0.2,
      }, { signal }),
      { timeoutMs: 8000, retries: 1 }
    )

    return parseLeadAiResponse(response.choices[0]?.message?.content || '')
  } catch (error) {
    console.error('[leadops] AI response fallback:', error)
    return {
      answer: 'Thanks — your request has been captured. A human will review the details and follow up where needed.',
      confidence: 0,
    }
  }
}
