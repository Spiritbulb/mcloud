// @route-kind: public — returns only the caller's own session, or null
import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/session'

export async function GET() {
  const u = await currentUser()
  return NextResponse.json(
    { user: u ? { name: u.name, email: u.email, role: u.role, canUpload: u.canUpload } : null },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
