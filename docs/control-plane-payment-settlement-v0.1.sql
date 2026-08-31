-- Control Plane v0.1 — checkout correlation + verified payment settlement.
-- Apply only to isolated non-production Supabase branch until verified.

create unique index if not exists control_plane_payments_provider_reference_idx
  on control_plane.payments (provider, provider_reference)
  where provider_reference is not null;

create or replace function public.control_plane_link_checkout_reference(
  p_engagement_id uuid,
  p_payment_id text,
  p_provider_reference text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment control_plane.payments%rowtype;
begin
  if p_provider_reference is null or length(trim(p_provider_reference)) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_provider_reference');
  end if;

  select * into v_payment
  from control_plane.payments
  where payment_id = p_payment_id
    and engagement_id = p_engagement_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'payment_not_found');
  end if;

  if v_payment.provider_reference is not null then
    if v_payment.provider_reference = p_provider_reference then
      return jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'payment', jsonb_build_object(
          'paymentId', v_payment.payment_id,
          'organizationId', v_payment.organization_id::text,
          'engagementId', v_payment.engagement_id::text,
          'provider', v_payment.provider,
          'amountMinor', v_payment.amount_minor,
          'currency', v_payment.currency,
          'status', v_payment.status,
          'idempotencyKey', v_payment.idempotency_key,
          'providerReference', v_payment.provider_reference,
          'createdAt', v_payment.created_at,
          'paidAt', v_payment.paid_at
        )
      );
    end if;
    return jsonb_build_object('ok', false, 'reason', 'provider_reference_conflict');
  end if;

  begin
    update control_plane.payments
    set provider_reference = p_provider_reference
    where id = v_payment.id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'provider_reference_conflict');
  end;

  v_payment.provider_reference := p_provider_reference;
  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'payment', jsonb_build_object(
      'paymentId', v_payment.payment_id,
      'organizationId', v_payment.organization_id::text,
      'engagementId', v_payment.engagement_id::text,
      'provider', v_payment.provider,
      'amountMinor', v_payment.amount_minor,
      'currency', v_payment.currency,
      'status', v_payment.status,
      'idempotencyKey', v_payment.idempotency_key,
      'providerReference', v_payment.provider_reference,
      'createdAt', v_payment.created_at,
      'paidAt', v_payment.paid_at
    )
  );
end;
$$;

