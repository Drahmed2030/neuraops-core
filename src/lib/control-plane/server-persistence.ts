import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseControlPlanePersistence } from './supabase-persistence.mjs'
import { withSupabaseRenewalPersistence } from './supabase-renewal-persistence.mjs'

const controlPlaneUrl = process.env.CONTROL_PLANE_SUPABASE_URL
const controlPlaneServiceRoleKey = process.env.CONTROL_PLANE_SUPABASE_SERVICE_ROLE_KEY
const controlPlaneEnv = process.env.CONTROL_PLANE_ENV

export function getControlPlaneServerPersistence() {
  if (controlPlaneEnv !== 'development') {
    throw new Error('control_plane_non_production_only')
  }
  if (!controlPlaneUrl || !controlPlaneServiceRoleKey) {
    throw new Error('control_plane_environment_not_configured')
  }

  const supabase = createClient(controlPlaneUrl, controlPlaneServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const base = createSupabaseControlPlanePersistence(supabase)
  return withSupabaseRenewalPersistence(base, supabase)
}
