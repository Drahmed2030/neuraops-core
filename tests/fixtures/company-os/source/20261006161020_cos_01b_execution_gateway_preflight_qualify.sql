
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
  return query select true,'ALLOWED',t.id,t.agent_id,t.correlation_id,t.risk_level,t.action_class,t.data_class,t.budget_limit_usd,false,t.qa_required;
end $$;
revoke all on function neuraops_company.execution_gateway_preflight(uuid) from public,anon,authenticated,service_role;

