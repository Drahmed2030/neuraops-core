-- LOCAL REVIEW CANDIDATE ONLY. Not a release migration.
-- Authenticated governance approvals and native concurrent-session tests are open.
-- No proposed assignment can become effective through this candidate.
begin;
create table if not exists neuraops_company.agent_function_assignments (
  assignment_id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.system_agents(id) on delete restrict,
  function_key text not null check(function_key in ('OPERATIONS','ENGINEERING','RESEARCH','GROWTH','MEDIA','ASSURANCE')),
  assignment_kind text not null check(assignment_kind in ('BUSINESS','ASSURANCE')),
  assignment_version integer not null check(assignment_version>0),
  state text not null default 'PROPOSED' check(state in ('PROPOSED','RETIRED')),
  effective_from timestamptz not null default statement_timestamp(),
  effective_until timestamptz,
  approval_reference uuid references neuraops_company.task_approvals(approval_id) on delete restrict,
  supersedes_id uuid,
  created_at timestamptz not null default statement_timestamp(),
  unique(agent_id,function_key,assignment_version),
  unique(assignment_id,agent_id,function_key),
  foreign key(supersedes_id,agent_id,function_key) references neuraops_company.agent_function_assignments(assignment_id,agent_id,function_key) on delete restrict,
  check(effective_until is null or effective_until>effective_from),
  check((function_key='ASSURANCE')=(assignment_kind='ASSURANCE')),
  check(approval_reference is null) -- no unauthenticated text approval can activate a mapping
);
alter table neuraops_company.agent_function_assignments enable row level security;
revoke all on neuraops_company.agent_function_assignments from public,anon,authenticated,service_role;

create table if not exists neuraops_company.agent_authority_profile_versions (
  agent_id uuid not null references public.system_agents(id) on delete restrict,
  policy_version integer not null check(policy_version>0),
  profile jsonb not null check(jsonb_typeof(profile)='object'),
  captured_at timestamptz not null default statement_timestamp(),
  primary key(agent_id,policy_version)
);
alter table neuraops_company.agent_authority_profile_versions enable row level security;
revoke all on neuraops_company.agent_authority_profile_versions from public,anon,authenticated,service_role;

create or replace function neuraops_company.require_assignment_successor()
returns trigger language plpgsql security invoker set search_path=pg_catalog as $$
declare previous neuraops_company.agent_function_assignments%rowtype;
begin
  perform 1 from public.system_agents where id=new.agent_id for update;
  select * into previous from neuraops_company.agent_function_assignments
    where agent_id=new.agent_id and function_key=new.function_key
    order by assignment_version desc limit 1;
  if found then
    if new.assignment_version<>previous.assignment_version+1 or new.supersedes_id is distinct from previous.assignment_id then
      raise exception 'assignment_version_conflict' using errcode='23505';
    end if;
  elsif new.assignment_version<>1 or new.supersedes_id is not null then
    raise exception 'assignment_initial_version_invalid';
  end if;
  return new;
end $$;
drop trigger if exists company_assignment_successor on neuraops_company.agent_function_assignments;
create trigger company_assignment_successor before insert on neuraops_company.agent_function_assignments
for each row execute function neuraops_company.require_assignment_successor();
drop trigger if exists company_assignment_immutable on neuraops_company.agent_function_assignments;
create trigger company_assignment_immutable before update or delete on neuraops_company.agent_function_assignments
for each row execute function neuraops_company.prevent_operating_evidence_mutation();
drop trigger if exists company_policy_history_immutable on neuraops_company.agent_authority_profile_versions;
create trigger company_policy_history_immutable before update or delete on neuraops_company.agent_authority_profile_versions
for each row execute function neuraops_company.prevent_operating_evidence_mutation();

create or replace function neuraops_company.freeze_unapproved_policy_change()
returns trigger language plpgsql security invoker set search_path=pg_catalog as $$
begin
  if tg_op='DELETE' then raise exception 'company_policy_approval_activation_disabled'; end if;
  if to_jsonb(new) is distinct from to_jsonb(old) then
    raise exception 'company_policy_approval_activation_disabled';
  end if;
  return new;
end $$;
drop trigger if exists company_policy_approval_gate on neuraops_company.agent_authority_profiles;
create trigger company_policy_approval_gate before update or delete on neuraops_company.agent_authority_profiles
for each row execute function neuraops_company.freeze_unapproved_policy_change();
revoke all on function neuraops_company.require_assignment_successor() from public,anon,authenticated,service_role;
revoke all on function neuraops_company.freeze_unapproved_policy_change() from public,anon,authenticated,service_role;

