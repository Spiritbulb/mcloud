// components/header-wrapper.tsx
import { auth0 } from '@/lib/auth0'
import { Header } from './header'

export async function HeaderWrapper() {
    const session = await auth0.getSession()
    return <Header isLoggedIn={!!session?.user} />
}
