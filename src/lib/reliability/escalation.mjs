export const ACTIVE_ESCALATION_STATUSES = ['pending', 'in_progress']

export async function ensureActiveEscalation(adapter, input) {
  const existing = await adapter.findActive(input.conversationId, input.storeId)
  if (existing?.id) {
    const statusUpdated = await adapter.markConversationEscalated(input)
    return statusUpdated
      ? { ok: true, created: false, escalationId: existing.id }
      : { ok: false, created: false, escalationId: existing.id }
  }

  const created = await adapter.create(input)

  if (created?.duplicate) {
    const racedExisting = await adapter.findActive(input.conversationId, input.storeId)
    if (!racedExisting?.id) return { ok: false, created: false, escalationId: null }

    const statusUpdated = await adapter.markConversationEscalated(input)
    return statusUpdated
      ? { ok: true, created: false, escalationId: racedExisting.id }
      : { ok: false, created: false, escalationId: racedExisting.id }
  }

  if (!created?.id) return { ok: false, created: false, escalationId: null }

  const statusUpdated = await adapter.markConversationEscalated(input)
  if (!statusUpdated) {
    if (adapter.remove) await adapter.remove(created.id, input.storeId)
    return { ok: false, created: true, escalationId: created.id }
  }

  return { ok: true, created: true, escalationId: created.id }
}

export function conversationStatusAfterResolution(activeEscalationCount) {
  return activeEscalationCount > 0 ? 'escalated' : 'open'
}

export function conversationUpdateForEscalationStatus(escalationStatus, activeEscalationCount = 0) {
  if (ACTIVE_ESCALATION_STATUSES.includes(escalationStatus)) {
    return { status: 'escalated' }
  }

  return { status: conversationStatusAfterResolution(activeEscalationCount) }
}

export async function transitionToActiveEscalationStatus(adapter, input) {
  const conversation = await adapter.getConversationStatus(input.conversationId, input.storeId)
  if (!conversation?.status) return { ok: false, stage: 'conversation_read' }

  const conversationSynced = await adapter.setConversationStatus(
    input.conversationId,
    input.storeId,
    'escalated'
  )
  if (!conversationSynced) return { ok: false, stage: 'conversation_sync' }

  const escalationUpdate = await adapter.setEscalationStatus(
    input.escalationId,
    input.storeId,
    input.status
  )
  if (escalationUpdate?.ok) {
    return { ok: true, data: escalationUpdate.data }
  }

  const activeEscalationCount = await adapter.countActiveEscalations(
    input.conversationId,
    input.storeId
  )
  const repairStatus = activeEscalationCount > 0 ? 'escalated' : conversation.status
  const repaired = await adapter.setConversationStatus(
    input.conversationId,
    input.storeId,
    repairStatus
  )

  return {
    ok: false,
    stage: 'escalation_update',
    repaired: Boolean(repaired),
    repairStatus,
  }
}
