-- NeuraOps Control Plane v0.1 — persistence design only.
-- DO NOT apply to production from this file.
-- No PHI, patient identifiers, clinical records, credentials, or payment-card data.

create table organizations (
  id uuid primary key,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table engagements (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  product text not null check (product in ('nexus', 'cliniverse')),
  kind text not null check (kind in ('audit', 'review', 'pilot', 'subscription')),
  state text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table control_plane_events (
  id uuid primary key,
  event_id text not null unique,
  type text not null,
  organization_id uuid not null references organizations(id),
  engagement_id uuid references engagements(id),
  actor_type text not null check (actor_type in ('system', 'user', 'operator', 'integration')),
  actor_id text,
  occurred_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index control_plane_events_engagement_time_idx
  on control_plane_events (engagement_id, occurred_at);

create table entitlements (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  key text not null,
  status text not null check (status in ('active', 'revoked', 'expired')),
  source text not null check (source in ('manual', 'pilot', 'subscription', 'payment')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index entitlements_one_active_key_per_org_idx
  on entitlements (organization_id, key)
  where status = 'active';

create table payments (
  id uuid primary key,
  payment_id text not null unique,
  organization_id uuid not null references organizations(id),
  engagement_id uuid not null references engagements(id),
  provider text not null check (provider in ('manual', 'apple', 'web_gateway')),
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null,
  status text not null check (status in ('not_required', 'pending', 'paid', 'failed', 'refunded')),
  provider_reference text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Future migration must add RLS/policies before any production use.
-- Payment-provider payloads should be normalized at the adapter boundary;
-- raw card/payment secrets must never be stored here.
