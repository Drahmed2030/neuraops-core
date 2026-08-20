-- NeuraOps — Fix: ensure demo-store exists
-- The dashboard's Chat/Report/Quality tabs hardcode storeId
-- 'demo-store', but no row with that slug was ever guaranteed to
-- exist. This caused /api/chat's conversation insert to fail its
-- foreign-key constraint silently, returning null.

INSERT INTO stores (name, slug, phone, type, status, plan, settings)
VALUES (
  'متجر تجريبي',
  'demo-store',
  '+966500000000',
  'retail',
  'pilot',
  'free_pilot',
  '{"default_language": "ar", "tone": "friendly"}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

SELECT 'demo-store ensured' as status, id, slug FROM stores WHERE slug = 'demo-store';
