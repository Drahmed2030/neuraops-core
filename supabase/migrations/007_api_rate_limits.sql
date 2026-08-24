-- NeuraOps P0 Phase 2 — persistent API rate limiting
-- Mirrors the production migration already applied in Supabase.

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0)
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_count integer;
BEGIN
  IF p_key IS NULL OR length(p_key) = 0 OR p_limit < 1 OR p_window_seconds < 1 THEN
    RETURN false;
  END IF;

  INSERT INTO public.api_rate_limits AS r (key, window_start, count)
  VALUES (p_key, v_now, 1)
  ON CONFLICT (key) DO UPDATE
  SET
    window_start = CASE
      WHEN r.window_start <= v_now - make_interval(secs => p_window_seconds) THEN v_now
      ELSE r.window_start
    END,
    count = CASE
      WHEN r.window_start <= v_now - make_interval(secs => p_window_seconds) THEN 1
      ELSE r.count + 1
    END
  RETURNING count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

REVOKE ALL ON TABLE public.api_rate_limits FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.api_rate_limits TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer)
  TO service_role;
