const DEFAULT_TIMEOUT_MS = 8_000
const DEFAULT_RETRIES = 1

export const VALID_SPECIALIST_AGENTS = [
  'order_tracker',
  'returns',
  'product_expert',
  'menu_offers',
  'store_info',
]

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isConfidence(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

export function parseRoutingResponse(raw) {
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('invalid_ai_json')
  }

  if (
    !isObject(parsed) ||
    !VALID_SPECIALIST_AGENTS.includes(parsed.agent) ||
    typeof parsed.reasoning !== 'string' ||
    !isConfidence(parsed.confidence)
  ) {
    throw new Error('invalid_routing_response')
  }

  return {
    agent: parsed.agent,
    reasoning: parsed.reasoning.slice(0, 500),
    confidence: parsed.confidence,
  }
}

export function parseAgentResponse(raw) {
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('invalid_ai_json')
  }

  const escalationReasonValid =
    parsed?.escalation_reason === null || typeof parsed?.escalation_reason === 'string'

  if (
    !isObject(parsed) ||
    typeof parsed.answer !== 'string' ||
    parsed.answer.trim().length === 0 ||
    !isConfidence(parsed.confidence) ||
    typeof parsed.should_escalate !== 'boolean' ||
    !escalationReasonValid
  ) {
    throw new Error('invalid_agent_response')
  }

  return {
    answer: parsed.answer.trim().slice(0, 8000),
    confidence: parsed.confidence,
    should_escalate: parsed.should_escalate,
    escalation_reason:
      typeof parsed.escalation_reason === 'string'
        ? parsed.escalation_reason.trim().slice(0, 1000) || null
        : null,
  }
}

function retryableProviderError(error) {
  const status = Number(error?.status)
  if ([408, 409, 429].includes(status) || status >= 500) return true

  const name = String(error?.name || '')
  const code = String(error?.code || '')
  return (
    name === 'AbortError' ||
    name.includes('Timeout') ||
    name.includes('APIConnection') ||
    ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'].includes(code)
  )
}

export async function callWithTimeoutAndRetry(
  operation,
  { timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES } = {}
) {
  let attempt = 0
  let lastError

  while (attempt <= retries) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      return await operation(controller.signal)
    } catch (error) {
      lastError = error
      if (attempt >= retries || !retryableProviderError(error)) throw error
    } finally {
      clearTimeout(timer)
    }

    attempt += 1
  }

  throw lastError
}

export function providerFallbackReason(error) {
  const message = String(error?.message || '')
  if (message.includes('invalid_ai_json') || message.includes('invalid_')) {
    return 'invalid_provider_response'
  }
  return 'provider_unavailable'
}
