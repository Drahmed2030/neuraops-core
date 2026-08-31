-- Control Plane v0.1 — bootstrap + index hardening.
-- Apply only after control_plane_v0_1 on an isolated development branch.

create index if not exists control_plane_engagements_organization_idx
  on control_plane.engagements (organization_id);
create index if not exists control_plane_events_organization_idx
  on control_plane.events (organization_id);
create index if not exists control_plane_payments_engagement_idx
  on control_plane.payments (engagement_id);
create index if not exists control_plane_payments_organization_idx
  on control_plane.payments (organization_id);

alter table control_plane.engagements
  add column if not exists source_ref text;

create unique index if not exists control_plane_engagements_source_ref_idx
  on control_plane.engagements (source_ref)
  where source_ref is not null;

create or replace function public.control_plane_bootstrap_engagement(
  p_source_ref text,
  p_organization_id uuid,
  p_organization_name text,
  p_engagement_id uuid,
  p_product text,
  p_kind text,
  p_initial_state text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing control_plane.engagements%rowtype;
begin
  if nullif(btrim(p_source_ref), '') is null then
    return jsonb_build_object('ok', false, 'reason', 'source_ref_required');
  end if;
  if p_product not in ('nexus', 'cliniverse') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_product');
  end if;
  if p_kind not in ('audit', 'review', 'pilot', 'subscription') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_kind');
  end if;

  select * into v_existing
  from control_plane.engagements
  where source_ref = p_source_ref;

  if found then
    if v_existing.organization_id <> p_organization_id
       or v_existing.id <> p_engagement_id
       or v_existing.product <> p_product
       or v_existing.kind <> p_kind then
      return jsonb_build_object('ok', false, 'reason', 'source_ref_conflict');
    end if;
    return jsonb_build_object(
      'ok', true,
      'created', false,
      'engagementId', v_existing.id::text,
      'organizationId', v_existing.organization_id::text,
      'version', v_existing.version
    );
  end if;

  insert into control_plane.organizations (id, display_name)
  values (p_organization_id, p_organization_name)
  on conflict (id) do update
    set display_name = excluded.display_name;

  insert into control_plane.engagements (
    id, organization_id, product, kind, state, version, source_ref
  ) values (
    p_engagement_id, p_organization_id, p_product, p_kind, p_initial_state, 0, p_source_ref
  );

  return jsonb_build_object(
    'ok', true,
    'created', true,
    'engagementId', p_engagement_id::text,
    'organizationId', p_organization_id::text,
    'version', 0
  );
exception
  when unique_violation then
    select * into v_existing
    from control_plane.engagements
    where source_ref = p_source_ref;
    if found and v_existing.organization_id = p_organization_id
       and v_existing.id = p_engagement_id
       and v_existing.product = p_product
       and v_existing.kind = p_kind then
      return jsonb_build_object('ok', true, 'created', false, 'engagementId', v_existing.id::text, 'organizationId', v_existing.organization_id::text, 'version', v_existing.version);
    end if;
    return jsonb_build_object('ok', false, 'reason', 'source_ref_conflict');
end;
$$;

revoke execute on function public.control_plane_bootstrap_engagement(text,uuid,text,uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function public.control_plane_bootstrap_engagement(text,uuid,text,uuid,text,text,text)
  to service_role;
