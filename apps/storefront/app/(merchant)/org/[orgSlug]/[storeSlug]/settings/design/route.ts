// app/(merchant)/org/[orgSlug]/[storeSlug]/settings/design/route.ts
// Design tab alias — redirect to Appearance. Route Handler (clean HTTP redirect).
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ orgSlug: string; storeSlug: string }> },
) {
    const { orgSlug, storeSlug } = await params
    return NextResponse.redirect(
        new URL(`/org/${orgSlug}/${storeSlug}/settings/appearance`, request.url),
    )
}
