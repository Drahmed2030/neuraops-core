import { NextResponse } from 'next/server'
import { releaseFingerprint, releaseHeaders } from '@/lib/reliability/release-meta.mjs'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      check: 'liveness',
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
