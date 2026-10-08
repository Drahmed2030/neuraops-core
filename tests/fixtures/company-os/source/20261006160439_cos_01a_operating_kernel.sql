
alter table public.agent_tasks
  add column if not exists lifecycle_state text not null default 'LEGACY_PENDING',
  add column if not exists parent_task_id uuid references public.agent_tasks(id) on delete restrict,
  add column if not exists requested_by_reference text,
  add column if not exists qa_required boolean not null default true,
  add column if not exists qa_state text not null default 'NOT_REVIEWED',
  add column if not exists execution_mode text not null default 'NONE',
  add column if not exists completed_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='agent_tasks_lifecycle_state_check' and conrelid='public.agent_tasks'::regclass) then
    alter table public.agent_tasks add constraint agent_tasks_lifecycle_state_check
      check (lifecycle_state in ('LEGACY_PENDING','DRAFT','READY','WAITING_APPROVAL','APPROVED','EXECUTING','QA_REVIEW','COMPLETED','HELD','REJECTED','CANCELLED','EXPIRED'));
  end if;
  if not exists (select 1 from pg_constraint where conname='agent_tasks_qa_state_check' and conrelid='public.agent_tasks'::regclass) then
    alter table public.agent_tasks add constraint agent_tasks_qa_state_check
      check (qa_state in ('NOT_REVIEWED','PASS','HOLD','ESCALATE','FAIL'));
  end if;
  if not exists (select 1 from pg_constraint where conname='agent_tasks_execution_mode_check' and conrelid='public.agent_tasks'::regclass) then
    alter table public.agent_tasks add constraint agent_tasks_execution_mode_check
      check (execution_mode in ('NONE','INTERNAL','MODEL_ROUTED','HUMAN'));
  end if;
  if not exists (select 1 from pg_constraint where conname='agent_tasks_no_self_parent_check' and conrelid='public.agent_tasks'::regclass) then
    alter table public.agent_tasks add constraint agent_tasks_no_self_parent_check
      check (parent_task_id is null or parent_task_id <> id);
  end if;
end $$;

create index if not exists agent_tasks_parent_idx on public.agent_tasks(parent_task_id);
create index if not exists agent_tasks_lifecycle_idx on public.agent_tasks(lifecycle_state,created_at);

