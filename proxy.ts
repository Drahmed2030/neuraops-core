import { NextRequest, NextResponse } from 'next/server'
import { applyRequestContext, resolveRequestContext } from './src/lib/reliability/request-context.mjs'
import { releaseHeaders } from './src/lib/reliability/release-meta.mjs'

export default function proxy(request: NextRequest) {
  const context = resolveRequestContext(request.headers)
  const requestHeaders = applyRequestContext(request.headers, context)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  response.headers.set('x-neuraops-request-id', context.requestId)
  response.headers.set('x-neuraops-correlation-id', context.correlationId)

  for (const [key, value] of Object.entries(releaseHeaders())) {
    response.headers.set(key, value)
  }

  return response
}

export const config = {
  matcher: ['/api/:path*'],
}
