import { applyLifecycleEvent } from './lifecycle.mjs'
import { fulfillVerifiedPayment } from './fulfillment.mjs'

function mapRpcError(error) {
  const message = String(error?.message ?? '')
  if (message.includes('version_conflict')) return { ok: false, reason: 'version_conflict' }
  if (message.includes('event_id_conflict')) {
    return { ok: false, reason: 'persistence_failed', domainReason: 'event_id_conflict' }
  }
  if (message.includes('payment_intent_conflict')) {
    return { ok: false, reason: 'persistence_failed', domainReason: 'payment_intent_conflict' }
  }
  return { ok: false, reason: 'persistence_failed' }
}

export function createSupabaseControlPlanePersistence(supabase) {
  if (!supabase || typeof supabase.rpc !== 'function') {
    throw new Error('invalid_supabase_client')
  }

  async function bootstrapEngagement(input) {
    const { data, error } = await supabase.rpc('control_plane_bootstrap_engagement', {
      p_source_ref: input.sourceRef,
      p_organization_id: input.organizationId,
      p_organization_name: input.organizationName,
      p_engagement_id: input.engagementId,
      p_product: input.product,
      p_kind: input.kind,
      p_initial_state: input.initialState,
    })
    if (error) return { ok: false, reason: 'persistence_failed' }
    return data
  }

  async function loadEngagementBundle(engagementId) {
    const { data, error } = await supabase.rpc('control_plane_load_engagement_bundle', {
      p_engagement_id: engagementId,
    })
    if (error) throw new Error(`control_plane_load_failed:${error.message}`)
    if (!data) return null
    return data
  }

  async function commitLifecycle({ engagement, event, entitlement, expectedVersion }) {
    const current = await loadEngagementBundle(engagement.engagementId)
    if (!current) return { ok: false, reason: 'persistence_failed' }

    const applied = applyLifecycleEvent({
      engagement: current.engagement,
      events: current.events,
      grants: current.entitlements,
      event,
      entitlementGrant: entitlement,
    })

    if (!applied.ok) {
      return { ok: false, reason: 'persistence_failed', domainReason: applied.reason }
    }
    if (applied.duplicate) {
      return { ok: true, version: current.version, duplicate: true }
    }

    const { data, error } = await supabase.rpc('control_plane_commit_lifecycle', {
      p_engagement_id: engagement.engagementId,
      p_expected_version: expectedVersion,
      p_event: event,
      p_next_state: applied.engagement.state,
      p_entitlement: entitlement ?? null,
    })

    if (error) return mapRpcError(error)
    if (!data?.ok) {
      if (data?.reason === 'version_conflict') {
        return { ok: false, reason: 'version_conflict', currentVersion: data.currentVersion }
      }
      return { ok: false, reason: 'persistence_failed', domainReason: data?.reason }
    }

    return { ok: true, version: data.version, duplicate: Boolean(data.duplicate) }
  }

  async function createPaymentIntent({ engagement, event, payment, expectedVersion }) {
    const current = await loadEngagementBundle(engagement.engagementId)
    if (!current) return { ok: false, reason: 'persistence_failed' }

    const applied = applyLifecycleEvent({
      engagement: current.engagement,
      events: current.events,
      grants: current.entitlements,
      event,
    })
    if (!applied.ok) {
      return { ok: false, reason: 'persistence_failed', domainReason: applied.reason }
    }

    const { data, error } = await supabase.rpc('control_plane_create_payment_intent', {
      p_engagement_id: engagement.engagementId,
      p_expected_version: expectedVersion,
      p_event: event,
      p_next_state: applied.duplicate ? current.engagement.state : applied.engagement.state,
      p_payment: payment,
    })

    if (error) return mapRpcError(error)
    if (!data?.ok) {
      if (data?.reason === 'version_conflict') {
        return { ok: false, reason: 'version_conflict', currentVersion: data.currentVersion }
      }
      return { ok: false, reason: 'persistence_failed', domainReason: data?.reason }
    }

    return {
      ok: true,
      version: data.version,
      duplicate: Boolean(data.duplicate),
      payment: data.payment,
    }
  }

  async function linkCheckoutReference({ engagementId, paymentId, providerReference }) {
    const { data, error } = await supabase.rpc('control_plane_link_checkout_reference', {
      p_engagement_id: engagementId,
      p_payment_id: paymentId,
      p_provider_reference: providerReference,
    })
    if (error) return { ok: false, reason: 'persistence_failed' }
    if (!data?.ok) {
      if (data?.reason === 'payment_not_found') return { ok: false, reason: 'payment_not_found' }
      if (data?.reason === 'provider_reference_conflict') return { ok: false, reason: 'provider_reference_conflict' }
      return { ok: false, reason: 'persistence_failed' }
    }
    return { ok: true, duplicate: Boolean(data.duplicate), payment: data.payment }
  }

  async function settleVerifiedPayment({ engagement, expectedVersion, expectedPayment, verifiedPayment, entitlement }) {
    const current = await loadEngagementBundle(engagement.engagementId)
    if (!current) return { ok: false, reason: 'persistence_failed' }

    const domain = fulfillVerifiedPayment({
      engagement: current.engagement,
      events: current.events,
      grants: current.entitlements,
      expectedPayment,
      verifiedPayment,
      entitlementGrant: entitlement,
    })
    if (!domain.ok) {
      return { ok: false, reason: 'persistence_failed', domainReason: domain.reason }
    }

    const paymentEvent = domain.events.find(event => event.type === 'PAYMENT_RECEIVED' && event.payload?.paymentId === expectedPayment.paymentId)
    const entitlementEvent = domain.events.find(event => event.type === 'ENTITLEMENT_GRANTED' && event.payload?.key === entitlement.key)
    if (!paymentEvent || !entitlementEvent) {
      return { ok: false, reason: 'persistence_failed', domainReason: 'settlement_events_missing' }
    }

    const { data, error } = await supabase.rpc('control_plane_settle_verified_payment', {
      p_engagement_id: engagement.engagementId,
      p_expected_version: expectedVersion,
      p_payment_id: expectedPayment.paymentId,
      p_verified: verifiedPayment,
      p_payment_event: paymentEvent,
      p_entitlement_event: entitlementEvent,
      p_entitlement: entitlement,
    })

    if (error) return mapRpcError(error)
    if (!data?.ok) {
      if (data?.reason === 'version_conflict') {
        return { ok: false, reason: 'version_conflict', currentVersion: data.currentVersion }
      }
      return { ok: false, reason: 'persistence_failed', domainReason: data?.reason }
    }

    return {
      ok: true,
      duplicate: Boolean(data.duplicate),
      version: data.version,
      payment: data.payment,
      entitlement: data.entitlement,
      engagement: data.engagement,
    }
  }

  return {
    bootstrapEngagement,
    loadEngagementBundle,
    commitLifecycle,
    createPaymentIntent,
    linkCheckoutReference,
    settleVerifiedPayment,
  }
}
