-- Control Plane payment-provider lookup v0.1
-- Enables a verified provider webhook to resolve its correlated internal payment.
-- Service-role only; no public/browser access.

create or replace function public.control_plane_find_payment_by_provider_reference(
  p_provider text,
  p_provider_reference text
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select case when p.id is null then null else jsonb_build_object(
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
  ) end
  from control_plane.payments p
  where p.provider = p_provider
    and p.provider_reference = p_provider_reference
  limit 1;
$$;

revoke execute on function public.control_plane_find_payment_by_provider_reference(text, text)
  from public, anon, authenticated;
grant execute on function public.control_plane_find_payment_by_provider_reference(text, text)
  to service_role;
