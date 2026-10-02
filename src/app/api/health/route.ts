import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { releaseFingerprint, releaseHeaders } from '@/lib/reliability/release-meta.mjs'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { error } = await supabaseAdmin.from('stores').select('id').limit(1)

    if (error) {
      console.error('[health] database unavailable:', error.message)
      return NextResponse.json(
        {
          status: 'unavailable',
          database: 'unavailable',
          release: releaseFingerprint(),
        },
        {
          status: 503,
          headers: {
            'Cache-Control': 'no-store',
            ...releaseHeaders(),
          },
        }
      )
    }

    return NextResponse.json(
      {
        status: 'ok',
        database: 'ok',
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
  } catch (error) {
    console.error('[health] readiness exception:', error)
    return NextResponse.json(
      {
        status: 'unavailable',
        database: 'unavailable',
        release: releaseFingerprint(),
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
          ...releaseHeaders(),
        },
      }
    )
  }
}
