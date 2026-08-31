-- Control Plane v0.1 — defense-in-depth activation guard.
-- Prevents privileged server bugs from activating paid access without entitlements.

create or replace function control_plane.enforce_sensitive_engagement_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.state is not distinct from old.state then
    return new;
  end if;

  if new.state = 'PILOT_ACTIVE' then
    if old.state <> 'PILOT_READY' then
      raise exception 'pilot_activation_requires_pilot_ready';
    end if;

    if not exists (
      select 1
      from control_plane.entitlements en
      where en.organization_id = new.organization_id
        and en.key = 'nexus.pilot_workspace'
        and en.status = 'active'
        and en.starts_at <= now()
        and (en.ends_at is null or en.ends_at > now())
    ) then
      raise exception 'pilot_activation_requires_active_entitlement';
    end if;
  end if;

  if new.state = 'SUBSCRIPTION_ACTIVE' then
    if old.state <> 'PAYMENT_PENDING' and old.state <> 'SUBSCRIPTION_ACTIVE' then
      raise exception 'subscription_activation_requires_payment_pending';
    end if;

    if not exists (
      select 1
      from control_plane.entitlements en
      where en.organization_id = new.organization_id
        and en.key = 'cliniverse.core'
        and en.status = 'active'
        and en.starts_at <= now()
        and (en.ends_at is null or en.ends_at > now())
    ) then
      raise exception 'subscription_activation_requires_active_entitlement';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists control_plane_sensitive_engagement_transition_guard
  on control_plane.engagements;

create trigger control_plane_sensitive_engagement_transition_guard
before update of state on control_plane.engagements
for each row
execute function control_plane.enforce_sensitive_engagement_transition();

revoke execute on function control_plane.enforce_sensitive_engagement_transition()
  from public, anon, authenticated;
