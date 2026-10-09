// components/header-wrapper.tsx
import { cookies } from 'next/headers'
import { Header } from './header'

// The header only toggles "Log in" vs "Dashboard", so cookie presence is enough:
// a full getSession() here ran a JWT verify (and a DB lookup for unlinked users)
// on every marketing page view. /org still verifies the session properly.
const SESSION_COOKIE = process.env.WORKOS_COOKIE_NAME ?? 'wos-session'

export async function HeaderWrapper() {
    const jar = await cookies()
    return <Header isLoggedIn={jar.has(SESSION_COOKIE)} />
}
