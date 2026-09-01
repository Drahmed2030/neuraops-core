-- NeuraOps legacy database hardening v0.1
-- Apply to non-production first. Low-risk performance/security hygiene only.
-- Does NOT move the vector extension or change Control Plane access semantics.

create index if not exists agents_config_store_idx
  on public.agents_config (store_id);
create index if not exists channel_connections_store_idx
  on public.channel_connections (store_id);
create index if not exists conversations_store_idx
  on public.conversations (store_id);
create index if not exists escalations_store_idx
  on public.escalations (store_id);
create index if not exists leads_conversation_idx
  on public.leads (conversation_id);
create index if not exists messages_conversation_idx
  on public.messages (conversation_id);

-- Avoid evaluating auth.uid() once per row at scale.
drop policy if exists owner_select_own_store on public.stores;
drop policy if exists owner_update_own_store on public.stores;
create policy owner_select_own_store
  on public.stores for select to authenticated
  using (owner_id = (select auth.uid()));
create policy owner_update_own_store
  on public.stores for update to authenticated
  using (owner_id = (select auth.uid()));

-- Lead policies retain the same ownership semantics while evaluating auth.uid once.
drop policy if exists owner_select_own_leads on public.leads;
drop policy if exists owner_update_own_leads on public.leads;
create policy owner_select_own_leads
  on public.leads for select to authenticated
  using (
    exists (
      select 1 from public.stores
      where stores.id = leads.store_id
        and stores.owner_id = (select auth.uid())
    )
  );
create policy owner_update_own_leads
  on public.leads for update to authenticated
  using (
    exists (
      select 1 from public.stores
      where stores.id = leads.store_id
        and stores.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.stores
      where stores.id = leads.store_id
        and stores.owner_id = (select auth.uid())
    )
  );

-- Pin the function search path without changing its behavior.
alter function public.match_documents(vector, uuid, integer, double precision)
  set search_path = public;
