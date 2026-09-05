// app/(merchant)/org/*/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { redirectToOrgPath } from '../_lib/redirect'

export async function GET(request: NextRequest) {
    return redirectToOrgPath(request, '/stores?new=1')
}