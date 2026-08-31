-- Control Plane v0.1 — atomic payment intent persistence.
-- Non-production first. No card data or raw provider webhook payloads.

alter table control_plane.payments
  add column if not exists idempotency_key text;

create unique index if not exists control_plane_payments_idempotency_key_idx
  on control_plane.payments (idempotency_key)
  where idempotency_key is not null;

create or replace function public.control_plane_create_payment_intent(
  p_engagement_id uuid,
  p_expected_version bigint,
  p_event jsonb,
  p_next_state text,
  p_payment jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_engagement control_plane.engagements%rowtype;
  v_existing_event jsonb;
  v_existing_payment control_plane.payments%rowtype;
  v_event_id text;
  v_event_org uuid;
  v_event_engagement uuid;
  v_payment_org uuid;
  v_payment_engagement uuid;
  v_payment_id text;
  v_idempotency_key text;
  v_provider text;
  v_amount bigint;
  v_currency text;
  v_created_at timestamptz;
begin
  if p_event is null or p_payment is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_payment_intent');
  end if;

  select * into v_engagement
  from control_plane.engagements
  where id = p_engagement_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'engagement_not_found');
  end if;

  v_event_id := p_event->>'eventId';
  v_payment_id := p_payment->>'paymentId';
  v_idempotency_key := p_payment->>'idempotencyKey';
  v_provider := p_payment->>'provider';
  v_currency := p_payment->>'currency';

  if v_event_id is null or v_payment_id is null or v_idempotency_key is null or length(v_idempotency_key) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_payment_intent');
  end if;

  select event_json into v_existing_event
  from control_plane.events
  where event_id = v_event_id;

  select * into v_existing_payment
  from control_plane.payments
  where payment_id = v_payment_id
     or idempotency_key = v_idempotency_key
  limit 1;

  if v_existing_event is not null or v_existing_payment.id is not null then
    if v_existing_event = p_event
       and v_existing_payment.payment_id = v_payment_id
       and v_existing_payment.organization_id::text = p_payment->>'organizationId'
       and v_existing_payment.engagement_id::text = p_payment->>'engagementId'
       and v_existing_payment.provider = v_provider
       and v_existing_payment.amount_minor = (p_payment->>'amountMinor')::bigint
       and v_existing_payment.currency = v_currency
       and v_existing_payment.status = 'pending'
       and v_existing_payment.idempotency_key = v_idempotency_key then
      return jsonb_build_object(
        'ok', true,
        'version', v_engagement.version,
        'duplicate', true,
        'payment', jsonb_build_object(
          'paymentId', v_existing_payment.payment_id,
          'organizationId', v_existing_payment.organization_id::text,
          'engagementId', v_existing_payment.engagement_id::text,
          'provider', v_existing_payment.provider,
          'amountMinor', v_existing_payment.amount_minor,
          'currency', v_existing_payment.currency,
          'status', v_existing_payment.status,
          'idempotencyKey', v_existing_payment.idempotency_key,
          'providerReference', v_existing_payment.provider_reference,
          'createdAt', v_existing_payment.created_at,
          'paidAt', v_existing_payment.paid_at
        )
      );
    end if;
    return jsonb_build_object('ok', false, 'reason', 'payment_intent_conflict');
  end if;

  if v_engagement.version <> p_expected_version then
    return jsonb_build_object(
      'ok', false,
      'reason', 'version_conflict',
      'currentVersion', v_engagement.version
    );
  end if;

  begin
    v_event_org := (p_event->>'organizationId')::uuid;
    v_event_engagement := (p_event->>'engagementId')::uuid;
    v_payment_org := (p_payment->>'organizationId')::uuid;
    v_payment_engagement := (p_payment->>'engagementId')::uuid;
    v_amount := (p_payment->>'amountMinor')::bigint;
    v_created_at := (p_payment->>'createdAt')::timestamptz;
  exception when others then
    return jsonb_build_object('ok', false, 'reason', 'invalid_payment_intent');
  end;

  if v_event_org <> v_engagement.organization_id
     or v_event_engagement <> v_engagement.id
     or v_payment_org <> v_engagement.organization_id
     or v_payment_engagement <> v_engagement.id then
    return jsonb_build_object('ok', false, 'reason', 'payment_scope_mismatch');
  end if;

  if p_event->>'type' <> 'PAYMENT_REQUESTED'
     or p_payment->>'status' <> 'pending'
     or v_provider not in ('manual', 'apple', 'web_gateway')
     or v_amount < 0
     or v_currency is null
     or length(v_currency) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_payment_intent');
  end if;

  insert into control_plane.events (
    event_id, type, organization_id, engagement_id, occurred_at, event_json
  ) values (
    v_event_id,
    'PAYMENT_REQUESTED',
    v_event_org,
    v_event_engagement,
    (p_event->>'occurredAt')::timestamptz,
    p_event
  );

  insert into control_plane.payments (
    payment_id, organization_id, engagement_id, provider,
    amount_minor, currency, status, idempotency_key, created_at
  ) values (
    v_payment_id, v_payment_org, v_payment_engagement, v_provider,
    v_amount, v_currency, 'pending', v_idempotency_key, v_created_at
  );

  update control_plane.engagements
  set state = p_next_state,
      version = version + 1,
      updated_at = now()
  where id = p_engagement_id;

  return jsonb_build_object(
    'ok', true,
    'version', v_engagement.version + 1,
    'duplicate', false,
    'payment', p_payment
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'payment_intent_conflict');
end;
$$;

revoke execute on function public.control_plane_create_payment_intent(uuid, bigint, jsonb, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.control_plane_create_payment_intent(uuid, bigint, jsonb, text, jsonb)
  to service_role;
