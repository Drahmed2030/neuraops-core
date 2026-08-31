-- Control Plane v0.1 — keep payment bundle reads aligned with PaymentRecord.
-- Non-production first.

create or replace function public.control_plane_load_engagement_bundle(p_engagement_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'engagement', jsonb_build_object(
      'engagementId', e.id::text,
      'organizationId', e.organization_id::text,
      'product', e.product,
      'kind', e.kind,
      'state', e.state
    ),
    'events', coalesce((
      select jsonb_agg(ev.event_json order by ev.occurred_at)
      from control_plane.events ev
      where ev.engagement_id = e.id
    ), '[]'::jsonb),
    'entitlements', coalesce((
      select jsonb_agg(jsonb_build_object(
        'organizationId', en.organization_id::text,
        'key', en.key,
        'status', en.status,
        'source', en.source,
        'startsAt', en.starts_at,
        'endsAt', en.ends_at
      ) order by en.created_at)
      from control_plane.entitlements en
      where en.organization_id = e.organization_id
    ), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'paymentId', p.payment_id,
        'organizationId', p.organization_id::text,
        'engagementId', p.engagement_id::text,
        'provider', p.provider,
        'amountMinor', p.amount_minor,
        'currency', p.currency,
        'status', p.status,
        'idempotencyKey', p.idempotency_key,
        'providerReference', p.provider_reference,
        'createdAt', p.created_at,
        'paidAt', p.paid_at
      ) order by p.created_at)
      from control_plane.payments p
      where p.engagement_id = e.id
    ), '[]'::jsonb),
    'version', e.version
  )
  from control_plane.engagements e
  where e.id = p_engagement_id;
$$;

revoke execute on function public.control_plane_load_engagement_bundle(uuid)
  from public, anon, authenticated;
grant execute on function public.control_plane_load_engagement_bundle(uuid)
  to service_role;
