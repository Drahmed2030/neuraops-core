import { NextRequest, NextResponse } from 'next/server'

const OPAQUE_ID = /^[A-Za-z0-9._:-]{8,128}$/

export default function proxy(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const incomingCorrelation =
    request.headers.get('x-neuraops-correlation-id') ||
    request.headers.get('x-correlation-id')

  const correlationId =
    incomingCorrelation && OPAQUE_ID.test(incomingCorrelation)
      ? incomingCorrelation
      : requestId

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-neuraops-request-id', requestId)
  requestHeaders.set('x-neuraops-correlation-id', correlationId)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  response.headers.set('x-neuraops-request-id', requestId)
  response.headers.set('x-neuraops-correlation-id', correlationId)

  return response
}

export const config = {
  matcher: ['/api/:path*'],
}
