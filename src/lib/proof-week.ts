import { createServerClient } from '@/lib/supabase/server'

const SIGNUP_WINDOW_DAYS = 14
const PROOF_WEEK_DAYS = 7
const READONLY_EXTENSION_DAYS = 14

export type TrialState = 'signup' | 'awaiting_channel' | 'proof_active' | 'proof_ended' | 'converted' | 'expired'

interface StoreTrialInfo {
  id: string
  trial_state: TrialState
  signup_deadline: string | null
  proof_started_at: string | null
  proof_deadline: string | null
  proof_ended_at: string | null
  readonly_until: string | null
}

/**
 * Called once, at store creation. Sets the 14-day signup window.
 * Does NOT start the proof clock — that only happens when a real
 * channel connects.
 */
export async function initializeTrialState(storeId: string): Promise<void> {
  const supabase = createServerClient()
  const signupDeadline = new Date(Date.now() + SIGNUP_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  await supabase
    .from('stores')
    .update({
      trial_state: 'awaiting_channel',
      signup_deadline: signupDeadline.toISOString(),
    })
    .eq('id', storeId)

  await logConversionEvent(storeId, 'signup_started', {})
}

/**
 * Called when a channel (WhatsApp/Instagram/web widget) actually
 * connects and sends/receives its first real message — NOT when
 * the customer merely fills in a form. This is what starts the
 * 7-day proof clock.
 */
export async function startProofWeek(storeId: string, channel: string): Promise<void> {
  const supabase = createServerClient()

  const { data: store } = await supabase
    .from('stores')
    .select('trial_state, proof_started_at')
    .eq('id', storeId)
    .single()

  // Idempotent: if proof week already started, do nothing.
  // This is what prevents a duplicate webhook/event from resetting the clock.
  if (!store || store.proof_started_at) {
    return
  }

  const now = new Date()
  const proofDeadline = new Date(now.getTime() + PROOF_WEEK_DAYS * 24 * 60 * 60 * 1000)

  await supabase
    .from('stores')
    .update({
      trial_state: 'proof_active',
      proof_started_at: now.toISOString(),
      proof_deadline: proofDeadline.toISOString(),
    })
    .eq('id', storeId)

  await logConversionEvent(storeId, 'channel_connected', { channel })
  await logConversionEvent(storeId, 'proof_week_started', { deadline: proofDeadline.toISOString() })
}

/**
 * Computes the store's CURRENT trial state from server clock time —
 * this is the single source of truth every API route and dashboard
 * view must call, rather than trusting a possibly-stale stored value.
 * Also performs the transition (signup->expired, proof_active->proof_ended)
 * if the deadline has passed and the stored state hasn't caught up yet.
 */
export async function resolveCurrentTrialState(storeId: string): Promise<StoreTrialInfo | null> {
  const supabase = createServerClient()

  const { data: store } = await supabase
    .from('stores')
    .select('id, trial_state, signup_deadline, proof_started_at, proof_deadline, proof_ended_at, readonly_until')
    .eq('id', storeId)
    .single()

  if (!store) return null

  const now = new Date()

  // Signup window expired without ever connecting a channel
  if (
    store.trial_state === 'awaiting_channel' &&
    store.signup_deadline &&
    now > new Date(store.signup_deadline)
  ) {
    await supabase.from('stores').update({ trial_state: 'expired' }).eq('id', storeId)
    await logConversionEvent(storeId, 'trial_expired_unconverted', { reason: 'signup_window_expired' })
    return { ...store, trial_state: 'expired' }
  }

  // Proof week deadline passed — transition to proof_ended
  if (
    store.trial_state === 'proof_active' &&
    store.proof_deadline &&
    now > new Date(store.proof_deadline)
  ) {
    const readonlyUntil = new Date(now.getTime() + READONLY_EXTENSION_DAYS * 24 * 60 * 60 * 1000)
    await supabase
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

  // Read-only window also expired
  if (
    store.trial_state === 'proof_ended' &&
    store.readonly_until &&
    now > new Date(store.readonly_until)
  ) {
    await supabase.from('stores').update({ trial_state: 'expired' }).eq('id', storeId)
    return { ...store, trial_state: 'expired' }
  }

  return store as StoreTrialInfo
}

/**
 * Marks a store as converted (paid). Called ONLY from a verified
 * payment webhook handler — never from a client-side "payment
 * success" redirect, per the report's explicit security rule.
 */
export async function markConverted(storeId: string): Promise<void> {
  const supabase = createServerClient()
  await supabase.from('stores').update({ trial_state: 'converted' }).eq('id', storeId)
  await logConversionEvent(storeId, 'subscription_activated', {})
}

export async function logConversionEvent(
  storeId: string,
  eventType: string,
  metadata: Record<string, any>
): Promise<void> {
  const supabase = createServerClient()
  await supabase.from('conversion_events').insert({
    store_id: storeId,
    event_type: eventType,
    metadata,
  })
}

/** Returns how many full days remain until the proof deadline, for UI display. */
export function daysRemaining(deadline: string | null): number {
  if (!deadline) return 0
  const ms = new Date(deadline).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}
