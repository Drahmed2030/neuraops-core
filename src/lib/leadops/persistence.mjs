export async function persistLeadIdempotently(adapter, record) {
  if (!record?.store_id || !record?.session_id) throw new Error('invalid_lead_key')
  const saved = await adapter.upsert(record)
  if (!saved?.id) throw new Error('lead_persistence_failed')
  if (saved.store_id !== record.store_id || saved.session_id !== record.session_id)
    throw new Error('lead_scope_mismatch')
  return saved
}

export function leadScopedToStore(lead, storeId) {
  return Boolean(lead?.store_id && storeId && lead.store_id === storeId)
}
