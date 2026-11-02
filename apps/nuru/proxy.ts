import { prepareMiddleware } from '@mcloud/auth/standalone'
import { type NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { requestHeaders, finalize } = await prepareMiddleware(request)
  return finalize(NextResponse.next({ request: { headers: requestHeaders } }))
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|robots.txt).*)'],
}
