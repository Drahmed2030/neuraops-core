import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase/server'
import { callWithTimeoutAndRetry } from '@/lib/reliability/ai.mjs'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0 })

export async function retrieveContext(query: string, storeId: string, category?: string) {
  try {
    const supabase = createServerClient()
    const embeddingResponse = await callWithTimeoutAndRetry(
      (signal: AbortSignal) => openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      }, { signal }),
      { timeoutMs: 8_000, retries: 1 }
    )

    const embedding = embeddingResponse.data[0]?.embedding
    if (!embedding) {
      console.error('RAG embedding response missing embedding')
      return { chunks: [], degraded: true }
    }

    const { data: chunks, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      p_store_id: storeId,
      match_count: 5,
      match_threshold: 0.6,
    })

    if (error) {
      console.error('RAG error:', error)
      return { chunks: [], degraded: true }
    }

    let results = chunks || []
    if (category && results.length > 0) {
      const matching = results.filter((c: any) => c.category === category)
      if (matching.length > 0) results = matching
    }

    return { chunks: results, degraded: false }
  } catch (err) {
    console.error('RAG exception:', err)
    return { chunks: [], degraded: true }
  }
}
