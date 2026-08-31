export function grantEntitlement(grants, grant) {
  if (!grant?.organizationId || !grant?.key || !grant?.status || !grant?.source || !grant?.startsAt) {
    return { ok: false, reason: 'invalid_entitlement' }
  }

  const activeIndex = grants.findIndex(item =>
    item.organizationId === grant.organizationId &&
    item.key === grant.key &&
    item.status === 'active'
  )

  if (activeIndex >= 0) {
    const existing = grants[activeIndex]
    const unchanged =
      existing.source === grant.source &&
      existing.startsAt === grant.startsAt &&
      existing.endsAt === grant.endsAt
    if (unchanged) return { ok: true, created: false, grants }

    const next = [...grants]
    next[activeIndex] = grant
    return { ok: true, created: false, updated: true, grants: next }
  }

  return { ok: true, created: true, grants: [...grants, grant] }
}

export function revokeEntitlement(grants, organizationId, key) {
  let changed = false
  const next = grants.map(item => {
    if (item.organizationId === organizationId && item.key === key && item.status === 'active') {
      changed = true
      return { ...item, status: 'revoked' }
    }
    return item
  })
  return { ok: true, changed, grants: next }
}

export function hasEntitlement(grants, organizationId, key, at = new Date().toISOString()) {
  return grants.some(item => {
    if (item.organizationId !== organizationId || item.key !== key || item.status !== 'active') return false
    if (item.startsAt > at) return false
    if (item.endsAt && item.endsAt <= at) return false
    return true
  })
}
