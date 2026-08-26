import { NextRequest, NextResponse } from 'next/server'
import { requireStoreAccess } from '@/lib/auth/require-store-access'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const storeSlug = new URL(req.url).searchParams.get('storeId')

    if (!storeSlug) {
      return NextResponse.json({ error: 'storeId required' }, { status: 400 })
    }

    const ctx = await requireStoreAccess(req, storeSlug)
    if (ctx instanceof NextResponse) return ctx

    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString()

    const [
      { count: totalConversations },
      { count: escalationCount },
      { count: pendingEscalations },
    ] = await Promise.all([
      supabaseAdmin
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', ctx.store.id)
        .gte('started_at', sevenDaysAgo),

      supabaseAdmin
        .from('escalations')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', ctx.store.id)
        .gte('created_at', sevenDaysAgo),

      supabaseAdmin
        .from('escalations')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', ctx.store.id)
        .in('status', ['pending', 'in_progress']),
    ])

    const total = totalConversations || 0
    const escalated = escalationCount || 0

    return NextResponse.json({
      totalConversations: total,
      escalationCount: escalated,
      pendingEscalations: pendingEscalations || 0,
      resolutionRate:
        total > 0 ? Math.round(((total - escalated) / total) * 100) : 0,
      escalationRate:
        total > 0 ? Math.round((escalated / total) * 100) : 0,
    })
  } catch (err) {
    console.error('Stats error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
