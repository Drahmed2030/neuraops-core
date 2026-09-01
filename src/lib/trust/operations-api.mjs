import { buildOperationsReadModel } from './operations-read-model.mjs'

export const OPERATIONS_RESPONSE_HEADERS = Object.freeze({
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  Expires: '0',
  Pragma: 'no-cache',
  'Surrogate-Control': 'no-store',
  Vary: 'Cookie',
  'X-Content-Type-Options': 'nosniff',
})

function errorResponse(status, code) {
  return {
    status,
    headers: { ...OPERATIONS_RESPONSE_HEADERS },
    body: { error: { code } },
  }
}

export function buildOperationsApiResponse({
  access,
  generatedAt = new Date().toISOString(),
  readModelFactory = buildOperationsReadModel,
  onError = () => {},
} = {}) {
  if (!access?.ok) {
    const status = [401, 403, 503].includes(access?.status) ? access.status : 503
    const code = {
      401: 'authentication_required',
      403: 'operations_access_denied',
      503: 'operations_unavailable',
    }[status]
    return errorResponse(status, code)
  }

  try {
    const snapshot = readModelFactory({ generatedAt })
    return {
      status: 200,
      headers: { ...OPERATIONS_RESPONSE_HEADERS },
      body: {
        apiVersion: 'v1',
        data: snapshot,
      },
    }
  } catch (error) {
    onError(error)
    return errorResponse(503, 'operations_unavailable')
  }
}
