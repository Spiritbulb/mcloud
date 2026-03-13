import { auth0 } from '@/lib/auth0'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/server'

export default async function SettingsPage() {
    const session = await auth0.getSession()
    if (!session) redirect('/auth/login')

    const userId = session.user.sub
    const supabase = await createClient()

    const { data: memberStore } = await supabase
        .from('store_members')
        .select('store_id, role')
        .eq('user_id', userId)
        .single()

    if (!memberStore) redirect('/auth/sign-up')

    const { data: store, error } = await supabase
        .from('stores')
        .select('slug')  // only need slug for the redirect
        .eq('id', memberStore.store_id)
        .single()

    if (error) console.error('[store fetch]', error.code, error.message)
    if (!store) notFound()

    redirect(`/store/${store.slug}/settings/general`)
}
