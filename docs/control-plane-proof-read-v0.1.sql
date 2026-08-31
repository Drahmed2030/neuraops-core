-- Restricted read RPC for pilot proof measurements.

create or replace function public.control_plane_load_pilot_measurements(p_engagement_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'engagementId', pm.engagement_id::text,
    'organizationId', pm.organization_id::text,
    'stage', pm.stage,
    'recordedAt', pm.recorded_at,
    'metrics', pm.metrics
  ) order by case pm.stage when 'baseline' then 1 when 'checkpoint' then 2 else 3 end), '[]'::jsonb)
  from control_plane.pilot_measurements pm
  where pm.engagement_id = p_engagement_id;
$$;

revoke execute on function public.control_plane_load_pilot_measurements(uuid)
  from public, anon, authenticated;
grant execute on function public.control_plane_load_pilot_measurements(uuid)
  to service_role;
