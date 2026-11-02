// @route-kind: public — returns only the caller's own session, or null
import { NextResponse } from 'next/server'
import { dbUnavailableOrThrow } from '@/lib/db'
import { currentUser } from '@/lib/session'

export async function GET() {
  let u
  try {
    u = await currentUser()
  } catch (err) {
    // A 503, not `{ user: null }`: the header treats any non-OK as signed out without claiming it.
    return dbUnavailableOrThrow(err)
  }
  return NextResponse.json(
    { user: u ? { name: u.name, email: u.email, role: u.role, canUpload: u.canUpload } : null },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
