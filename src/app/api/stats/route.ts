import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const storeId = searchParams.get('storeId') || 'demo-store'
    const supabase = createServerClient()
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: store } = await supabase.from('stores').select('id').eq('slug', storeId).maybeSingle()
    const realId = store?.id

    if (!realId) {
      return NextResponse.json({ totalConversations: 0, escalationCount: 0, pendingEscalations: 0, resolutionRate: 0, escalationRate: 0 })
    }

    const { count: totalConversations } = await supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('store_id', realId).gte('started_at', sevenDaysAgo)
    const { count: escalationCount } = await supabase.from('escalations').select('*', { count: 'exact', head: true }).eq('store_id', realId).gte('created_at', sevenDaysAgo)
    const { count: pendingEscalations } = await supabase.from('escalations').select('*', { count: 'exact', head: true }).eq('store_id', realId).in('status', ['pending', 'in_progress'])

    const total = totalConversations || 0
    const escalated = escalationCount || 0

    return NextResponse.json({
      totalConversations: total,
      escalationCount: escalated,
      pendingEscalations: pendingEscalations || 0,
      resolutionRate: total > 0 ? Math.round(((total - escalated) / total) * 100) : 0,
      escalationRate: total > 0 ? Math.round((escalated / total) * 100) : 0,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