revoke execute on function public.control_plane_link_checkout_reference(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.control_plane_link_checkout_reference(uuid, text, text)
  to service_role;

create or replace function public.control_plane_settle_verified_payment(
  p_engagement_id uuid,
  p_expected_version bigint,
  p_payment_id text,
  p_verified jsonb,
  p_payment_event jsonb,
  p_entitlement_event jsonb,
  p_entitlement jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_engagement control_plane.engagements%rowtype;
  v_payment control_plane.payments%rowtype;
  v_payment_event_existing jsonb;
  v_entitlement_event_existing jsonb;
  v_entitlement_id uuid;
  v_final_state text;
begin
  select * into v_engagement
  from control_plane.engagements
  where id = p_engagement_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'engagement_not_found');
  end if;

  select * into v_payment
  from control_plane.payments
  where payment_id = p_payment_id
    and engagement_id = p_engagement_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'payment_not_found');
  end if;

  if p_verified is null
     or p_verified->>'providerReference' is null
     or p_verified->>'status' <> 'paid'
     or p_verified->>'occurredAt' is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_verified_payment');
  end if;

  -- Exact paid webhook retry succeeds before version comparison.
  if v_payment.status = 'paid' then
    if v_payment.provider_reference = p_verified->>'providerReference'
       and v_payment.amount_minor = (p_verified->>'amountMinor')::bigint
       and v_payment.currency = p_verified->>'currency'
       and v_payment.idempotency_key = p_verified->>'idempotencyKey' then
      return jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'version', v_engagement.version,
        'engagement', jsonb_build_object(
          'engagementId', v_engagement.id::text,
          'organizationId', v_engagement.organization_id::text,
          'product', v_engagement.product,
          'kind', v_engagement.kind,
          'state', v_engagement.state
        ),
        'payment', jsonb_build_object(
          'paymentId', v_payment.payment_id,
          'organizationId', v_payment.organization_id::text,
          'engagementId', v_payment.engagement_id::text,
          'provider', v_payment.provider,
          'amountMinor', v_payment.amount_minor,
          'currency', v_payment.currency,
          'status', v_payment.status,
          'idempotencyKey', v_payment.idempotency_key,
          'providerReference', v_payment.provider_reference,
          'createdAt', v_payment.created_at,
          'paidAt', v_payment.paid_at
        ),
        'entitlement', p_entitlement
      );
    end if;
    return jsonb_build_object('ok', false, 'reason', 'paid_payment_conflict');
  end if;

  if v_payment.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'payment_not_pending');
  end if;

  if v_engagement.version <> p_expected_version then
    return jsonb_build_object('ok', false, 'reason', 'version_conflict', 'currentVersion', v_engagement.version);
  end if;

  if v_engagement.state <> 'PAYMENT_PENDING' then
    return jsonb_build_object('ok', false, 'reason', 'engagement_not_payment_pending');
  end if;

  if v_payment.provider_reference is null
     or v_payment.provider_reference <> p_verified->>'providerReference' then
    return jsonb_build_object('ok', false, 'reason', 'provider_reference_mismatch');
  end if;

  if v_payment.organization_id::text <> p_verified->>'organizationId'
     or v_payment.engagement_id::text <> p_verified->>'engagementId' then
    return jsonb_build_object('ok', false, 'reason', 'payment_scope_mismatch');
  end if;

  if v_payment.amount_minor <> (p_verified->>'amountMinor')::bigint then
    return jsonb_build_object('ok', false, 'reason', 'amount_mismatch');
  end if;

  if v_payment.currency <> p_verified->>'currency' then
    return jsonb_build_object('ok', false, 'reason', 'currency_mismatch');
  end if;

  if v_payment.idempotency_key <> p_verified->>'idempotencyKey' then
    return jsonb_build_object('ok', false, 'reason', 'idempotency_key_mismatch');
  end if;

  if p_payment_event->>'type' <> 'PAYMENT_RECEIVED'
     or p_entitlement_event->>'type' <> 'ENTITLEMENT_GRANTED' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_settlement_events');
  end if;

  if p_payment_event->>'organizationId' <> v_engagement.organization_id::text
     or p_payment_event->>'engagementId' <> v_engagement.id::text
     or p_entitlement_event->>'organizationId' <> v_engagement.organization_id::text
     or p_entitlement_event->>'engagementId' <> v_engagement.id::text then
    return jsonb_build_object('ok', false, 'reason', 'event_scope_mismatch');
  end if;

  if p_entitlement is null
     or p_entitlement->>'organizationId' <> v_engagement.organization_id::text
     or p_entitlement->>'status' <> 'active'
     or p_entitlement->>'key' is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_entitlement');
  end if;

  select event_json into v_payment_event_existing
  from control_plane.events where event_id = p_payment_event->>'eventId';
  if found then
    return jsonb_build_object('ok', false, 'reason', 'event_id_conflict');
  end if;

  select event_json into v_entitlement_event_existing
  from control_plane.events where event_id = p_entitlement_event->>'eventId';
  if found then
    return jsonb_build_object('ok', false, 'reason', 'event_id_conflict');
  end if;

  v_final_state := case
    when v_engagement.kind = 'subscription' then 'SUBSCRIPTION_ACTIVE'
    when v_engagement.kind = 'nexus_lifecycle' then 'PILOT_READY'
    else null
  end;

  if v_final_state is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_engagement_kind');
  end if;

  insert into control_plane.events(event_id, type, organization_id, engagement_id, occurred_at, event_json)
  values (
    p_payment_event->>'eventId', 'PAYMENT_RECEIVED', v_engagement.organization_id, v_engagement.id,
    (p_payment_event->>'occurredAt')::timestamptz, p_payment_event
  );

  insert into control_plane.events(event_id, type, organization_id, engagement_id, occurred_at, event_json)
  values (
    p_entitlement_event->>'eventId', 'ENTITLEMENT_GRANTED', v_engagement.organization_id, v_engagement.id,
    (p_entitlement_event->>'occurredAt')::timestamptz, p_entitlement_event
  );

  select id into v_entitlement_id
  from control_plane.entitlements
  where organization_id = v_engagement.organization_id
    and key = p_entitlement->>'key'
    and status = 'active'
  for update;

  if found then
    update control_plane.entitlements
    set source = p_entitlement->>'source',
        starts_at = (p_entitlement->>'startsAt')::timestamptz,
        ends_at = nullif(p_entitlement->>'endsAt','')::timestamptz,
        updated_at = now()
    where id = v_entitlement_id;
  else
    insert into control_plane.entitlements(organization_id, key, status, source, starts_at, ends_at)
    values (
      v_engagement.organization_id,
      p_entitlement->>'key',
      'active',
      p_entitlement->>'source',
      (p_entitlement->>'startsAt')::timestamptz,
      nullif(p_entitlement->>'endsAt','')::timestamptz
    );
  end if;

  update control_plane.payments
  set status = 'paid',
      paid_at = (p_verified->>'occurredAt')::timestamptz
  where id = v_payment.id;

  update control_plane.engagements
  set state = v_final_state,
      version = version + 1,
      updated_at = now()
  where id = v_engagement.id;

  v_payment.status := 'paid';
  v_payment.paid_at := (p_verified->>'occurredAt')::timestamptz;

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'version', v_engagement.version + 1,
    'engagement', jsonb_build_object(
      'engagementId', v_engagement.id::text,
      'organizationId', v_engagement.organization_id::text,
      'product', v_engagement.product,
      'kind', v_engagement.kind,
      'state', v_final_state
    ),
    'payment', jsonb_build_object(
      'paymentId', v_payment.payment_id,
      'organizationId', v_payment.organization_id::text,
      'engagementId', v_payment.engagement_id::text,
      'provider', v_payment.provider,
      'amountMinor', v_payment.amount_minor,
      'currency', v_payment.currency,
      'status', 'paid',
      'idempotencyKey', v_payment.idempotency_key,
      'providerReference', v_payment.provider_reference,
      'createdAt', v_payment.created_at,
      'paidAt', v_payment.paid_at
    ),
    'entitlement', p_entitlement
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'event_or_entitlement_conflict');
end;
$$;

revoke execute on function public.control_plane_settle_verified_payment(uuid, bigint, text, jsonb, jsonb, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.control_plane_settle_verified_payment(uuid, bigint, text, jsonb, jsonb, jsonb, jsonb)
  to service_role;
