
create or replace function neuraops_company.prevent_approval_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  raise exception 'company_task_approval_immutable';
end;
$$;

drop trigger if exists task_approvals_no_update on neuraops_company.task_approvals;
create trigger task_approvals_no_update
before update or delete on neuraops_company.task_approvals
for each row execute function neuraops_company.prevent_approval_mutation();

create policy ccp_authority_profiles_explicit_deny
on neuraops_company.agent_authority_profiles
for all to anon, authenticated
using (false) with check (false);

create policy ccp_task_events_explicit_deny
on neuraops_company.agent_task_events
for all to anon, authenticated
using (false) with check (false);

create policy ccp_task_approvals_explicit_deny
on neuraops_company.task_approvals
for all to anon, authenticated
using (false) with check (false);

create policy ccp_product_reality_explicit_deny
on neuraops_company.product_reality_facts
for all to anon, authenticated
using (false) with check (false);

create policy ccp_system_agents_explicit_deny
on public.system_agents
for all to anon, authenticated
using (false) with check (false);

create policy ccp_agent_tasks_explicit_deny
on public.agent_tasks
for all to anon, authenticated
using (false) with check (false);

create policy ccp_company_projects_explicit_deny
on public.company_projects
for all to anon, authenticated
using (false) with check (false);

