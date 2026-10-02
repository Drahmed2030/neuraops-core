const OPAQUE_ID = /^[A-Za-z0-9._:-]{8,128}$/

function validOpaque(value) {
  return typeof value === 'string' && OPAQUE_ID.test(value)
}

export function resolveRequestContext(headers = new Headers(), randomUUID = () => crypto.randomUUID()) {
  const requestId = randomUUID()
  const incomingCorrelation = headers.get('x-neuraops-correlation-id') || headers.get('x-correlation-id')
  const correlationId = validOpaque(incomingCorrelation) ? incomingCorrelation : requestId

  return Object.freeze({ requestId, correlationId })
}

export function applyRequestContext(headers, context) {
  const next = new Headers(headers)
  next.set('x-neuraops-request-id', context.requestId)
  next.set('x-neuraops-correlation-id', context.correlationId)
  return next
}
