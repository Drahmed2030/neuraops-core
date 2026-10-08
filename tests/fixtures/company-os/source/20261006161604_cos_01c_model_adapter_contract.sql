
create table if not exists neuraops_company.model_provider_policies (
  provider_key text primary key,
  enabled boolean not null default false,
  max_task_budget_usd numeric(12,4) not null default 0 check (max_task_budget_usd >= 0),
  allowed_data_classes text[] not null default array['PUBLIC']::text[],
  timeout_ms integer not null default 30000 check (timeout_ms between 1000 and 120000),
  structured_output_required boolean not null default true,
  external_tools_allowed boolean not null default false,
  policy_version integer not null default 1 check (policy_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table neuraops_company.model_provider_policies enable row level security;
insert into neuraops_company.model_provider_policies
(provider_key,enabled,max_task_budget_usd,allowed_data_classes,timeout_ms,structured_output_required,external_tools_allowed)
values
('OPENROUTER',false,0.0500,array['PUBLIC']::text[],30000,true,false),
('JEV',false,0.0000,array['PUBLIC']::text[],30000,true,false)
on conflict(provider_key) do nothing;

create policy cos_provider_policies_explicit_deny
on neuraops_company.model_provider_policies
for all to anon,authenticated using(false) with check(false);
revoke all on neuraops_company.model_provider_policies from public,anon,authenticated,service_role;

create table if not exists neuraops_company.model_execution_receipts (
  receipt_id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.agent_tasks(id) on delete restrict,
  envelope_id uuid not null references neuraops_company.execution_envelopes(envelope_id) on delete restrict,
  provider_key text not null references neuraops_company.model_provider_policies(provider_key) on delete restrict,
  provider_request_reference text,
  status text not null check(status in ('SUCCEEDED','FAILED','TIMEOUT','BUDGET_BLOCKED','POLICY_BLOCKED','INVALID_OUTPUT')),
  output_fingerprint text,
  structured_result jsonb,
  input_tokens bigint check(input_tokens is null or input_tokens>=0),
  output_tokens bigint check(output_tokens is null or output_tokens>=0),
  actual_cost_usd numeric(12,6) check(actual_cost_usd is null or actual_cost_usd>=0),
  failure_code text,
  started_at timestamptz not null,
  completed_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb,
  check(completed_at>=started_at)
);
alter table neuraops_company.model_execution_receipts enable row level security;
create index if not exists model_execution_receipts_task_idx on neuraops_company.model_execution_receipts(task_id,completed_at);

drop trigger if exists model_execution_receipts_no_update on neuraops_company.model_execution_receipts;
create trigger model_execution_receipts_no_update before update or delete
on neuraops_company.model_execution_receipts for each row
execute function neuraops_company.prevent_operating_evidence_mutation();

create policy cos_model_receipts_explicit_deny
on neuraops_company.model_execution_receipts
for all to anon,authenticated using(false) with check(false);
revoke all on neuraops_company.model_execution_receipts from public,anon,authenticated,service_role;

create or replace function neuraops_company.model_route_preflight(p_task_id uuid,p_provider_key text)
returns table(allowed boolean,reason text,max_budget_usd numeric,timeout_ms integer,structured_output_required boolean)
language plpgsql security invoker set search_path=pg_catalog
as $$
declare
  t public.agent_tasks%rowtype;
  pp neuraops_company.model_provider_policies%rowtype;
  global_enabled boolean;
begin
  select at.* into t from public.agent_tasks at where at.id=p_task_id;
  if not found then return query select false,'TASK_NOT_FOUND',null::numeric,null::integer,true; return; end if;

  select mpp.* into pp from neuraops_company.model_provider_policies mpp where mpp.provider_key=upper(p_provider_key);
  if not found then return query select false,'PROVIDER_UNKNOWN',null::numeric,null::integer,true; return; end if;

  select oc.enabled into global_enabled from neuraops_company.operating_controls oc where oc.control_key='MODEL_EXECUTION';
  if not coalesce(global_enabled,false) then return query select false,'GLOBAL_MODEL_KILL_SWITCH',pp.max_task_budget_usd,pp.timeout_ms,pp.structured_output_required; return; end if;
  if not pp.enabled then return query select false,'PROVIDER_DISABLED',pp.max_task_budget_usd,pp.timeout_ms,pp.structured_output_required; return; end if;
  if not (t.data_class=any(pp.allowed_data_classes)) then return query select false,'DATA_CLASS_BLOCKED',pp.max_task_budget_usd,pp.timeout_ms,pp.structured_output_required; return; end if;
  if t.budget_limit_usd is null then return query select false,'TASK_BUDGET_REQUIRED',pp.max_task_budget_usd,pp.timeout_ms,pp.structured_output_required; return; end if;
  if t.budget_limit_usd>pp.max_task_budget_usd then return query select false,'TASK_BUDGET_EXCEEDS_PROVIDER_LIMIT',pp.max_task_budget_usd,pp.timeout_ms,pp.structured_output_required; return; end if;
  return query select true,'ALLOWED',least(t.budget_limit_usd,pp.max_task_budget_usd),pp.timeout_ms,pp.structured_output_required;
end $$;

revoke all on function neuraops_company.model_route_preflight(uuid,text) from public,anon,authenticated,service_role;

