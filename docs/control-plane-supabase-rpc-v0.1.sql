-- NeuraOps Control Plane v0.1 — Supabase/Postgres design ONLY.
-- DO NOT apply to production from this file.
-- Intended first target: a paid Supabase development branch or other isolated non-production DB.
-- No PHI, patient identifiers, clinical records, credentials, raw payment webhooks, or card data.

create schema if not exists control_plane;
revoke all on schema control_plane from public, anon, authenticated;
grant usage on schema control_plane to service_role;

create table control_plane.organizations (
  id uuid primary key,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table control_plane.engagements (
  id uuid primary key,
  organization_id uuid not null references control_plane.organizations(id),
  product text not null check (product in ('nexus', 'cliniverse')),
  kind text not null check (kind in ('audit', 'review', 'pilot', 'subscription')),
  state text not null,
  version bigint not null default 0 check (version >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table control_plane.events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  type text not null,
  organization_id uuid not null references control_plane.organizations(id),
  engagement_id uuid not null references control_plane.engagements(id),
  occurred_at timestamptz not null,
  event_json jsonb not null,
  created_at timestamptz not null default now()
);

create index control_plane_events_engagement_time_idx
  on control_plane.events (engagement_id, occurred_at);

create table control_plane.entitlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references control_plane.organizations(id),
  key text not null,
  status text not null check (status in ('active', 'revoked', 'expired')),
  source text not null check (source in ('manual', 'pilot', 'subscription', 'payment')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index control_plane_entitlements_one_active_key_per_org_idx
  on control_plane.entitlements (organization_id, key)
  where status = 'active';

create table control_plane.payments (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null unique,
  organization_id uuid not null references control_plane.organizations(id),
  engagement_id uuid not null references control_plane.engagements(id),
  provider text not null check (provider in ('manual', 'apple', 'web_gateway')),
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null,
  status text not null check (status in ('not_required', 'pending', 'paid', 'failed', 'refunded')),
  provider_reference text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Defense in depth. These tables are in a private schema and have no end-user policies.
alter table control_plane.organizations enable row level security;
alter table control_plane.engagements enable row level security;
alter table control_plane.events enable row level security;
alter table control_plane.entitlements enable row level security;
alter table control_plane.payments enable row level security;

revoke all on all tables in schema control_plane from public, anon, authenticated;
grant select, insert, update on all tables in schema control_plane to service_role;

-- Read bundle through one restricted RPC so application code does not scatter privileged table reads.
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

revoke execute on function public.control_plane_load_engagement_bundle(uuid) from public, anon, authenticated;
grant execute on function public.control_plane_load_engagement_bundle(uuid) to service_role;

-- Atomic writer. Domain transition validation remains in application code; this function
-- enforces scope, idempotency, optimistic concurrency, and all-or-nothing persistence.
create or replace function public.control_plane_commit_lifecycle(
  p_engagement_id uuid,
  p_expected_version bigint,
  p_event jsonb,
  p_next_state text,
  p_entitlement jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_engagement control_plane.engagements%rowtype;
  v_existing_event jsonb;
  v_event_id text;
  v_event_org uuid;
  v_event_engagement uuid;
  v_entitlement_org uuid;
  v_active_entitlement_id uuid;
begin
  if p_event is null or p_event->>'eventId' is null or p_event->>'type' is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_event');
  end if;

  -- Serialize all writes for this engagement.
  select * into v_engagement
  from control_plane.engagements
  where id = p_engagement_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'engagement_not_found');
  end if;

  v_event_id := p_event->>'eventId';

  -- Lost-response retry safety: exact duplicate wins before version comparison.
  select event_json into v_existing_event
  from control_plane.events
  where event_id = v_event_id;

  if found then
    if v_existing_event = p_event then
      return jsonb_build_object('ok', true, 'version', v_engagement.version, 'duplicate', true);
    end if;
    return jsonb_build_object('ok', false, 'reason', 'event_id_conflict');
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
  exception when others then
    return jsonb_build_object('ok', false, 'reason', 'invalid_event_scope');
  end;

  if v_event_org <> v_engagement.organization_id or v_event_engagement <> v_engagement.id then
    return jsonb_build_object('ok', false, 'reason', 'event_scope_mismatch');
  end if;

  insert into control_plane.events (
    event_id, type, organization_id, engagement_id, occurred_at, event_json
  ) values (
    v_event_id,
    p_event->>'type',
    v_event_org,
    v_event_engagement,
    (p_event->>'occurredAt')::timestamptz,
    p_event
  );

  if p_entitlement is not null then
    begin
      v_entitlement_org := (p_entitlement->>'organizationId')::uuid;
    exception when others then
      raise exception 'invalid_entitlement_scope';
    end;

    if v_entitlement_org <> v_engagement.organization_id then
      raise exception 'entitlement_scope_mismatch';
    end if;

    if p_entitlement->>'status' <> 'active' then
      raise exception 'invalid_entitlement_status';
    end if;

    select id into v_active_entitlement_id
    from control_plane.entitlements
    where organization_id = v_entitlement_org
      and key = p_entitlement->>'key'
      and status = 'active'
    for update;

    if found then
      update control_plane.entitlements
      set source = p_entitlement->>'source',
          starts_at = (p_entitlement->>'startsAt')::timestamptz,
          ends_at = nullif(p_entitlement->>'endsAt', '')::timestamptz,
          updated_at = now()
      where id = v_active_entitlement_id;
    else
      insert into control_plane.entitlements (
        organization_id, key, status, source, starts_at, ends_at
      ) values (
        v_entitlement_org,
        p_entitlement->>'key',
        'active',
        p_entitlement->>'source',
        (p_entitlement->>'startsAt')::timestamptz,
        nullif(p_entitlement->>'endsAt', '')::timestamptz
      );
    end if;
  end if;

  update control_plane.engagements
  set state = p_next_state,
      version = version + 1,
      updated_at = now()
  where id = p_engagement_id;

  return jsonb_build_object(
    'ok', true,
    'version', v_engagement.version + 1,
    'duplicate', false
  );
exception
  when unique_violation then
    -- A globally reused event id is never silently accepted.
    return jsonb_build_object('ok', false, 'reason', 'event_id_conflict');
  when others then
    raise;
end;
$$;

revoke execute on function public.control_plane_commit_lifecycle(uuid, bigint, jsonb, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.control_plane_commit_lifecycle(uuid, bigint, jsonb, text, jsonb)
  to service_role;

-- Before any application to a database:
-- 1. Apply only to an isolated non-production branch/project.
-- 2. Run Supabase security + performance advisors.
-- 3. Test duplicate retry, event conflict, stale-version race, and entitlement rollback.
-- 4. Generate a clean migration only after verification.
