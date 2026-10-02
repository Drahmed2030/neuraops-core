import { NextRequest, NextResponse } from 'next/server'
import { releaseFingerprint, releaseHeaders } from '@/lib/reliability/release-meta.mjs'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      status: 'ok',
      check: 'liveness',
      request: {
        requestId: request.headers.get('x-neuraops-request-id'),
        correlationId: request.headers.get('x-neuraops-correlation-id'),
      },
      release: releaseFingerprint(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        ...releaseHeaders(),
      },
    }
  )
}
