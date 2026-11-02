import type { NextRequest } from 'next/server'
import { signOut } from '@workos-inc/authkit-nextjs'

export async function GET(req: NextRequest) {
  // WorkOS needs an absolute returnTo, and it must be in the app's allowed sign-out redirects.
  await signOut({ returnTo: new URL('/', req.url).toString() })
}
