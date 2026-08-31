import { assertRailAllowed } from './commerce-policy.mjs'

export async function createPolicyApprovedCheckout(paymentPort, request) {
  if (!paymentPort?.rail || typeof paymentPort.createCheckout !== 'function') {
    return { ok: false, reason: 'invalid_payment_port' }
  }
  if (!request?.commerceContext) return { ok: false, reason: 'commerce_context_required' }

  const policy = assertRailAllowed(request.commerceContext, paymentPort.rail)
  if (!policy.ok) return policy

  if (request.approvedRail && request.approvedRail !== paymentPort.rail) {
    return { ok: false, reason: 'approved_rail_mismatch', requiredRail: paymentPort.rail }
  }

  const checkout = await paymentPort.createCheckout({
    ...request,
    approvedRail: paymentPort.rail,
  })

  return {
    ok: true,
    policy: policy.policy,
    rail: paymentPort.rail,
    checkout,
  }
}
