export const TERMINAL_CONVERSION_STATUSES = ['won', 'lost']

export function isTerminalConversionStatus(status) {
  return TERMINAL_CONVERSION_STATUSES.includes(status)
}

export function publicLeadSubmissionAction(existingLead) {
  return isTerminalConversionStatus(existingLead?.conversion_status) ? 'terminal' : 'process'
}

export async function persistLeadIdempotently(adapter, record) {
  if (!record?.store_id || !record?.session_id) throw new Error('invalid_lead_key')
  const saved = await adapter.upsert(record)
  if (!saved?.id) throw new Error('lead_persistence_failed')
  if (saved.store_id !== record.store_id || saved.session_id !== record.session_id)
    throw new Error('lead_scope_mismatch')
  return saved
}

export async function persistPublicLeadIdempotently(adapter, record) {
  if (!record?.store_id || !record?.session_id) throw new Error('invalid_lead_key')

  const existing = await adapter.find(record.store_id, record.session_id)
  if (isTerminalConversionStatus(existing?.conversion_status)) {
    return { lead: existing, terminal: true, updated: false }
  }

  if (existing?.id) {
    const updated = await adapter.updateNonTerminal(existing.id, record.store_id, record)
    if (updated?.id) {
      if (updated.store_id !== record.store_id || updated.session_id !== record.session_id)
        throw new Error('lead_scope_mismatch')
      return { lead: updated, terminal: false, updated: true }
    }

    const canonical = await adapter.find(record.store_id, record.session_id)
    if (!canonical?.id) throw new Error('lead_persistence_failed')
    if (isTerminalConversionStatus(canonical.conversion_status)) {
      return { lead: canonical, terminal: true, updated: false }
    }
    throw new Error('lead_persistence_failed')
  }

  const created = await adapter.insert(record)
  if (created?.id) {
    if (created.store_id !== record.store_id || created.session_id !== record.session_id)
      throw new Error('lead_scope_mismatch')
    return { lead: created, terminal: false, updated: false }
  }

  const raced = await adapter.find(record.store_id, record.session_id)
  if (!raced?.id) throw new Error('lead_persistence_failed')
  if (isTerminalConversionStatus(raced.conversion_status)) {
    return { lead: raced, terminal: true, updated: false }
  }

  const updated = await adapter.updateNonTerminal(raced.id, record.store_id, record)
  if (!updated?.id) {
    const canonical = await adapter.find(record.store_id, record.session_id)
    if (isTerminalConversionStatus(canonical?.conversion_status)) {
      return { lead: canonical, terminal: true, updated: false }
    }
    throw new Error('lead_persistence_failed')
  }
  if (updated.store_id !== record.store_id || updated.session_id !== record.session_id)
    throw new Error('lead_scope_mismatch')
  return { lead: updated, terminal: false, updated: true }
}

export function leadScopedToStore(lead, storeId) {
  return Boolean(lead?.store_id && storeId && lead.store_id === storeId)
}
