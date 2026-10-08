
create or replace function public.company_execution_gateway_preflight(p_task_id uuid)
returns table(
  allowed boolean, reason text, task_id uuid, agent_id uuid, correlation_id uuid,
  risk_level smallint, action_class text, data_class text, budget_limit_usd numeric,
  requires_founder_approval boolean, requires_qa boolean
)
language sql
security definer
set search_path=pg_catalog
as $$
  select * from neuraops_company.execution_gateway_preflight(p_task_id)
$$;

revoke all on function public.company_execution_gateway_preflight(uuid) from public,anon,authenticated;
grant execute on function public.company_execution_gateway_preflight(uuid) to service_role;

