// app/onboarding/page.tsx  (Server Component)
import { auth0 } from '@/lib/auth0'
import { createClient } from '@/lib/server'
import { redirect } from 'next/navigation'
import OnboardingPage from './onboarding-client'

export default async function Page() {
    const session = await auth0.getSession()
    if (!session?.user) redirect('/auth/login')

    const supabase = await createClient()
    const { data: memberships } = await supabase
        .from('store_members')
        .select('role, stores(id, name, slug)')
        .eq('user_id', session.user.sub)
        .in('role', ['owner', 'admin'])          // ← both roles
        .eq('stores.is_active', true)
        .order('created_at', { ascending: false })

    const stores = (memberships ?? [])
        .map((m) => m.stores)
        .filter(Boolean) as { id: string; name: string; slug: string }[]

    return <OnboardingPage existingStores={stores} />
}