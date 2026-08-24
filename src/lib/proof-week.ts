import { supabaseAdmin } from '@/lib/supabase/admin'

const SIGNUP_WINDOW_DAYS = 14
const PROOF_WEEK_DAYS = 7
const READONLY_EXTENSION_DAYS = 14

export type TrialState =
  | 'signup'
  | 'awaiting_channel'
  | 'proof_active'
  | 'proof_ended'
  | 'converted'
  | 'expired'

interface StoreTrialInfo {
  id: string
  trial_state: TrialState
  signup_deadline: string | null
  proof_started_at: string | null
  proof_deadline: string | null
  proof_ended_at: string | null
  readonly_until: string | null
}

export async function initializeTrialState(storeId: string): Promise<void> {
  const signupDeadline = new Date(
    Date.now() + SIGNUP_WINDOW_DAYS * 24 * 60 * 60 * 1000
  )

  const { error } = await supabaseAdmin
    .from('stores')
    .update({
      trial_state: 'awaiting_channel',
      signup_deadline: signupDeadline.toISOString(),
    })
    .eq('id', storeId)

  if (error) throw error

  await logConversionEvent(storeId, 'signup_started', {})
}

export async function startProofWeek(
  storeId: string,
  channel: string
): Promise<void> {
  const { data: store, error: storeError } = await supabaseAdmin
    .from('stores')
    .select('trial_state, proof_started_at')
    .eq('id', storeId)
    .single()

  if (storeError || !store) {
    if (storeError) console.error('Proof-week store lookup failed:', storeError.message)
    return
  }

  if (store.proof_started_at) return

  const now = new Date()
  const proofDeadline = new Date(
    now.getTime() + PROOF_WEEK_DAYS * 24 * 60 * 60 * 1000
  )

  const { error: updateError } = await supabaseAdmin
    .from('stores')
    .update({
      trial_state: 'proof_active',
      proof_started_at: now.toISOString(),
      proof_deadline: proofDeadline.toISOString(),
    })
    .eq('id', storeId)
    .is('proof_started_at', null)

  if (updateError) {
    console.error('Proof-week activation failed:', updateError.message)
    return
  }

  await logConversionEvent(storeId, 'channel_connected', { channel })
  await logConversionEvent(storeId, 'proof_week_started', {
    deadline: proofDeadline.toISOString(),
  })
}

export async function resolveCurrentTrialState(
  storeId: string
): Promise<StoreTrialInfo | null> {
  const { data: store, error } = await supabaseAdmin
    .from('stores')
    .select(
      'id, trial_state, signup_deadline, proof_started_at, proof_deadline, proof_ended_at, readonly_until'
    )
    .eq('id', storeId)
    .single()

  if (error || !store) return null

  const now = new Date()

  if (
    store.trial_state === 'awaiting_channel' &&
    store.signup_deadline &&
    now > new Date(store.signup_deadline)
  ) {
    await supabaseAdmin
      .from('stores')
      .update({ trial_state: 'expired' })
      .eq('id', storeId)

    await logConversionEvent(storeId, 'trial_expired_unconverted', {
      reason: 'signup_window_expired',
    })

    return { ...store, trial_state: 'expired' }
  }

  if (
    store.trial_state === 'proof_active' &&
    store.proof_deadline &&
    now > new Date(store.proof_deadline)
  ) {
    const readonlyUntil = new Date(
      now.getTime() + READONLY_EXTENSION_DAYS * 24 * 60 * 60 * 1000
    )

    await supabaseAdmin
      .from('stores')
      .update({
        trial_state: 'proof_ended',
        proof_ended_at: now.toISOString(),
        readonly_until: readonlyUntil.toISOString(),
      })
      .eq('id', storeId)

    await logConversionEvent(storeId, 'proof_week_ended', {})

    return {
      ...store,
      trial_state: 'proof_ended',
      proof_ended_at: now.toISOString(),
      readonly_until: readonlyUntil.toISOString(),
    }
  }

  if (
    store.trial_state === 'proof_ended' &&
    store.readonly_until &&
    now > new Date(store.readonly_until)
  ) {
    await supabaseAdmin
      .from('stores')
      .update({ trial_state: 'expired' })
      .eq('id', storeId)

    return { ...store, trial_state: 'expired' }
  }

  return store as StoreTrialInfo
}

export async function markConverted(storeId: string): Promise<void> {
  await supabaseAdmin
    .from('stores')
    .update({ trial_state: 'converted' })
    .eq('id', storeId)

  await logConversionEvent(storeId, 'subscription_activated', {})
}

export async function logConversionEvent(
  storeId: string,
  eventType: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const { error } = await supabaseAdmin.from('conversion_events').insert({
    store_id: storeId,
    event_type: eventType,
    metadata,
  })

  if (error) console.error('Conversion event logging failed:', error.message)
}

export function daysRemaining(deadline: string | null): number {
  if (!deadline) return 0
  const ms = new Date(deadline).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}
