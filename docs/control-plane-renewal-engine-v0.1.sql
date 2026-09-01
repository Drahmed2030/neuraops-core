-- Control Plane Renewal & Expansion Engine v0.1
-- Non-production first. Stores immutable commercial recommendations from persisted proof.
-- Recommendation is NOT customer acceptance and does NOT renew entitlement automatically.

create table if not exists control_plane.renewal_decisions (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references control_plane.engagements(id),
  organization_id uuid not null references control_plane.organizations(id),
  policy_version text not null,
  decision text not null check (decision in (
    'RENEWAL_RECOMMENDED',
    'EXPANSION_RECOMMENDED',
    'CLOSE_WITH_PROOF',
    'NEEDS_HUMAN_REVIEW'
  )),
  reason text not null,
  proof_summary jsonb not null,
  source_event_id text not null unique,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (engagement_id, policy_version)
);

alter table control_plane.renewal_decisions enable row level security;
revoke all on control_plane.renewal_decisions from public, anon, authenticated;
grant select, insert on control_plane.renewal_decisions to service_role;

create index if not exists control_plane_renewal_decisions_org_idx
  on control_plane.renewal_decisions (organization_id);

create or replace function public.control_plane_record_renewal_decision(
  p_engagement_id uuid,
  p_expected_version bigint,
  p_event jsonb,
  p_policy_version text,
  p_decision text,
  p_reason text,
  p_proof_summary jsonb
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
       and v_existing.source_event_id = v_event_id then
      return jsonb_build_object(
        'ok', true,
        'version', v_engagement.version,
        'duplicate', true,
        'decisionId', v_existing.id::text
      );
    end if;
    return jsonb_build_object('ok', false, 'reason', 'renewal_decision_conflict');
  end if;

  if v_engagement.version <> p_expected_version then
    return jsonb_build_object('ok', false, 'reason', 'version_conflict', 'currentVersion', v_engagement.version);
  end if;

  insert into control_plane.events(event_id, type, organization_id, engagement_id, occurred_at, event_json)
  values (
    v_event_id,
    'RENEWAL_DECISION_RECORDED',
    v_event_org,
    p_engagement_id,
    (p_event->>'occurredAt')::timestamptz,
    p_event
  );

  insert into control_plane.renewal_decisions(
    engagement_id, organization_id, policy_version, decision, reason,
    proof_summary, source_event_id, recorded_at
  ) values (
    p_engagement_id,
    v_event_org,
    p_policy_version,
    p_decision,
    p_reason,
    p_proof_summary,
    v_event_id,
    (p_event->>'occurredAt')::timestamptz
  ) returning id into v_existing.id;

  update control_plane.engagements
  set version = version + 1, updated_at = now()
  where id = p_engagement_id;

  return jsonb_build_object(
    'ok', true,
    'version', v_engagement.version + 1,
    'duplicate', false,
    'decisionId', v_existing.id::text
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'renewal_decision_conflict');
end;
$$;

revoke execute on function public.control_plane_record_renewal_decision(uuid, bigint, jsonb, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.control_plane_record_renewal_decision(uuid, bigint, jsonb, text, text, text, jsonb)
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
    'recordedAt', d.recorded_at
  ) order by d.recorded_at), '[]'::jsonb)
  from control_plane.renewal_decisions d
  where d.engagement_id = p_engagement_id;
$$;

revoke execute on function public.control_plane_load_renewal_decisions(uuid) from public, anon, authenticated;
grant execute on function public.control_plane_load_renewal_decisions(uuid) to service_role;
