// app/auth/callback/route.ts
import { handleCallback } from '@/app/auth/actions'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    return handleCallback(request.nextUrl.searchParams)
}