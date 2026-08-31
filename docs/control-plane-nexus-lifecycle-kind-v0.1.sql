-- Control Plane v0.1 — normalize Nexus to one lifecycle engagement.
-- Apply only to isolated non-production branch until verified.

alter table control_plane.engagements
  drop constraint if exists engagements_kind_check;

update control_plane.engagements
set kind = 'nexus_lifecycle'
where product = 'nexus'
  and kind in ('audit', 'review', 'pilot');

alter table control_plane.engagements
  add constraint engagements_kind_check
  check (kind in ('nexus_lifecycle', 'subscription'));

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
  v_kind text;
begin
  if p_source_ref is null or length(trim(p_source_ref)) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_source_ref');
  end if;

  select * into v_existing
  from control_plane.engagements
  where source_ref = p_source_ref;

  if found then
    return jsonb_build_object(
      'ok', true,
      'created', false,
      'organizationId', v_existing.organization_id::text,
      'engagementId', v_existing.id::text,
      'version', v_existing.version
    );
  end if;

  v_kind := case
    when p_product = 'nexus' then 'nexus_lifecycle'
    when p_product = 'cliniverse' and p_kind = 'subscription' then 'subscription'
    else null
  end;

  if v_kind is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_engagement_kind');
  end if;

  insert into control_plane.organizations (id, display_name)
  values (p_organization_id, p_organization_name)
  on conflict (id) do update
    set display_name = excluded.display_name;

  insert into control_plane.engagements (
    id, organization_id, product, kind, state, source_ref
  ) values (
    p_engagement_id,
    p_organization_id,
    p_product,
    v_kind,
    p_initial_state,
    p_source_ref
  );

  return jsonb_build_object(
    'ok', true,
    'created', true,
    'organizationId', p_organization_id::text,
    'engagementId', p_engagement_id::text,
    'version', 0
  );
exception
  when unique_violation then
    select * into v_existing
    from control_plane.engagements
    where source_ref = p_source_ref;

    if found then
      return jsonb_build_object(
        'ok', true,
        'created', false,
        'organizationId', v_existing.organization_id::text,
        'engagementId', v_existing.id::text,
        'version', v_existing.version
      );
    end if;
    raise;
end;
$$;

revoke execute on function public.control_plane_bootstrap_engagement(text, uuid, text, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.control_plane_bootstrap_engagement(text, uuid, text, uuid, text, text, text)
  to service_role;
