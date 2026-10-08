-- Recording-only Company OS release. Execution remains disabled.
-- SOURCE: company-agent-authority.sql
-- LOCAL REVIEW CANDIDATE ONLY. Not a release migration.
-- Authenticated governance approvals and native concurrent-session tests are open.
-- No proposed assignment can become effective through this candidate.
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

-- SOURCE: company-task-approvals.sql
-- LOCAL REVIEW CANDIDATE. Apply after company-agent-authority.sql.
-- Records operator review and reserves an internal budget; never authorizes execution.
-- Trust boundary: only a server holding service_role may attest an operator identity.
-- The server action must call Supabase getUser and the existing operator allowlist first.
-- Populated only by a future trusted task-creation path after identity verification.
-- Never backfill from agent_tasks.requested_by_reference or a caller-provided label.
create table neuraops_company.task_requester_attestations (
 task_id uuid primary key references public.agent_tasks(id) on delete restrict,
 principal_reference text not null check(principal_reference ~ '^[a-f0-9]{64}$'),
 verified_origin text not null check(verified_origin in ('SERVER_VERIFIED_HUMAN','SERVER_VERIFIED_SERVICE')),
 created_at timestamptz not null default clock_timestamp()
);
alter table neuraops_company.task_requester_attestations enable row level security;
revoke all on neuraops_company.task_requester_attestations from public,anon,authenticated,service_role;
create trigger company_requester_attestation_immutable before update or delete on neuraops_company.task_requester_attestations for each row execute function neuraops_company.prevent_operating_evidence_mutation();

create function neuraops_company.approval_expiry_at(p_clock timestamptz,p_task_expiry timestamptz,p_budget_day date)
returns timestamptz language plpgsql security invoker set search_path=pg_catalog as $$
begin
 if p_clock is null or p_budget_day is null or (p_clock at time zone 'UTC')::date<>p_budget_day then raise exception 'BUDGET_DAY_CHANGED'; end if;
 if p_task_expiry is null or p_task_expiry<=p_clock then raise exception 'TASK_NOT_APPROVABLE'; end if;
 return least(p_task_expiry,p_clock+interval '15 minutes',(p_budget_day+1)::timestamp at time zone 'UTC');
end $$;
revoke all on function neuraops_company.approval_expiry_at(timestamptz,timestamptz,date) from public,anon,authenticated,service_role;

create table neuraops_company.approval_budget_days (
 budget_day date primary key,
 limit_usd numeric(12,4) not null default 1 check(limit_usd between 0 and 1),
 reserved_usd numeric(12,4) not null default 0 check(reserved_usd>=0 and reserved_usd<=limit_usd)
);
create table neuraops_company.task_approval_bindings (
 approval_id uuid primary key references neuraops_company.task_approvals(approval_id) on delete restrict,
 task_id uuid not null unique references public.agent_tasks(id) on delete restrict,
 parent_task_id uuid references public.agent_tasks(id) on delete restrict,
 review_digest text not null check(review_digest ~ '^[a-f0-9]{64}$'),
 approver_reference text not null check(approver_reference ~ '^[a-f0-9]{64}$'),
 request_key uuid not null unique,
 policy_version integer not null check(policy_version>0),
 reserved_usd numeric(12,4) not null check(reserved_usd between 0 and 0.05),
 budget_day date not null references neuraops_company.approval_budget_days(budget_day),
 expires_at timestamptz not null,
 created_at timestamptz not null default statement_timestamp(),
 check(expires_at>created_at)
);
alter table neuraops_company.approval_budget_days enable row level security;
alter table neuraops_company.task_approval_bindings enable row level security;
revoke all on neuraops_company.approval_budget_days,neuraops_company.task_approval_bindings from public,anon,authenticated,service_role;
create trigger company_approval_binding_immutable before update or delete on neuraops_company.task_approval_bindings for each row execute function neuraops_company.prevent_operating_evidence_mutation();

