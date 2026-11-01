// WorkOS AuthKit redirect target (NEXT_PUBLIC_WORKOS_REDIRECT_URI = <origin>/callback).
import { handleAuth } from '@workos-inc/authkit-nextjs'

export const GET = handleAuth({ returnPathname: '/files' })
