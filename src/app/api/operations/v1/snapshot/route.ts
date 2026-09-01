import { NextResponse } from 'next/server'
import { requireOperationsAccess } from '@/lib/auth/require-operations-access'
import { emitRuntimeIncident } from '@/lib/reliability/runtime-sensor.mjs'
import { buildOperationsApiResponse } from '@/lib/trust/operations-api.mjs'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const access = await requireOperationsAccess()
  const result = buildOperationsApiResponse({
    access,
    onError: (error: unknown) => emitRuntimeIncident({
      service: 'ntrp-operations-api',
      operation: 'read-snapshot',
      route: '/api/operations/v1/snapshot',
      status: 503,
      error,
      phase: 'read-model-projection',
    }),
  })

  return NextResponse.json(result.body, {
    status: result.status,
    headers: result.headers,
  })
}
