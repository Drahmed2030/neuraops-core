export const LEADOPS_BUDGET_BANDS = ['unknown', 'low', 'medium', 'high']
export const LEADOPS_URGENCY = ['unknown', 'later', '30d', '7d', 'now']
export const LEADOPS_AUTHORITY = ['unknown', 'influencer', 'decision_maker']
export const LEADOPS_STATUSES = ['pending', 'qualified', 'unqualified', 'needs_human']
export const LEADOPS_CONVERSION_STATUSES = ['new', 'contacted', 'won', 'lost']
export const LEADOPS_FOLLOW_UP_STATUSES = ['none', 'pending', 'in_progress', 'done', 'escalation_failed']

function enumValue(value, allowed) {
  return allowed.includes(value) ? value : 'unknown'
}

export function normalizeLeadInput(input = {}) {
  const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : ''
  return {
    name: clean(input.name, 160) || null,
    email: clean(input.email, 320) || null,
    phone: clean(input.phone, 80) || null,
    need: clean(input.need, 3000) || null,
    budgetBand: enumValue(input.budgetBand, LEADOPS_BUDGET_BANDS),
    urgency: enumValue(input.urgency, LEADOPS_URGENCY),
    decisionAuthority: enumValue(input.decisionAuthority, LEADOPS_AUTHORITY),
  }
}

export function scoreLead(input) {
  const lead = normalizeLeadInput(input)
  let score = 0
  if (lead.need) score += 20
  score += { unknown: 0, low: 10, medium: 20, high: 30 }[lead.budgetBand]
  score += { unknown: 0, later: 5, '30d': 15, '7d': 25, now: 25 }[lead.urgency]
  score += { unknown: 0, influencer: 10, decision_maker: 25 }[lead.decisionAuthority]
  return Math.min(100, Math.max(0, score))
}

export function qualificationDecision(input, aiConfidence = 1) {
  const lead = normalizeLeadInput(input)
  const score = scoreLead(lead)

  if (!lead.need) return { status: 'needs_human', score, reason: 'missing_need' }
  if (!Number.isFinite(aiConfidence) || aiConfidence < 0.55)
    return { status: 'needs_human', score, reason: 'low_ai_confidence' }
  if (lead.budgetBand === 'high' && lead.decisionAuthority === 'unknown')
    return { status: 'needs_human', score, reason: 'high_value_ambiguous_authority' }
  if (score >= 70) return { status: 'qualified', score, reason: 'score_qualified' }
  if (score < 40) return { status: 'unqualified', score, reason: 'score_unqualified' }
  return { status: 'needs_human', score, reason: 'score_needs_human' }
}

export function parseLeadAiResponse(raw) {
  let parsed
  try { parsed = JSON.parse(raw) } catch { throw new Error('invalid_lead_ai_json') }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw new Error('invalid_lead_ai_response')
  if (typeof parsed.answer !== 'string' || !parsed.answer.trim())
    throw new Error('invalid_lead_ai_response')
  if (typeof parsed.confidence !== 'number' || !Number.isFinite(parsed.confidence) || parsed.confidence < 0 || parsed.confidence > 1)
    throw new Error('invalid_lead_ai_response')
  return { answer: parsed.answer.trim().slice(0, 4000), confidence: parsed.confidence }
}

export function canTransitionConversion(current, next) {
  if (!LEADOPS_CONVERSION_STATUSES.includes(current) || !LEADOPS_CONVERSION_STATUSES.includes(next)) return false
  if (current === next) return true
  if (current === 'won' || current === 'lost') return false
  if (current === 'new') return ['contacted', 'won', 'lost'].includes(next)
  return current === 'contacted' && ['won', 'lost'].includes(next)
}

export function canTransitionFollowUp(current, next) {
  if (!LEADOPS_FOLLOW_UP_STATUSES.includes(current) || !LEADOPS_FOLLOW_UP_STATUSES.includes(next)) return false
  if (current === next) return true
  const allowed = {
    none: ['pending'],
    pending: ['in_progress', 'done'],
    in_progress: ['pending', 'done'],
    done: ['pending'],
    escalation_failed: ['pending'],
  }
  return allowed[current].includes(next)
}
