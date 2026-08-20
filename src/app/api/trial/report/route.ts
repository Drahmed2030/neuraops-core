import { NextRequest, NextResponse } from 'next/server'
import { generateProofReport, getLatestProofReport } from '@/lib/proof-report'
import { logConversionEvent } from '@/lib/proof-week'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const storeSlug = searchParams.get('storeId')
    const dayParam = searchParams.get('day')
    const day = dayParam ? (parseInt(dayParam, 10) as 3 | 6 | 7) : undefined

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

    let report = await getLatestProofReport(store.id, day)

    // Generate on first request for that day if it doesn't exist yet
    if (!report && day) {
      const fresh = await generateProofReport(store.id, day)
      report = {
        store_id: store.id,
        report_day: day,
        total_conversations: fresh.totalConversations,
        resolved_count: fresh.resolvedCount,
        escalated_count: fresh.escalatedCount,
        avg_first_response_seconds: fresh.avgFirstResponseSeconds,
        top_topics: fresh.topTopics,
        generated_at: new Date().toISOString(),
      } as any

      if (day === 3) await logConversionEvent(store.id, 'day3_report_viewed', {})
      if (day === 6) await logConversionEvent(store.id, 'day6_report_viewed', {})
    }

    if (!report) {
      return NextResponse.json({ error: 'no report available yet' }, { status: 404 })
    }

    return NextResponse.json({
      reportDay: report.report_day,
      totalConversations: report.total_conversations,
      resolvedCount: report.resolved_count,
      escalatedCount: report.escalated_count,
      avgFirstResponseSeconds: report.avg_first_response_seconds,
      topTopics: report.top_topics,
      generatedAt: report.generated_at,
    })
  } catch (err: any) {
    console.error('Proof report error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