-- Verify exact registered identities before insert-only seed. Never resolve by display name.
do $$
declare identity record; actual_name text; eng public.system_agents%rowtype;
begin
  for identity in select * from (values
    ('2c9aa5a2-ded7-4ffd-b528-3f27f28cb386'::uuid,'Neura-CMO'),
    ('3684f69f-ec37-4799-810c-4f0863ae021f'::uuid,'Neura-QA'),
    ('797903d3-3192-4c81-9a24-aff7b30e808b'::uuid,'MedPulse-Scout'),
    ('9e7ee046-a6c5-4cfe-babb-1231159a49cc'::uuid,'MedPulse-Creator'),
    ('9f02e200-50c5-4a6f-9aba-6c67e04db549'::uuid,'MedPulse-Sales'),
    ('dce3a297-b28c-45b5-96d5-da4a8dc195aa'::uuid,'Neura-PM')) as expected(id,name) loop
    select agent_name into actual_name from public.system_agents where id=identity.id;
    if not found or actual_name<>identity.name then raise exception 'company_identity_mismatch'; end if;
  end loop;
  select * into eng from public.system_agents where id='f44919ab-3f1a-430e-90f9-c569d8c1bb01';
  if found then
    if eng.agent_name<>'Neura-Engineering' or eng.role<>'Engineering Candidate' or eng.status is distinct from 'INACTIVE' then raise exception 'engineering_seed_conflict'; end if;
  else
    insert into public.system_agents(id,agent_name,role,system_prompt,status) values('f44919ab-3f1a-430e-90f9-c569d8c1bb01','Neura-Engineering','Engineering Candidate','Inactive candidate. No tools, credentials, spending or execution authorized.','INACTIVE');
  end if;
end $$;
insert into neuraops_company.agent_authority_profiles(agent_id,active,allowed_action_classes)
select 'f44919ab-3f1a-430e-90f9-c569d8c1bb01',false,'{}'::text[]
where not exists(select 1 from neuraops_company.agent_authority_profiles where agent_id='f44919ab-3f1a-430e-90f9-c569d8c1bb01');
do $$ begin
 if exists(select 1 from neuraops_company.agent_authority_profiles where agent_id='f44919ab-3f1a-430e-90f9-c569d8c1bb01' and (active or allowed_action_classes<>'{}'::text[] or external_actions_allowed or financial_actions_allowed or legal_commitments_allowed or production_actions_allowed or security_mutations_allowed or database_mutations_allowed)) then raise exception 'engineering_policy_seed_conflict'; end if;
end $$;
insert into neuraops_company.agent_authority_profile_versions(agent_id,policy_version,profile)
select p.agent_id,p.policy_version,to_jsonb(p) from neuraops_company.agent_authority_profiles p
where not exists(select 1 from neuraops_company.agent_authority_profile_versions h where h.agent_id=p.agent_id and h.policy_version=p.policy_version);
do $$ begin
 if exists(select 1 from neuraops_company.agent_authority_profiles p join neuraops_company.agent_authority_profile_versions h using(agent_id,policy_version) where h.profile<>to_jsonb(p)) then raise exception 'policy_history_conflict'; end if;
end $$;
do $$
declare mapping record; old_mapping neuraops_company.agent_function_assignments%rowtype;
begin
 for mapping in select * from (values
 ('2c9aa5a2-ded7-4ffd-b528-3f27f28cb386'::uuid,'MEDIA','BUSINESS'),
 ('3684f69f-ec37-4799-810c-4f0863ae021f'::uuid,'ASSURANCE','ASSURANCE'),
 ('797903d3-3192-4c81-9a24-aff7b30e808b'::uuid,'RESEARCH','BUSINESS'),
 ('9e7ee046-a6c5-4cfe-babb-1231159a49cc'::uuid,'MEDIA','BUSINESS'),
 ('9f02e200-50c5-4a6f-9aba-6c67e04db549'::uuid,'GROWTH','BUSINESS'),
 ('dce3a297-b28c-45b5-96d5-da4a8dc195aa'::uuid,'OPERATIONS','BUSINESS'),
 ('f44919ab-3f1a-430e-90f9-c569d8c1bb01'::uuid,'ENGINEERING','BUSINESS')) as m(agent_id,function_key,assignment_kind) loop
  select * into old_mapping from neuraops_company.agent_function_assignments where agent_id=mapping.agent_id and function_key=mapping.function_key order by assignment_version desc limit 1;
  if found then
   if old_mapping.assignment_version<>1 or old_mapping.state<>'PROPOSED' or old_mapping.assignment_kind<>mapping.assignment_kind then raise exception 'mapping_seed_conflict'; end if;
  else
   insert into neuraops_company.agent_function_assignments(agent_id,function_key,assignment_kind,assignment_version) values(mapping.agent_id,mapping.function_key,mapping.assignment_kind,1);
  end if;
 end loop;
