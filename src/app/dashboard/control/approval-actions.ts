'use server'

import { requireOperationsAccess } from '@/lib/auth/require-operations-access'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DIGEST = /^[a-f0-9]{64}$/

// Company-specific operations gate; no store permissions or caller role claims.
// Privileged transport is loaded only after server-verified identity + allowlist.
async function access() {
  const result = await requireOperationsAccess()
  if (!result.ok) return result
  if (process.env.COMPANY_APPROVAL_RECORDING_ENABLED !== 'true') {
    return { ok: false as const, status: 503, code: 'approval_recording_disabled' }
  }
  return result
}

export async function reviewCompanyTask(taskId: string) {
  const actor = await access()
  if (!actor.ok) return { status: actor.status, code: actor.code }
  if (typeof taskId !== 'string' || !UUID.test(taskId)) return { status: 400, code: 'invalid_review_request' }
  try {
    const { supabaseAdmin } = await import('@/lib/supabase/admin')
    const { data, error } = await supabaseAdmin.rpc('company_task_review_details', { p_task_id: taskId, p_actor_reference: actor.principalRef })
    if (error || !data) return { status: 409, code: 'review_unavailable' }
    return { status: 200, review: data }
  } catch { return { status: 503, code: 'approval_service_unavailable' } }
}

export async function recordCompanyTaskApproval(input: unknown) {
  const actor = await access()
  if (!actor.ok) return { status: actor.status, code: actor.code }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { status: 400, code: 'invalid_approval_request' }
  const value = input as Record<string, unknown>
  if (Object.keys(value).length !== 3 || Object.keys(value).some(k => !['taskId', 'digest', 'requestKey'].includes(k)) ||
      typeof value.taskId !== 'string' || !UUID.test(value.taskId) ||
      typeof value.digest !== 'string' || !DIGEST.test(value.digest) ||
      typeof value.requestKey !== 'string' || !UUID.test(value.requestKey)) return { status: 400, code: 'invalid_approval_request' }
  try {
    const { supabaseAdmin } = await import('@/lib/supabase/admin')
    const { data, error } = await supabaseAdmin.rpc('company_record_task_approval', {
      p_task_id: value.taskId,
      p_expected_digest: value.digest,
      p_actor_reference: actor.principalRef,
      p_request_key: value.requestKey,
    })
    if (error || !data || data.status !== 'RECORDED_NOT_EXECUTED') return { status: 409, code: 'approval_rejected' }
    return { status: 200, receipt: data }
  } catch { return { status: 503, code: 'approval_service_unavailable' } }
}


export async function createCompanyTaskRequest(input: unknown) {
  const actor = await access()
  if (!actor.ok) return { status: actor.status, code: actor.code }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { status: 400, code: 'invalid_task_request' }
  const value = input as Record<string, unknown>
  const keys = ['agentId', 'description', 'actionClass', 'budgetCents', 'requestKey']
  if (Object.keys(value).length !== keys.length || Object.keys(value).some(k => !keys.includes(k)) ||
      typeof value.agentId !== 'string' || !UUID.test(value.agentId) ||
      typeof value.description !== 'string' || !value.description.trim() || value.description.length > 2000 ||
      typeof value.actionClass !== 'string' || !['RESEARCH', 'INTERNAL_CREATE', 'REVIEW', 'ASSURANCE'].includes(value.actionClass) ||
      typeof value.budgetCents !== 'number' || !Number.isInteger(value.budgetCents) || value.budgetCents < 0 || value.budgetCents > 5 ||
      typeof value.requestKey !== 'string' || !UUID.test(value.requestKey)) return { status: 400, code: 'invalid_task_request' }
  try {
    const { supabaseAdmin } = await import('@/lib/supabase/admin')
    const { data, error } = await supabaseAdmin.rpc('company_create_task_request', {
      p_agent_id: value.agentId, p_description: value.description,
      p_action_class: value.actionClass, p_budget_cents: value.budgetCents,
      p_actor_reference: actor.principalRef, p_request_key: value.requestKey,
    })
    if (error || !data || data.status !== 'WAITING_APPROVAL') return { status: 409, code: 'task_request_rejected' }
    return { status: 200, request: data }
  } catch { return { status: 503, code: 'approval_service_unavailable' } }
}
