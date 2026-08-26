import { NextRequest, NextResponse } from 'next/server'
import { getLatestProofReport } from '@/lib/proof-report'
import { requireStoreAccess } from '@/lib/auth/require-store-access'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const storeSlug = searchParams.get('storeId')
    const dayParam = searchParams.get('day')

    if (!storeSlug) {
      return NextResponse.json({ error: 'storeId required' }, { status: 400 })
    }

    let day: 3 | 6 | 7 | undefined

    if (dayParam) {
      const parsed = Number(dayParam)
      if (parsed !== 3 && parsed !== 6 && parsed !== 7) {
        return NextResponse.json(
          { error: 'invalid report day' },
          { status: 400 }
        )
      }
      day = parsed
    }

    const ctx = await requireStoreAccess(req, storeSlug)
    if (ctx instanceof NextResponse) return ctx

    const report = await getLatestProofReport(ctx.store.id, day)

    if (!report) {
      return NextResponse.json(
        { error: 'no report available yet' },
        { status: 404 }
      )
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
  } catch (err) {
    console.error('Proof report error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
