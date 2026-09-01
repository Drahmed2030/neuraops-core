import { hashRef } from './trust-event.mjs'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_OPERATORS = 50

function denied(status, code) {
  return Object.freeze({ ok: false, status, code })
}

export function operationsUnavailable() {
  return denied(503, 'operations_unavailable')
}

export function parseOperatorUserIds(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError('NTRP operator allowlist is not configured')
  }

  const ids = value.split(',').map((item) => item.trim().toLowerCase())
  if (ids.length > MAX_OPERATORS) throw new TypeError('NTRP operator allowlist is too large')
  if (ids.some((id) => !UUID.test(id))) throw new TypeError('NTRP operator allowlist contains an invalid user ID')
  if (new Set(ids).size !== ids.length) throw new TypeError('NTRP operator allowlist contains duplicates')
  return new Set(ids)
}

export function evaluateOperationsAccess({ user, authError, operatorUserIds } = {}) {
  if (authError || !user || typeof user.id !== 'string' || !UUID.test(user.id)) {
    return denied(401, 'authentication_required')
  }

  let allowedIds
  try {
    allowedIds = parseOperatorUserIds(operatorUserIds)
  } catch {
    return operationsUnavailable()
  }

  if (!allowedIds.has(user.id.toLowerCase())) {
    return denied(403, 'operations_access_denied')
  }

  return Object.freeze({
    ok: true,
    status: 200,
    principalRef: hashRef(user.id),
  })
}
