import { NextRequest, NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/require-store-access'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  canTransitionConversion,
  canTransitionFollowUp,
  LEADOPS_CONVERSION_STATUSES,
  LEADOPS_FOLLOW_UP_STATUSES,
} from '@/lib/leadops/qualification.mjs'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const storeSlug = req.nextUrl.searchParams.get('storeId') || ''
  if (!storeSlug) return NextResponse.json({ error: 'storeId required.' }, { status: 400 })

  const ctx = await requireStoreAccess(req, storeSlug)
  if (ctx instanceof NextResponse) return ctx

  const { data, error } = await supabaseAdmin.from('leads')
    .select('id, session_id, source, name, email, phone, need, budget_band, urgency, decision_authority, qualification_status, score, qualification_reason, ai_confidence, conversion_status, follow_up_status, created_at, updated_at')
    .eq('store_id', ctx.store.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[GET /leads]', error)
    return NextResponse.json({ error: 'Failed to fetch leads.' }, { status: 500 })
  }

  const leads = data || []
  const analytics = {
    total: leads.length,
    qualified: leads.filter(l => l.qualification_status === 'qualified').length,
    needsHuman: leads.filter(l => l.qualification_status === 'needs_human').length,
    won: leads.filter(l => l.conversion_status === 'won').length,
  }

  return NextResponse.json({ leads, analytics }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function PATCH(req: NextRequest) {
  let body: { id?: string; storeId?: string; conversionStatus?: string; followUpStatus?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const { id, storeId, conversionStatus, followUpStatus } = body
  if (!id || !storeId)
    return NextResponse.json({ error: 'id and storeId required.' }, { status: 400 })
  if (!conversionStatus && !followUpStatus)
    return NextResponse.json({ error: 'No status update supplied.' }, { status: 400 })
  if (conversionStatus && !LEADOPS_CONVERSION_STATUSES.includes(conversionStatus))
    return NextResponse.json({ error: 'Invalid conversionStatus.' }, { status: 400 })
  if (followUpStatus && !LEADOPS_FOLLOW_UP_STATUSES.includes(followUpStatus))
    return NextResponse.json({ error: 'Invalid followUpStatus.' }, { status: 400 })

  const ctx = await requireStoreAccess(req, storeId)
  if (ctx instanceof NextResponse) return ctx

  const { data: existing, error: lookupError } = await supabaseAdmin.from('leads')
    .select('id, store_id, conversion_status, follow_up_status')
    .eq('id', id).eq('store_id', ctx.store.id).maybeSingle()

  if (lookupError) return NextResponse.json({ error: 'Lead lookup failed.' }, { status: 500 })
  if (!existing) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })

  if (conversionStatus && !canTransitionConversion(existing.conversion_status, conversionStatus))
    return NextResponse.json({ error: 'Invalid conversion lifecycle transition.' }, { status: 409 })
  if (followUpStatus && !canTransitionFollowUp(existing.follow_up_status, followUpStatus))
    return NextResponse.json({ error: 'Invalid follow-up lifecycle transition.' }, { status: 409 })

  const update: Record<string, string> = { updated_at: new Date().toISOString() }
  if (conversionStatus) update.conversion_status = conversionStatus
  if (followUpStatus) update.follow_up_status = followUpStatus

  const { data, error } = await supabaseAdmin.from('leads').update(update)
    .eq('id', id).eq('store_id', ctx.store.id).select().single()

  if (error) {
    console.error('[PATCH /leads]', error)
    return NextResponse.json({ error: 'Failed to update lead.' }, { status: 500 })
  }

  return NextResponse.json({ lead: data })
}