create function neuraops_company.task_review_digest(p_task_id uuid)
returns text language sql security invoker set search_path=pg_catalog as $$
 select encode(sha256(convert_to(jsonb_build_object('task',to_jsonb(t),'profile',to_jsonb(p),'envelope',to_jsonb(e),'requester_attestation',to_jsonb(a))::text,'UTF8')),'hex')
 from public.agent_tasks t
 join neuraops_company.agent_authority_profiles p on p.agent_id=t.agent_id
 left join neuraops_company.execution_envelopes e on e.task_id=t.id left join neuraops_company.task_requester_attestations a on a.task_id=t.id where t.id=p_task_id
$$;
revoke all on function neuraops_company.task_review_digest(uuid) from public,anon,authenticated,service_role;

create function public.company_task_approval_snapshot(p_task_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare d text;
begin
 d:=neuraops_company.task_review_digest(p_task_id);
 if d is null then raise exception 'TASK_NOT_FOUND'; end if;
 return jsonb_build_object('task_id',p_task_id,'digest',d,'status','REVIEW_ONLY');
end $$;
revoke all on function public.company_task_approval_snapshot(uuid) from public,anon,authenticated;
grant execute on function public.company_task_approval_snapshot(uuid) to service_role;

create function public.company_record_task_approval(p_task_id uuid,p_expected_digest text,p_actor_reference text,p_request_key uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare
 t public.agent_tasks%rowtype;
 p neuraops_company.agent_authority_profiles%rowtype;
 b neuraops_company.task_approval_bindings%rowtype;
 parent public.agent_tasks%rowtype;
 parent_binding neuraops_company.task_approval_bindings%rowtype;
 observed_parent uuid; child_reserved numeric;
 digest text; approval uuid; day date; expiry timestamptz;
begin
 if p_actor_reference is null or p_actor_reference !~ '^[a-f0-9]{64}$' or p_expected_digest is null or p_expected_digest !~ '^[a-f0-9]{64}$' or p_request_key is null then
  raise exception 'INVALID_APPROVAL_REQUEST';
 end if;
 -- Parent-before-child locking serializes sibling reservations. Nested parents
 -- are deliberately unsupported; immutable bindings retain the charged parent.
 select at.parent_task_id into observed_parent from public.agent_tasks at where at.id=p_task_id;
 if observed_parent is not null then
  select * into parent from public.agent_tasks where id=observed_parent;
  if not found then raise exception 'PARENT_APPROVAL_REQUIRED'; end if;
  if parent.parent_task_id is not null then raise exception 'NESTED_DELEGATION_DISABLED'; end if;
  select * into parent from public.agent_tasks where id=observed_parent for update;
  if parent.parent_task_id is not null then raise exception 'NESTED_DELEGATION_DISABLED'; end if;
 end if;
 select * into t from public.agent_tasks where id=p_task_id for update;
 if not found then raise exception 'TASK_NOT_FOUND'; end if;
 if t.parent_task_id is distinct from observed_parent then raise exception 'TASK_PARENT_CHANGED'; end if;
 select * into p from neuraops_company.agent_authority_profiles where agent_id=t.agent_id for share;
 if not found then raise exception 'AGENT_NOT_AUTHORIZED'; end if;
 digest:=neuraops_company.task_review_digest(p_task_id);
 if digest is distinct from p_expected_digest then raise exception 'STALE_APPROVAL'; end if;
 if t.requested_by_reference is null or t.requested_by_reference !~ '^[a-f0-9]{64}$' or not exists(select 1 from neuraops_company.task_requester_attestations a where a.task_id=t.id and a.principal_reference=t.requested_by_reference) then raise exception 'REQUESTER_PROVENANCE_REQUIRED'; end if;
 if t.requested_by_reference=p_actor_reference or encode(sha256(convert_to(t.agent_id::text,'UTF8')),'hex')=p_actor_reference then raise exception 'SELF_APPROVAL'; end if;
 if not p.active or t.lifecycle_state<>'WAITING_APPROVAL' or t.risk_level>p.max_autonomous_risk or t.risk_level>1 or not(t.action_class=any(p.allowed_action_classes)) or t.action_class not in ('RESEARCH','INTERNAL_CREATE','REVIEW','ASSURANCE') or t.data_class not in ('PUBLIC','INTERNAL') or t.external_action_allowed or t.expires_at is null or t.expires_at<=clock_timestamp() then raise exception 'TASK_NOT_APPROVABLE'; end if;
  if exists(select 1 from neuraops_company.task_approvals a where a.task_id=t.id and a.decision in ('REVOKE','REJECT')) then raise exception 'APPROVAL_REVOKED'; end if;
 if observed_parent is not null then
  select * into parent_binding from neuraops_company.task_approval_bindings where task_id=observed_parent;
  if not found or parent_binding.expires_at<=clock_timestamp()
   or parent_binding.review_digest is distinct from neuraops_company.task_review_digest(observed_parent)
   or exists(select 1 from neuraops_company.task_approvals a where a.task_id=observed_parent and a.decision in ('REVOKE','REJECT'))
  then raise exception 'PARENT_APPROVAL_REQUIRED'; end if;
 end if;
 select * into b from neuraops_company.task_approval_bindings where task_id=p_task_id;
 if found then
  if b.review_digest<>digest or b.request_key<>p_request_key or b.approver_reference<>p_actor_reference or b.expires_at<=clock_timestamp() then raise exception 'APPROVAL_CONFLICT'; end if;
  return jsonb_build_object('status','RECORDED_NOT_EXECUTED','approval_id',b.approval_id,'reserved_usd',b.reserved_usd,'expires_at',b.expires_at);
 end if;
 if t.budget_limit_usd is null or t.budget_limit_usd<0 or t.budget_limit_usd>0.05 then raise exception 'BUDGET_LIMIT'; end if;
 if observed_parent is not null then
  select coalesce(sum(ab.reserved_usd),0) into child_reserved from neuraops_company.task_approval_bindings ab where ab.parent_task_id=observed_parent;
  if child_reserved+t.budget_limit_usd>parent_binding.reserved_usd then raise exception 'PARENT_BUDGET_LIMIT'; end if;
 end if;
 day:=(clock_timestamp() at time zone 'UTC')::date;
 insert into neuraops_company.approval_budget_days(budget_day) values(day) on conflict do nothing;
 update neuraops_company.approval_budget_days set reserved_usd=reserved_usd+t.budget_limit_usd where budget_day=day and reserved_usd+t.budget_limit_usd<=limit_usd;
 if not found then raise exception 'BUDGET_LIMIT'; end if;
 -- Recheck real time after all potentially blocking task/profile/budget locks.
 expiry:=neuraops_company.approval_expiry_at(clock_timestamp(),t.expires_at,day);
 if observed_parent is not null then
  if parent_binding.expires_at<=clock_timestamp() then raise exception 'PARENT_APPROVAL_REQUIRED'; end if;
  expiry:=least(expiry,parent_binding.expires_at);
 end if;
 insert into neuraops_company.task_approvals(task_id,approval_level,decision,approved_by_reference,reason,evidence)
 values(t.id,2,'APPROVE',p_actor_reference,'Authenticated operator review; execution remains gated',jsonb_build_object('verification','server_getUser_operator_allowlist','review_digest',digest,'request_key',p_request_key,'scope','internal_nonproduction_only')) returning approval_id into approval;
 insert into neuraops_company.task_approval_bindings(approval_id,task_id,parent_task_id,review_digest,approver_reference,request_key,policy_version,reserved_usd,budget_day,expires_at)
 values(approval,t.id,observed_parent,digest,p_actor_reference,p_request_key,p.policy_version,t.budget_limit_usd,day,expiry);
 insert into neuraops_company.agent_task_events(task_id,agent_id,event_type,correlation_id,input_digest,approval_reference,evidence)
 values(t.id,t.agent_id,'OPERATOR_REVIEW_RECORDED',t.correlation_id,digest,approval,jsonb_build_object('reserved_usd',t.budget_limit_usd,'execution_authorized',false));
 return jsonb_build_object('status','RECORDED_NOT_EXECUTED','approval_id',approval,'reserved_usd',t.budget_limit_usd,'expires_at',expiry);
end $$;
revoke all on function public.company_record_task_approval(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.company_record_task_approval(uuid,text,text,uuid) to service_role;

-- SOURCE: company-task-provenance.sql
-- Local candidate after company-task-approvals.sql. No execution authority.
-- Only the authenticated operator server action may attest a human requester.
create table neuraops_company.task_request_bindings (
 task_id uuid primary key references public.agent_tasks(id) on delete restrict,
 requester_reference text not null check(requester_reference ~ '^[a-f0-9]{64}$'),
 request_key uuid not null,
 request_digest text not null check(request_digest ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default clock_timestamp(),
 unique(requester_reference,request_key)
);
alter table neuraops_company.task_request_bindings enable row level security;
revoke all on neuraops_company.task_request_bindings from public,anon,authenticated,service_role;
create trigger company_request_binding_immutable before update or delete on neuraops_company.task_request_bindings for each row execute function neuraops_company.prevent_operating_evidence_mutation();

create function public.company_create_task_request(p_agent_id uuid,p_description text,p_action_class text,p_budget_cents integer,p_actor_reference text,p_request_key uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare
 p neuraops_company.agent_authority_profiles%rowtype;
 b neuraops_company.task_request_bindings%rowtype;
 d text; tid uuid; corr uuid; expiry timestamptz; risk smallint; budget numeric; idem text;
begin
 if p_actor_reference is null or p_actor_reference !~ '^[a-f0-9]{64}$' or p_request_key is null or p_agent_id is null
 or p_description is null or length(btrim(p_description))=0 or length(p_description)>2000
 or p_action_class is null or p_action_class not in ('RESEARCH','INTERNAL_CREATE','REVIEW','ASSURANCE')
 or p_budget_cents is null or p_budget_cents<0 or p_budget_cents>5 then raise exception 'INVALID_TASK_REQUEST'; end if;
 d:=encode(sha256(convert_to(jsonb_build_object('agent',p_agent_id,'description',p_description,'action',p_action_class,'budget_cents',p_budget_cents,'destination','internal-draft','requester',p_actor_reference)::text,'UTF8')),'hex');
 -- Same actor/key serializes; different payload cannot steal an earlier result.
 perform pg_advisory_xact_lock(hashtextextended('company-request:'||p_actor_reference||':'||p_request_key::text,0));
 select * into b from neuraops_company.task_request_bindings where requester_reference=p_actor_reference and request_key=p_request_key;
 if found then
  if b.request_digest<>d then raise exception 'REQUEST_CONFLICT'; end if;
  return jsonb_build_object('task_id',b.task_id,'status','WAITING_APPROVAL','execution_authorized',false);
 end if;
 select * into p from neuraops_company.agent_authority_profiles where agent_id=p_agent_id for share;
 if not found or not p.active or not(p_action_class=any(p.allowed_action_classes)) then raise exception 'AGENT_NOT_AUTHORIZED'; end if;
 risk:=case when p_action_class='RESEARCH' then 0 else 1 end;
 if risk>p.max_autonomous_risk then raise exception 'AGENT_NOT_AUTHORIZED'; end if;
 budget:=p_budget_cents::numeric/100; expiry:=clock_timestamp()+interval '1 hour';corr:=gen_random_uuid();
 idem:='company-request:'||p_actor_reference||':'||p_request_key::text;
 insert into public.agent_tasks(agent_id,task_description,lifecycle_state,risk_level,action_class,data_class,budget_limit_usd,expires_at,requested_by_reference,payload,execution_mode,correlation_id,idempotency_key,approval_required,is_approved)
 values(p_agent_id,p_description,'WAITING_APPROVAL',risk,p_action_class,'INTERNAL',budget,expiry,p_actor_reference,jsonb_build_object('destination','internal-draft'),'NONE',corr,idem,true,false) returning id into tid;
 insert into neuraops_company.task_requester_attestations(task_id,principal_reference,verified_origin) values(tid,p_actor_reference,'SERVER_VERIFIED_HUMAN');
 insert into neuraops_company.task_request_bindings(task_id,requester_reference,request_key,request_digest) values(tid,p_actor_reference,p_request_key,d);
 insert into neuraops_company.execution_envelopes(task_id,agent_id,policy_version,risk_level,action_class,data_class,permitted_tools,external_action_allowed,model_provider_allowlist,model_budget_usd,input_fingerprint,idempotency_key,correlation_id,expires_at)
 values(tid,p_agent_id,p.policy_version,risk,p_action_class,'INTERNAL','{}',false,'{}',budget,d,idem,corr,expiry);
 insert into neuraops_company.agent_task_events(task_id,agent_id,event_type,correlation_id,input_digest,evidence)
 values(tid,p_agent_id,'VERIFIED_HUMAN_REQUEST_RECORDED',corr,d,jsonb_build_object('requester_reference',p_actor_reference,'verification','server_getUser_operator_allowlist','execution_authorized',false));
 return jsonb_build_object('task_id',tid,'status','WAITING_APPROVAL','execution_authorized',false);
end $$;
revoke all on function public.company_create_task_request(uuid,text,text,integer,text,uuid) from public,anon,authenticated;
grant execute on function public.company_create_task_request(uuid,text,text,integer,text,uuid) to service_role;

create function public.company_task_review_details(p_task_id uuid,p_actor_reference text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare t public.agent_tasks%rowtype; p neuraops_company.agent_authority_profiles%rowtype; d text; can_review boolean;
begin
 if p_actor_reference is null or p_actor_reference !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_REVIEW_ACTOR'; end if;
 select * into t from public.agent_tasks where id=p_task_id for share;
 if not found then raise exception 'TASK_NOT_FOUND'; end if;
 select * into p from neuraops_company.agent_authority_profiles where agent_id=t.agent_id for share;
 if not found then raise exception 'AGENT_NOT_AUTHORIZED'; end if;
 if not exists(select 1 from neuraops_company.task_request_bindings b join neuraops_company.task_requester_attestations a on a.task_id=b.task_id where b.task_id=t.id and a.principal_reference=t.requested_by_reference and b.requester_reference=a.principal_reference) then raise exception 'REQUESTER_PROVENANCE_REQUIRED'; end if;
 d:=neuraops_company.task_review_digest(t.id);
 can_review:=t.requested_by_reference<>p_actor_reference and p.active and t.expires_at>clock_timestamp() and t.lifecycle_state='WAITING_APPROVAL'
 and not exists(select 1 from neuraops_company.task_approvals a where a.task_id=t.id and a.decision in ('REJECT','REVOKE'));
 return jsonb_build_object('task_id',t.id,'digest',d,'status','REVIEW_ONLY','can_approve',can_review,
 'task',jsonb_build_object('description',t.task_description,'agent_id',t.agent_id,'action',t.action_class,'data_class',t.data_class,'destination',t.payload->>'destination','budget_usd',t.budget_limit_usd,'expires_at',t.expires_at,'policy_version',p.policy_version,'requester_reference',t.requested_by_reference),
 'execution_authorized',false);
end $$;
revoke all on function public.company_task_review_details(uuid,text) from public,anon,authenticated;
grant execute on function public.company_task_review_details(uuid,text) to service_role;
