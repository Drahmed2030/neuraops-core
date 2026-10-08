-- LOCAL REVIEW CANDIDATE. Apply after company-agent-authority.sql.
-- Records operator review and reserves an internal budget; never authorizes execution.
-- Trust boundary: only a server holding service_role may attest an operator identity.
-- The server action must call Supabase getUser and the existing operator allowlist first.
begin;
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
commit;