create table if not exists neuraops_company.execution_envelopes (
  envelope_id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique references public.agent_tasks(id) on delete restrict,
  agent_id uuid not null references public.system_agents(id) on delete restrict,
  policy_version integer not null check (policy_version > 0),
  risk_level smallint not null check (risk_level between 0 and 3),
  action_class text not null,
  data_class text not null check (data_class in ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
  permitted_tools text[] not null default '{}'::text[],
  external_action_allowed boolean not null default false,
  model_provider_allowlist text[] not null default '{}'::text[],
  model_budget_usd numeric(12,4) check (model_budget_usd is null or model_budget_usd >= 0),
  input_fingerprint text not null,
  idempotency_key text not null,
  correlation_id uuid not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);
alter table neuraops_company.execution_envelopes enable row level security;
create unique index if not exists execution_envelopes_idempotency_uidx
  on neuraops_company.execution_envelopes(idempotency_key);

create table if not exists neuraops_company.qa_reviews (
  review_id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.agent_tasks(id) on delete restrict,
  reviewer_agent_id uuid not null references public.system_agents(id) on delete restrict,
  decision text not null check (decision in ('PASS','HOLD','ESCALATE','FAIL')),
  policy_version integer not null check (policy_version > 0),
  evidence jsonb not null default '{}'::jsonb,
  reviewed_at timestamptz not null default now()
);
alter table neuraops_company.qa_reviews enable row level security;
create index if not exists qa_reviews_task_time_idx on neuraops_company.qa_reviews(task_id,reviewed_at);

create table if not exists neuraops_company.model_usage_events (
  usage_id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.agent_tasks(id) on delete restrict,
  envelope_id uuid not null references neuraops_company.execution_envelopes(envelope_id) on delete restrict,
  provider text not null,
  model text not null,
  input_tokens bigint check (input_tokens is null or input_tokens >= 0),
  output_tokens bigint check (output_tokens is null or output_tokens >= 0),
  estimated_cost_usd numeric(12,6) check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  provider_request_reference text,
  occurred_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb
);
alter table neuraops_company.model_usage_events enable row level security;
create index if not exists model_usage_task_time_idx on neuraops_company.model_usage_events(task_id,occurred_at);

create or replace function neuraops_company.prevent_operating_evidence_mutation()
returns trigger language plpgsql security invoker set search_path=pg_catalog
as $$ begin raise exception 'company_operating_evidence_immutable'; end $$;

drop trigger if exists execution_envelopes_no_update on neuraops_company.execution_envelopes;
create trigger execution_envelopes_no_update before update or delete
on neuraops_company.execution_envelopes for each row
execute function neuraops_company.prevent_operating_evidence_mutation();

drop trigger if exists qa_reviews_no_update on neuraops_company.qa_reviews;
create trigger qa_reviews_no_update before update or delete
on neuraops_company.qa_reviews for each row
execute function neuraops_company.prevent_operating_evidence_mutation();

drop trigger if exists model_usage_events_no_update on neuraops_company.model_usage_events;
create trigger model_usage_events_no_update before update or delete
on neuraops_company.model_usage_events for each row
execute function neuraops_company.prevent_operating_evidence_mutation();

create policy cos_execution_envelopes_explicit_deny on neuraops_company.execution_envelopes
for all to anon,authenticated using(false) with check(false);
create policy cos_qa_reviews_explicit_deny on neuraops_company.qa_reviews
for all to anon,authenticated using(false) with check(false);
create policy cos_model_usage_explicit_deny on neuraops_company.model_usage_events
for all to anon,authenticated using(false) with check(false);

revoke all on neuraops_company.execution_envelopes from public,anon,authenticated,service_role;
revoke all on neuraops_company.qa_reviews from public,anon,authenticated,service_role;
revoke all on neuraops_company.model_usage_events from public,anon,authenticated,service_role;

create or replace function neuraops_company.task_authority_check(p_task_id uuid)
returns table(
  allowed boolean,
  reason text,
  requires_founder_approval boolean,
  requires_qa boolean
)
language sql
security invoker
set search_path=pg_catalog
as $$
  select
    (
      t.agent_id is not null
      and p.active
      and t.risk_level <= p.max_autonomous_risk
      and t.action_class = any(p.allowed_action_classes)
      and (not t.external_action_allowed or p.external_actions_allowed)
      and (t.expires_at is null or t.expires_at > statement_timestamp())
      and t.data_class <> 'RESTRICTED'
    ) as allowed,
    case
      when t.agent_id is null then 'NO_AGENT'
      when not p.active then 'AGENT_INACTIVE'
      when t.risk_level > p.max_autonomous_risk then 'RISK_REQUIRES_APPROVAL'
      when not (t.action_class = any(p.allowed_action_classes)) then 'ACTION_NOT_ALLOWED'
      when t.external_action_allowed and not p.external_actions_allowed then 'EXTERNAL_ACTION_NOT_ALLOWED'
      when t.expires_at is not null and t.expires_at <= statement_timestamp() then 'TASK_EXPIRED'
      when t.data_class = 'RESTRICTED' then 'RESTRICTED_DATA_NOT_AUTONOMOUS'
      else 'ALLOWED'
    end,
    (t.risk_level >= 2 or t.external_action_allowed or t.action_class in ('FINANCIAL','LEGAL','SECURITY','PRODUCTION')) as requires_founder_approval,
    t.qa_required
  from public.agent_tasks t
  join neuraops_company.agent_authority_profiles p on p.agent_id=t.agent_id
  where t.id=p_task_id
$$;

revoke all on function neuraops_company.task_authority_check(uuid) from public,anon,authenticated,service_role;