end $$;

create or replace function neuraops_company.execution_gateway_preflight(p_task_id uuid)
returns table(
  allowed boolean, reason text, task_id uuid, agent_id uuid, correlation_id uuid,
  risk_level smallint, action_class text, data_class text, budget_limit_usd numeric,
  requires_founder_approval boolean, requires_qa boolean
)
language plpgsql security invoker set search_path=pg_catalog
as $$
declare
  t public.agent_tasks%rowtype;
  ap neuraops_company.agent_authority_profiles%rowtype;
  envelope neuraops_company.execution_envelopes%rowtype;
  parent public.agent_tasks%rowtype;
  parent_envelope neuraops_company.execution_envelopes%rowtype;
  parent_allowed boolean;
  model_enabled boolean;
begin
  select at.* into t from public.agent_tasks at where at.id=p_task_id;
  if not found then
    return query select false,'TASK_NOT_FOUND',p_task_id,null::uuid,null::uuid,null::smallint,null::text,null::text,null::numeric,false,false; return;
  end if;
  select aap.* into ap from neuraops_company.agent_authority_profiles aap where aap.agent_id=t.agent_id;
  if not found or not ap.active then
    return query select false,'AGENT_NOT_AUTHORIZED',t.id,t.agent_id,t.correlation_id,t.risk_level,t.action_class,t.data_class,t.budget_limit_usd,false,t.qa_required; return;
  end if;
  select oc.enabled into model_enabled from neuraops_company.operating_controls oc where oc.control_key='MODEL_EXECUTION';
  if coalesce(model_enabled,false)=false and t.execution_mode='MODEL_ROUTED' then
    return query select false,'MODEL_EXECUTION_KILL_SWITCH',t.id,t.agent_id,t.correlation_id,t.risk_level,t.action_class,t.data_class,t.budget_limit_usd,(t.risk_level>=2),t.qa_required; return;
  end if;
  if t.lifecycle_state not in ('READY','APPROVED') then
    return query select false,'TASK_NOT_READY',t.id,t.agent_id,t.correlation_id,t.risk_level,t.action_class,t.data_class,t.budget_limit_usd,(t.risk_level>=2),t.qa_required; return;
  end if;
  if t.expires_at is not null and t.expires_at<=statement_timestamp() then
    return query select false,'TASK_EXPIRED',t.id,t.agent_id,t.correlation_id,t.risk_level,t.action_class,t.data_class,t.budget_limit_usd,false,t.qa_required; return;
  end if;
  if t.risk_level>ap.max_autonomous_risk then
    return query select false,'RISK_REQUIRES_APPROVAL',t.id,t.agent_id,t.correlation_id,t.risk_level,t.action_class,t.data_class,t.budget_limit_usd,true,t.qa_required; return;
  end if;
  if not (t.action_class=any(ap.allowed_action_classes)) then
    return query select false,'ACTION_NOT_ALLOWED',t.id,t.agent_id,t.correlation_id,t.risk_level,t.action_class,t.data_class,t.budget_limit_usd,false,t.qa_required; return;
  end if;
  if t.data_class='RESTRICTED' then
    return query select false,'RESTRICTED_DATA_NOT_AUTONOMOUS',t.id,t.agent_id,t.correlation_id,t.risk_level,t.action_class,t.data_class,t.budget_limit_usd,true,t.qa_required; return;
  end if;
  if t.external_action_allowed then
    return query select false,'EXTERNAL_ACTION_REQUIRES_GATE',t.id,t.agent_id,t.correlation_id,t.risk_level,t.action_class,t.data_class,t.budget_limit_usd,true,t.qa_required; return;
  end if;
  -- Resolve authority from stored records, never from caller role/policy claims.
  -- These checks are denial-only prerequisites, not an execution authorization.
  select e.* into envelope from neuraops_company.execution_envelopes e where e.task_id=t.id;
  if not found then
    return query select false,'EXECUTION_ENVELOPE_MISSING',t.id,t.agent_id,t.correlation_id,t.risk_level,t.action_class,t.data_class,t.budget_limit_usd,true,t.qa_required; return;
  end if;
  if row(envelope.agent_id,envelope.risk_level,envelope.action_class,envelope.data_class,
         envelope.model_budget_usd,envelope.correlation_id,envelope.expires_at,envelope.external_action_allowed)
     is distinct from
     row(t.agent_id,t.risk_level,t.action_class,t.data_class,
         t.budget_limit_usd,t.correlation_id,t.expires_at,t.external_action_allowed) then
    return query select false,'EXECUTION_ENVELOPE_MISMATCH',t.id,t.agent_id,t.correlation_id,t.risk_level,t.action_class,t.data_class,t.budget_limit_usd,true,t.qa_required; return;
  end if;
  if envelope.policy_version<>ap.policy_version or not exists(
    select 1 from neuraops_company.agent_authority_profile_versions h
    where h.agent_id=t.agent_id and h.policy_version=envelope.policy_version and h.profile=to_jsonb(ap)
  ) then
    return query select false,'POLICY_VERSION_MISMATCH',t.id,t.agent_id,t.correlation_id,t.risk_level,t.action_class,t.data_class,t.budget_limit_usd,true,t.qa_required; return;
  end if;
  if t.parent_task_id is not null then
    select p.* into parent from public.agent_tasks p where p.id=t.parent_task_id;
    if not found then
      return query select false,'PARENT_NOT_FOUND',t.id,t.agent_id,t.correlation_id,t.risk_level,t.action_class,t.data_class,t.budget_limit_usd,true,t.qa_required; return;
    end if;
    -- Initial contract permits one level only. This also bounds recursive checks
    -- and rejects all cycles without trusting a caller-supplied ancestry list.
    if parent.parent_task_id is not null then
      return query select false,'NESTED_DELEGATION_DISABLED',t.id,t.agent_id,t.correlation_id,t.risk_level,t.action_class,t.data_class,t.budget_limit_usd,true,t.qa_required; return;
    end if;
    select e.* into parent_envelope from neuraops_company.execution_envelopes e where e.task_id=parent.id;
    if not found then
      return query select false,'PARENT_ENVELOPE_MISSING',t.id,t.agent_id,t.correlation_id,t.risk_level,t.action_class,t.data_class,t.budget_limit_usd,true,t.qa_required; return;
    end if;
    if envelope.model_budget_usd is null or parent_envelope.model_budget_usd is null
       or envelope.model_budget_usd>parent_envelope.model_budget_usd
       or envelope.expires_at>parent_envelope.expires_at
       or envelope.risk_level>parent_envelope.risk_level
       or envelope.data_class<>parent_envelope.data_class
       or envelope.action_class<>parent_envelope.action_class
       or not(envelope.permitted_tools <@ parent_envelope.permitted_tools)
       or not(envelope.model_provider_allowlist <@ parent_envelope.model_provider_allowlist)
       or (envelope.external_action_allowed and not parent_envelope.external_action_allowed)
       or nullif(btrim(t.payload->>'destination'),'') is null
       or (t.payload->>'destination') is distinct from (parent.payload->>'destination') then
      return query select false,'DELEGATION_SCOPE_EXCEEDED',t.id,t.agent_id,t.correlation_id,t.risk_level,t.action_class,t.data_class,t.budget_limit_usd,true,t.qa_required; return;
    end if;
    select g.allowed into parent_allowed from neuraops_company.execution_gateway_preflight(parent.id) g;
    if parent_allowed is distinct from true then
      return query select false,'PARENT_NOT_AUTHORIZED',t.id,t.agent_id,t.correlation_id,t.risk_level,t.action_class,t.data_class,t.budget_limit_usd,true,t.qa_required; return;
    end if;
  end if;
  -- Assignment activation and approval consumption remain unopened gates.
  -- Preflight reserves no budget: aggregate child reservations and execution-time
  -- revalidation are required in a future transactional executor, not this check.
  return query select false,'ASSIGNMENT_ACTIVATION_DISABLED',t.id,t.agent_id,t.correlation_id,t.risk_level,t.action_class,t.data_class,t.budget_limit_usd,true,t.qa_required;
end $$;
revoke all on function neuraops_company.execution_gateway_preflight(uuid) from public,anon,authenticated,service_role;


create or replace function neuraops_company.task_authority_check(p_task_id uuid)
returns table(allowed boolean,reason text,requires_founder_approval boolean,requires_qa boolean)
language sql security invoker set search_path=pg_catalog as $$
 select g.allowed,g.reason,g.requires_founder_approval,g.requires_qa
 from neuraops_company.execution_gateway_preflight(p_task_id) g
$$;
revoke all on function neuraops_company.task_authority_check(uuid) from public,anon,authenticated,service_role;
commit;
