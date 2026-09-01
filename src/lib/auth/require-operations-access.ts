import { createServerClient } from '@/lib/supabase/server'
import {
  evaluateOperationsAccess,
  operationsUnavailable,
} from '@/lib/trust/operations-access.mjs'

export async function requireOperationsAccess() {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    return evaluateOperationsAccess({
      user,
      authError: error,
      operatorUserIds: process.env.NTRP_OPERATOR_USER_IDS,
    })
  } catch {
    console.error('[operations-auth] Identity verification unavailable')
    return operationsUnavailable()
  }
}
