-- Local candidate after company-task-approvals.sql. No execution authority.
-- Only the authenticated operator server action may attest a human requester.
begin;
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
commit;
