// app/(merchant)/org/[orgSlug]/[storeSlug]/settings/integrations/route.ts
// Integrations index — redirect to the Social sub-tab. Route Handler (was a
// client component doing redirect(); now a clean server HTTP redirect).
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    return NextResponse.redirect(new URL(`${request.nextUrl.pathname}/social`, request.url))
}
