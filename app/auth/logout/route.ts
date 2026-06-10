// app/auth/logout/route.ts
// WorkOS logout — clears the AuthKit session cookie and redirects home.
// Reached via the LOGOUT_URL constant; the WorkOS adapter's middleware lets
// /auth/logout fall through to this handler.
import { signOut } from '@workos-inc/authkit-nextjs'

export async function GET() {
    await signOut({ returnTo: '/' })
}
