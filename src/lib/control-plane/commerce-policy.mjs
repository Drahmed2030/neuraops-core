const rails = {
  APPLE_IAP: 'apple_iap',
  B2B_WEB: 'b2b_web',
  MANUAL_INVOICE: 'manual_invoice',
  NONE: 'none',
}

function invalid(reason) {
  return { ok: false, reason }
}

export function decideCommerceRail(input) {
  if (!input?.product || !input?.channel || !input?.buyerType || !input?.offeringType) {
    return invalid('invalid_commerce_context')
  }

  const { product, channel, buyerType, offeringType, enterpriseOnly = false, allowsInAppPurchase = false } = input

  if (product === 'cliniverse' && channel === 'ios') {
    if (buyerType === 'individual' || buyerType === 'family') {
      if (offeringType !== 'digital_subscription' && offeringType !== 'digital_feature') {
        return invalid('unsupported_cliniverse_ios_offering')
      }
      return { ok: true, rail: rails.APPLE_IAP, policy: 'ios_consumer_digital_purchase' }
    }

    if (buyerType === 'organization') {
      if (enterpriseOnly) {
        return { ok: true, rail: rails.B2B_WEB, policy: 'enterprise_prepaid_access' }
      }
      if (allowsInAppPurchase) {
        return { ok: true, rail: rails.APPLE_IAP, policy: 'multiplatform_iap_available' }
      }
      return invalid('organization_ios_sale_requires_enterprise_or_iap')
    }
  }

  if (product === 'nexus') {
    if (buyerType !== 'organization') return invalid('nexus_b2b_only')
    if (offeringType === 'pilot' || offeringType === 'professional_service') {
      return { ok: true, rail: rails.B2B_WEB, policy: 'nexus_b2b_service' }
    }
    if (offeringType === 'manual_invoice') {
      return { ok: true, rail: rails.MANUAL_INVOICE, policy: 'nexus_manual_invoice' }
    }
    return invalid('unsupported_nexus_offering')
  }

  return invalid('no_matching_commerce_policy')
}

export function assertRailAllowed(context, requestedRail) {
  const decision = decideCommerceRail(context)
  if (!decision.ok) return decision
  if (decision.rail !== requestedRail) {
    return { ok: false, reason: 'commerce_rail_mismatch', requiredRail: decision.rail, policy: decision.policy }
  }
  return { ok: true, rail: requestedRail, policy: decision.policy }
}

export const COMMERCE_RAILS = rails
