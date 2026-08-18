import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const storeId = searchParams.get('storeId')

    if (!storeId) {
      return NextResponse.json({ error: 'storeId required' }, { status: 400 })
    }

    const supabase = createServerClient()
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Get conversation count
    const { count: totalConversations } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .gte('started_at', sevenDaysAgo)

    // Get escalation count
    const { count: escalationCount } = await supabase
      .from('escalations')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .gte('created_at', sevenDaysAgo)

    // Get pending escalations
    const { count: pendingEscalations } = await supabase
      .from('escalations')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .in('status', ['pending', 'in_progress'])

    const total = totalConversations || 0
    const escalated = escalationCount || 0
    const resolutionRate = total > 0 ? Math.round(((total - escalated) / total) * 100) : 0

    return NextResponse.json({
      totalConversations: total,
      escalationCount: escalated,
      pendingEscalations: pendingEscalations || 0,
      resolutionRate,
      escalationRate: total > 0 ? Math.round((escalated / total) * 100) : 0,
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
