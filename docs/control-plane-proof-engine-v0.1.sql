-- Control Plane Proof & Outcome Engine v0.1
-- Non-production first. Operational aggregate metrics only. No PHI.

create table if not exists control_plane.pilot_measurements (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references control_plane.engagements(id),
  organization_id uuid not null references control_plane.organizations(id),
  stage text not null check (stage in ('baseline', 'checkpoint', 'outcome')),
  metrics jsonb not null,
  source_event_id text not null unique,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (engagement_id, stage)
);

alter table control_plane.pilot_measurements enable row level security;
revoke all on control_plane.pilot_measurements from public, anon, authenticated;
grant select, insert on control_plane.pilot_measurements to service_role;

create index if not exists control_plane_pilot_measurements_org_idx
  on control_plane.pilot_measurements (organization_id);

create or replace function public.control_plane_record_pilot_measurement(
  p_engagement_id uuid,
  p_expected_version bigint,
  p_stage text,
  p_event jsonb,
  p_metrics jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_engagement control_plane.engagements%rowtype;
  v_existing control_plane.pilot_measurements%rowtype;
  v_next_state text;
  v_event_id text;
  v_org uuid;
  v_engagement uuid;
  v_allowed_keys text[] := array[
    'referralVolumePerMonth',
    'medianReferralResponseHours',
    'unresolvedReferralBacklog',
    'followUpCompletionPercent',
    'leakagePercent',
    'locationOrHandoffCount'
  ];
  v_key text;
begin
  if p_stage not in ('baseline', 'checkpoint', 'outcome') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_measurement_stage');
  end if;
  if p_metrics is null or jsonb_typeof(p_metrics) <> 'object' or p_metrics = '{}'::jsonb then
    return jsonb_build_object('ok', false, 'reason', 'metrics_required');
  end if;

  for v_key in select jsonb_object_keys(p_metrics)
  loop
    if not (v_key = any(v_allowed_keys)) then
      return jsonb_build_object('ok', false, 'reason', 'unsupported_metric', 'metric', v_key);
    end if;
  end loop;

  select * into v_engagement
  from control_plane.engagements
  where id = p_engagement_id
  for update;

  if not found then return jsonb_build_object('ok', false, 'reason', 'engagement_not_found'); end if;
  if v_engagement.product <> 'nexus' or v_engagement.kind <> 'nexus_lifecycle' then
    return jsonb_build_object('ok', false, 'reason', 'not_nexus_lifecycle');
  end if;

  v_event_id := p_event->>'eventId';
  begin
    v_org := (p_event->>'organizationId')::uuid;
    v_engagement := (p_event->>'engagementId')::uuid;
  exception when others then
    return jsonb_build_object('ok', false, 'reason', 'invalid_event_scope');
  end;

  if v_org <> v_engagement.organization_id or v_engagement <> v_engagement.id then
    return jsonb_build_object('ok', false, 'reason', 'event_scope_mismatch');
  end if;

  select * into v_existing
  from control_plane.pilot_measurements
  where engagement_id = p_engagement_id and stage = p_stage;

  if found then
    if v_existing.metrics = p_metrics and v_existing.source_event_id = v_event_id then
      return jsonb_build_object('ok', true, 'version', v_engagement.version, 'duplicate', true);
    end if;
    return jsonb_build_object('ok', false, 'reason', 'measurement_stage_conflict');
  end if;

  if v_engagement.version <> p_expected_version then
    return jsonb_build_object('ok', false, 'reason', 'version_conflict', 'currentVersion', v_engagement.version);
  end if;

  if p_stage = 'baseline' then
    if v_engagement.state <> 'PILOT_ACTIVE' or p_event->>'type' <> 'BASELINE_CAPTURED' then
      return jsonb_build_object('ok', false, 'reason', 'baseline_not_recordable');
    end if;
    v_next_state := 'PILOT_ACTIVE';
  elsif p_stage = 'checkpoint' then
    if v_engagement.state <> 'PILOT_ACTIVE' or p_event->>'type' <> 'CHECKPOINT_COMPLETED' then
      return jsonb_build_object('ok', false, 'reason', 'checkpoint_not_recordable');
    end if;
    if not exists (
      select 1 from control_plane.pilot_measurements
      where engagement_id = p_engagement_id and stage = 'baseline'
    ) then
      return jsonb_build_object('ok', false, 'reason', 'baseline_required');
    end if;
    v_next_state := 'CHECKPOINT_COMPLETED';
  else
    if v_engagement.state not in ('PILOT_ACTIVE','CHECKPOINT_COMPLETED') or p_event->>'type' <> 'OUTCOME_RECORDED' then
      return jsonb_build_object('ok', false, 'reason', 'outcome_not_recordable');
    end if;
    if not exists (
      select 1 from control_plane.pilot_measurements
      where engagement_id = p_engagement_id and stage = 'baseline'
    ) then
      return jsonb_build_object('ok', false, 'reason', 'baseline_required');
    end if;
    v_next_state := 'OUTCOME_RECORDED';
  end if;

  insert into control_plane.events(event_id, type, organization_id, engagement_id, occurred_at, event_json)
  values (
    v_event_id,
    p_event->>'type',
    v_org,
    p_engagement_id,
    (p_event->>'occurredAt')::timestamptz,
    p_event
  );

  insert into control_plane.pilot_measurements(
    engagement_id, organization_id, stage, metrics, source_event_id, recorded_at
  ) values (
    p_engagement_id,
    v_org,
    p_stage,
    p_metrics,
    v_event_id,
    (p_event->>'occurredAt')::timestamptz
  );

  update control_plane.engagements
  set state = v_next_state, version = version + 1, updated_at = now()
  where id = p_engagement_id;

  return jsonb_build_object('ok', true, 'version', v_engagement.version + 1, 'duplicate', false);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'measurement_conflict');
end;
$$;

revoke execute on function public.control_plane_record_pilot_measurement(uuid, bigint, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.control_plane_record_pilot_measurement(uuid, bigint, text, jsonb, jsonb)
  to service_role;
