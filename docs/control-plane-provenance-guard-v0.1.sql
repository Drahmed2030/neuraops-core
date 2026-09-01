-- Control Plane Evidence & Provenance Guard v0.1
-- Non-production first. Binds proof and renewal recommendations to persisted source events.

alter table control_plane.renewal_decisions
  add column if not exists proof_evidence_hash text,
  add column if not exists decision_hash text,
  add column if not exists source_event_ids jsonb;

create or replace function public.control_plane_load_pilot_measurements(p_engagement_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'engagementId', pm.engagement_id::text,
    'organizationId', pm.organization_id::text,
    'stage', pm.stage,
    'sourceEventId', pm.source_event_id,
    'recordedAt', pm.recorded_at,
    'metrics', pm.metrics
  ) order by case pm.stage when 'baseline' then 1 when 'checkpoint' then 2 else 3 end), '[]'::jsonb)
  from control_plane.pilot_measurements pm
  where pm.engagement_id = p_engagement_id;
$$;

revoke execute on function public.control_plane_load_pilot_measurements(uuid)
  from public, anon, authenticated;
grant execute on function public.control_plane_load_pilot_measurements(uuid)
  to service_role;

create or replace function public.control_plane_record_renewal_decision_v2(
  p_engagement_id uuid,
  p_expected_version bigint,
  p_event jsonb,
  p_policy_version text,
  p_decision text,
  p_reason text,
  p_proof_summary jsonb,
  p_proof_evidence_hash text,
  p_decision_hash text,
  p_source_event_ids jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_engagement control_plane.engagements%rowtype;
  v_existing control_plane.renewal_decisions%rowtype;
  v_event_id text;
  v_event_org uuid;
  v_event_engagement uuid;
begin
  if p_policy_version is null or length(trim(p_policy_version)) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'policy_version_required');
  end if;
  if p_decision not in ('RENEWAL_RECOMMENDED','EXPANSION_RECOMMENDED','CLOSE_WITH_PROOF','NEEDS_HUMAN_REVIEW') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_renewal_decision');
  end if;
  if p_proof_summary is null or jsonb_typeof(p_proof_summary) <> 'object' then
    return jsonb_build_object('ok', false, 'reason', 'proof_summary_required');
  end if;
  if p_proof_evidence_hash is null or p_proof_evidence_hash !~ '^sha256:[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_proof_evidence_hash');
  end if;
  if p_decision_hash is null or p_decision_hash !~ '^sha256:[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_decision_hash');
  end if;
  if p_source_event_ids is null or jsonb_typeof(p_source_event_ids) <> 'array' or jsonb_array_length(p_source_event_ids) < 2 then
    return jsonb_build_object('ok', false, 'reason', 'source_event_ids_required');
  end if;

  select * into v_engagement
  from control_plane.engagements
  where id = p_engagement_id
  for update;

  if not found then return jsonb_build_object('ok', false, 'reason', 'engagement_not_found'); end if;
  if v_engagement.product <> 'nexus' or v_engagement.kind <> 'nexus_lifecycle' then
    return jsonb_build_object('ok', false, 'reason', 'not_nexus_lifecycle');
  end if;
  if v_engagement.state <> 'OUTCOME_RECORDED' then
    return jsonb_build_object('ok', false, 'reason', 'outcome_required_before_renewal_decision');
  end if;

  if exists (
    select 1 from jsonb_array_elements_text(p_source_event_ids) s(event_id)
    where not exists (
      select 1 from control_plane.events e
      where e.event_id = s.event_id
        and e.engagement_id = p_engagement_id
        and e.organization_id = v_engagement.organization_id
    )
  ) then
    return jsonb_build_object('ok', false, 'reason', 'source_event_not_found');
  end if;

  v_event_id := p_event->>'eventId';
  begin
    v_event_org := (p_event->>'organizationId')::uuid;
    v_event_engagement := (p_event->>'engagementId')::uuid;
  exception when others then
    return jsonb_build_object('ok', false, 'reason', 'invalid_event_scope');
  end;

  if v_event_org <> v_engagement.organization_id or v_event_engagement <> v_engagement.id then
    return jsonb_build_object('ok', false, 'reason', 'event_scope_mismatch');
  end if;

  select * into v_existing
  from control_plane.renewal_decisions
  where engagement_id = p_engagement_id and policy_version = p_policy_version;

  if found then
    if v_existing.decision = p_decision
       and v_existing.reason = p_reason
       and v_existing.proof_summary = p_proof_summary
       and v_existing.source_event_id = v_event_id
       and v_existing.proof_evidence_hash = p_proof_evidence_hash
       and v_existing.decision_hash = p_decision_hash
       and v_existing.source_event_ids = p_source_event_ids then
      return jsonb_build_object('ok', true, 'version', v_engagement.version, 'duplicate', true, 'decisionId', v_existing.id::text);
    end if;
    return jsonb_build_object('ok', false, 'reason', 'renewal_decision_conflict');
  end if;

  if v_engagement.version <> p_expected_version then
    return jsonb_build_object('ok', false, 'reason', 'version_conflict', 'currentVersion', v_engagement.version);
  end if;

  insert into control_plane.events(event_id, type, organization_id, engagement_id, occurred_at, event_json)
  values (v_event_id, 'RENEWAL_DECISION_RECORDED', v_event_org, p_engagement_id, (p_event->>'occurredAt')::timestamptz, p_event);

  insert into control_plane.renewal_decisions(
    engagement_id, organization_id, policy_version, decision, reason,
    proof_summary, source_event_id, recorded_at,
    proof_evidence_hash, decision_hash, source_event_ids
  ) values (
    p_engagement_id, v_event_org, p_policy_version, p_decision, p_reason,
    p_proof_summary, v_event_id, (p_event->>'occurredAt')::timestamptz,
    p_proof_evidence_hash, p_decision_hash, p_source_event_ids
  ) returning id into v_existing.id;

  update control_plane.engagements
  set version = version + 1, updated_at = now()
  where id = p_engagement_id;

  return jsonb_build_object('ok', true, 'version', v_engagement.version + 1, 'duplicate', false, 'decisionId', v_existing.id::text);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'renewal_decision_conflict');
end;
$$;

revoke execute on function public.control_plane_record_renewal_decision_v2(uuid, bigint, jsonb, text, text, text, jsonb, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.control_plane_record_renewal_decision_v2(uuid, bigint, jsonb, text, text, text, jsonb, text, text, jsonb)
  to service_role;

create or replace function public.control_plane_load_renewal_decisions(p_engagement_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'decisionId', d.id::text,
    'engagementId', d.engagement_id::text,
    'organizationId', d.organization_id::text,
    'policyVersion', d.policy_version,
    'decision', d.decision,
    'reason', d.reason,
    'proofSummary', d.proof_summary,
    'proofEvidenceHash', d.proof_evidence_hash,
    'decisionHash', d.decision_hash,
    'sourceEventIds', d.source_event_ids,
    'recordedAt', d.recorded_at
  ) order by d.recorded_at), '[]'::jsonb)
  from control_plane.renewal_decisions d
  where d.engagement_id = p_engagement_id;
$$;

revoke execute on function public.control_plane_load_renewal_decisions(uuid) from public, anon, authenticated;
grant execute on function public.control_plane_load_renewal_decisions(uuid) to service_role;
