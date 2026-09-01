export function withSupabasePaymentProviderLookup(basePersistence, supabase) {
  if (!basePersistence?.loadEngagementBundle) throw new Error('invalid_base_persistence')
  if (!supabase || typeof supabase.rpc !== 'function') throw new Error('invalid_supabase_client')

  async function findPaymentByProviderReference({ provider, providerReference }) {
    if (!provider || !providerReference) return null
    const { data, error } = await supabase.rpc('control_plane_find_payment_by_provider_reference', {
      p_provider: provider,
      p_provider_reference: providerReference,
    })
    if (error) throw new Error(`control_plane_payment_lookup_failed:${error.message}`)
    return data ?? null
  }

  return {
    ...basePersistence,
    findPaymentByProviderReference,
  }
}
