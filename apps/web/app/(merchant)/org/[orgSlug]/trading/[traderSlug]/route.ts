// app/(merchant)/org/[orgSlug]/trading/[traderSlug]/route.ts
// Trading index — redirect to the General tab. Route Handler (clean HTTP redirect).
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ orgSlug: string; traderSlug: string }> },
) {
    const { orgSlug, traderSlug } = await params
    return NextResponse.redirect(
        new URL(`/org/${orgSlug}/trading/${traderSlug}/general`, request.url),
    )
}
