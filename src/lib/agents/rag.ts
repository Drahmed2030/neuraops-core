import OpenAI from 'openai'
import { createServerClient } from '@/lib/supabase/server'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
export async function retrieveContext(query: string, storeId: string) {
  try {
    const supabase = createServerClient()
    const embeddingResponse = await openai.embeddings.create({ model: 'text-embedding-3-small', input: query })
    const embedding = embeddingResponse.data[0].embedding
    const { data: chunks } = await supabase.rpc('match_documents', { query_embedding: embedding, p_store_id: storeId, match_count: 5, match_threshold: 0.6 })
    return { chunks: chunks || [] }
  } catch { return { chunks: [] } }
}
