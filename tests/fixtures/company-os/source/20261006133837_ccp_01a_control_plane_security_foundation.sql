
create schema if not exists neuraops_company;

revoke all on schema neuraops_company from public;
revoke all on schema neuraops_company from anon;
revoke all on schema neuraops_company from authenticated;
revoke all on schema neuraops_company from service_role;

alter table public.agent_tasks
  add column if not exists risk_level smallint not null default 2,
  add column if not exists action_class text not null default 'UNCLASSIFIED',
  add column if not exists data_class text not null default 'INTERNAL',
  add column if not exists external_action_allowed boolean not null default false,
  add column if not exists correlation_id uuid not null default gen_random_uuid(),
  add column if not exists idempotency_key text,
  add column if not exists expires_at timestamptz,
  add column if not exists model_route jsonb not null default '{}'::jsonb,
  add column if not exists budget_limit_usd numeric(12,4),
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by_reference text,
  add column if not exists approval_reason text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='agent_tasks_risk_level_check' and conrelid='public.agent_tasks'::regclass) then
    alter table public.agent_tasks add constraint agent_tasks_risk_level_check check (risk_level between 0 and 3);
  end if;
  if not exists (select 1 from pg_constraint where conname='agent_tasks_budget_limit_check' and conrelid='public.agent_tasks'::regclass) then
    alter table public.agent_tasks add constraint agent_tasks_budget_limit_check check (budget_limit_usd is null or budget_limit_usd >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname='agent_tasks_data_class_check' and conrelid='public.agent_tasks'::regclass) then
    alter table public.agent_tasks add constraint agent_tasks_data_class_check check (data_class in ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED'));
  end if;
end $$;

create unique index if not exists agent_tasks_idempotency_key_uidx
  on public.agent_tasks(idempotency_key)
  where idempotency_key is not null;

create table if not exists neuraops_company.agent_authority_profiles (
  agent_id uuid primary key references public.system_agents(id) on delete restrict,
  policy_version integer not null default 1 check (policy_version > 0),
  max_autonomous_risk smallint not null default 0 check (max_autonomous_risk between 0 and 1),
  allowed_action_classes text[] not null default '{}'::text[],
  external_actions_allowed boolean not null default false,
  financial_actions_allowed boolean not null default false,
  legal_commitments_allowed boolean not null default false,
  production_actions_allowed boolean not null default false,
  security_mutations_allowed boolean not null default false,
  database_mutations_allowed boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table neuraops_company.agent_authority_profiles enable row level security;

insert into neuraops_company.agent_authority_profiles
  (agent_id,max_autonomous_risk,allowed_action_classes)
select id,
       case when agent_name='MedPulse-Scout' then 0 else 1 end,
       case agent_name
         when 'Neura-PM' then array['RESEARCH','INTERNAL_CREATE','ORCHESTRATE','REVIEW']
         when 'Neura-QA' then array['RESEARCH','REVIEW','ASSURANCE']
         when 'Neura-CMO' then array['RESEARCH','INTERNAL_CREATE']
         when 'MedPulse-Scout' then array['RESEARCH']
         when 'MedPulse-Creator' then array['RESEARCH','INTERNAL_CREATE']
         when 'MedPulse-Sales' then array['RESEARCH','INTERNAL_CREATE']
         else array['RESEARCH']
       end
from public.system_agents
where agent_name in ('Neura-PM','Neura-QA','Neura-CMO','MedPulse-Scout','MedPulse-Creator','MedPulse-Sales')
on conflict (agent_id) do nothing;

create table if not exists neuraops_company.task_approvals (
  approval_id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.agent_tasks(id) on delete restrict,
  approval_level smallint not null check (approval_level between 2 and 3),
  decision text not null check (decision in ('APPROVE','REJECT','REVOKE')),
  approved_by_reference text not null,
  reason text,
  decided_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb
);

alter table neuraops_company.task_approvals enable row level security;

create table if not exists neuraops_company.agent_task_events (
  event_id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.agent_tasks(id) on delete restrict,
  agent_id uuid references public.system_agents(id) on delete restrict,
  event_type text not null,
  correlation_id uuid not null,
  occurred_at timestamptz not null default now(),
  input_digest text,
  output_digest text,
  model_provider text,
  model_name text,
  token_usage jsonb not null default '{}'::jsonb,
  estimated_cost_usd numeric(12,6) check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  approval_reference uuid references neuraops_company.task_approvals(approval_id) on delete restrict,
  evidence jsonb not null default '{}'::jsonb
);

alter table neuraops_company.agent_task_events enable row level security;
create index if not exists agent_task_events_task_time_idx on neuraops_company.agent_task_events(task_id,occurred_at);
create index if not exists agent_task_events_correlation_idx on neuraops_company.agent_task_events(correlation_id);

create table if not exists neuraops_company.product_reality_facts (
  fact_id uuid primary key default gen_random_uuid(),
  fact_key text not null,
  product_key text not null,
  evidence_level text not null check (evidence_level in ('DESIGN','IMPLEMENTED','TESTED','DB_PROVEN','PRODUCTION_PROVEN')),
  fact_value jsonb not null,
  evidence_reference text,
  approved_by_reference text not null,
  effective_at timestamptz not null default now(),
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  check (superseded_at is null or superseded_at >= effective_at)
);

alter table neuraops_company.product_reality_facts enable row level security;
create unique index if not exists product_reality_active_fact_uidx
  on neuraops_company.product_reality_facts(product_key,fact_key)
  where superseded_at is null;

create or replace function neuraops_company.prevent_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  raise exception 'company_agent_event_immutable';
end;
$$;

drop trigger if exists agent_task_events_no_update on neuraops_company.agent_task_events;
create trigger agent_task_events_no_update
before update or delete on neuraops_company.agent_task_events
for each row execute function neuraops_company.prevent_event_mutation();

revoke all on all tables in schema neuraops_company from public, anon, authenticated, service_role;
revoke all on all sequences in schema neuraops_company from public, anon, authenticated, service_role;
revoke all on all functions in schema neuraops_company from public, anon, authenticated, service_role;

alter default privileges in schema neuraops_company revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema neuraops_company revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges in schema neuraops_company revoke all on functions from public, anon, authenticated, service_role;

