import { createClient } from '@/lib/server'
import { notFound, redirect } from 'next/navigation'
import StoreSettings from '@/components/store/store-settings'

interface Props {
    params: Promise<{ slug: string }>
}

export default async function SettingsPage({ params }: Props) {
    const { slug } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect(`/auth/login?redirect=/${slug}/settings`)

    // Verify ownership
    const { data: membership } = await supabase
        .from('store_members')
        .select('role, store:stores(*)')
        .eq('user_id', user.id)
        .eq('role', 'owner')
        .single()

    if (!membership?.store) notFound()
    const store = membership.store as any

    // Verify this slug matches the user's store
    if (store.slug !== slug) redirect(`/${store.slug}/settings`)

    return <StoreSettings store={store} />
}
