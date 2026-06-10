// components/header-wrapper.tsx
import { getSession } from '@/lib/auth/server'
import { Header } from './header'

export async function HeaderWrapper() {
    const session = await getSession()
    return <Header isLoggedIn={!!session?.user} />
}
