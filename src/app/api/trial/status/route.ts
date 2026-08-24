import { NextRequest, NextResponse } from 'next/server'
import { resolveCurrentTrialState, daysRemaining } from '@/lib/proof-week'
import { requireStoreAccess } from '@/lib/auth/require-store-access'

export async function GET(req: NextRequest) {
  try {
    const storeSlug = new URL(req.url).searchParams.get('storeId')

    if (!storeSlug) {
      return NextResponse.json({ error: 'storeId required' }, { status: 400 })
    }

    const ctx = await requireStoreAccess(req, storeSlug)
    if (ctx instanceof NextResponse) return ctx

    const trialInfo = await resolveCurrentTrialState(ctx.store.id)

    if (!trialInfo) {
      return NextResponse.json(
        { error: 'could not resolve trial state' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      trialState: trialInfo.trial_state,
      signupDeadline: trialInfo.signup_deadline,
      proofStartedAt: trialInfo.proof_started_at,
      proofDeadline: trialInfo.proof_deadline,
      proofEndedAt: trialInfo.proof_ended_at,
      readonlyUntil: trialInfo.readonly_until,
      daysRemaining:
        trialInfo.trial_state === 'proof_active'
          ? daysRemaining(trialInfo.proof_deadline)
          : null,
    })
  } catch (err) {
    console.error('Trial status error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
