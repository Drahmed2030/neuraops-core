-- NeuraOps Core — Database Schema
-- Run this in Supabase SQL Editor

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ═══════════════════════════════════
-- STORES
-- ═══════════════════════════════════
CREATE TABLE IF NOT EXISTS stores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  owner_name  text,
  phone       text,
  email       text,
  type        text DEFAULT 'retail' CHECK (type IN ('cafe','restaurant','retail','other')),
  status      text DEFAULT 'pilot' CHECK (status IN ('pilot','active','paused','cancelled')),
  plan        text DEFAULT 'free_pilot' CHECK (plan IN ('free_pilot','starter','pro','custom')),
  settings    jsonb DEFAULT '{
    "default_language": "ar",
    "tone": "friendly",
    "working_hours": {},
    "sla": {
      "critical": {"first_response": 2, "resolution": 30},
      "high":     {"first_response": 5, "resolution": 120},
      "medium":   {"first_response": 15,"resolution": 480},
      "low":      {"first_response": 60,"resolution": 1440}
    },
    "auto_messages": {
      "escalation_during_hours": "عزيزي {{customer_name}}، تم تصعيد طلبك {{order_id}} لفريق الدعم. سنرد قريباً.",
      "outside_hours": "شكراً لتواصلك. نحن خارج أوقات العمل. سنرد في أقرب وقت.",
      "sla_breach": "نعتذر عن التأخير. نعمل على حل طلبك {{order_id}} فوراً."
    }
  }'::jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_stores" ON stores FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ═══════════════════════════════════
-- KNOWLEDGE CHUNKS (RAG)
-- ═══════════════════════════════════
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id          bigserial PRIMARY KEY,
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  content     text NOT NULL,
  embedding   vector(1536),
  category    text DEFAULT 'general' CHECK (category IN ('shipping','returns','products','menu','hours','general')),
  language    text DEFAULT 'ar' CHECK (language IN ('ar','en')),
  metadata    jsonb DEFAULT '{}',
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_chunks_store_idx ON knowledge_chunks(store_id);
CREATE INDEX IF NOT EXISTS knowledge_chunks_hnsw ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);

ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_chunks" ON knowledge_chunks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Match documents function (RAG search)
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  p_store_id uuid,
  match_count int DEFAULT 5,
  match_threshold float DEFAULT 0.7
)
RETURNS TABLE (
  id bigint,
  content text,
  category text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.content,
    kc.category,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE kc.store_id = p_store_id
    AND kc.is_active = true
    AND kc.embedding IS NOT NULL
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ═══════════════════════════════════
-- CONVERSATIONS
-- ═══════════════════════════════════
CREATE TABLE IF NOT EXISTS conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  session_id  text NOT NULL,
  channel     text DEFAULT 'web' CHECK (channel IN ('whatsapp','instagram','web','demo')),
  status      text DEFAULT 'open' CHECK (status IN ('open','escalated','closed')),
  metadata    jsonb DEFAULT '{}',
  started_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_conversations" ON conversations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ═══════════════════════════════════
-- MESSAGES
-- ═══════════════════════════════════
CREATE TABLE IF NOT EXISTS messages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role              text NOT NULL CHECK (role IN ('user','assistant','human')),
  content           text NOT NULL,
  agent_used        text,
  confidence        float,
  retrieved_chunks  jsonb DEFAULT '[]',
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_messages" ON messages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ═══════════════════════════════════
-- ESCALATIONS
-- ═══════════════════════════════════
CREATE TABLE IF NOT EXISTS escalations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  store_id          uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  reason            text NOT NULL,
  priority          text DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  confidence_score  float DEFAULT 0,
  status            text DEFAULT 'pending' CHECK (status IN ('pending','in_progress','resolved','closed')),
  assigned_to       text,
  context           jsonb DEFAULT '{}',
  sla_deadline      timestamptz,
  created_at        timestamptz DEFAULT now(),
  resolved_at       timestamptz
);

ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_escalations" ON escalations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ═══════════════════════════════════
-- AGENTS CONFIG
-- ═══════════════════════════════════
CREATE TABLE IF NOT EXISTS agents_config (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  agent_name    text NOT NULL,
  system_prompt text,
  is_active     boolean DEFAULT true,
  settings      jsonb DEFAULT '{}',
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE agents_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_agents" ON agents_config FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ═══════════════════════════════════
-- SEED: Demo Store
-- ═══════════════════════════════════
INSERT INTO stores (name, slug, owner_name, phone, type, status, plan)
VALUES ('قهوة الأصالة - تجريبي', 'demo-store', 'دكتور أحمد', '+966500000000', 'cafe', 'pilot', 'free_pilot')
ON CONFLICT (slug) DO NOTHING;

-- Seed demo knowledge chunks (without embeddings — will be added via API)
INSERT INTO knowledge_chunks (store_id, content, category, language)
SELECT
  s.id,
  chunk.content,
  chunk.category,
  'ar'
FROM stores s,
  (VALUES
    ('أوقات عمل المقهى: من الساعة 8 صباحاً حتى 11 مساءً يومياً بما فيها الجمعة والسبت.', 'hours'),
    ('طريقة الإرجاع: يمكن إرجاع المنتج خلال 7 أيام من الاستلام بشرط أن يكون بحالته الأصلية مع الفاتورة.', 'returns'),
    ('التوصيل متاح داخل المدينة. رسوم التوصيل 15 ريال. الوقت المتوقع 30-60 دقيقة.', 'shipping'),
    ('طرق الدفع المتاحة: مدى، فيزا، ماستركارد، Apple Pay، والدفع عند الاستلام.', 'general'),
    ('العنوان: حي الملك فهد، شارع الأمير محمد. يمكن التواصل على واتساب 0500000000.', 'hours')
  ) AS chunk(content, category)
WHERE s.slug = 'demo-store'
ON CONFLICT DO NOTHING;

SELECT 'Schema created successfully!' as status;
