import { NextRequest, NextResponse } from 'next/server'
import { resolveCurrentTrialState, daysRemaining } from '@/lib/proof-week'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const storeSlug = searchParams.get('storeId')

    if (!storeSlug) {
      return NextResponse.json({ error: 'storeId required' }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('slug', storeSlug)
      .maybeSingle()

    if (!store) {
      return NextResponse.json({ error: 'store not found' }, { status: 404 })
    }

    const trialInfo = await resolveCurrentTrialState(store.id)

    if (!trialInfo) {
      return NextResponse.json({ error: 'could not resolve trial state' }, { status: 500 })
    }

    return NextResponse.json({
      trialState: trialInfo.trial_state,
      signupDeadline: trialInfo.signup_deadline,
      proofStartedAt: trialInfo.proof_started_at,
      proofDeadline: trialInfo.proof_deadline,
      proofEndedAt: trialInfo.proof_ended_at,
      readonlyUntil: trialInfo.readonly_until,
      daysRemaining: trialInfo.trial_state === 'proof_active' ? daysRemaining(trialInfo.proof_deadline) : null,
    })
  } catch (err: any) {
    console.error('Trial status error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
