// app/callback/route.ts
// WorkOS AuthKit redirect target (NEXT_PUBLIC_WORKOS_REDIRECT_URI = <origin>/callback).
// handleAuth exchanges the code and sets the session cookie, then redirects to
// /auth/post-login, which runs the user upsert + org-or-onboarding routing.
import { handleAuth } from '@workos-inc/authkit-nextjs'

export const GET = handleAuth({ returnPathname: '/auth/post-login' })
