import { auth0 } from '@/lib/auth0'
import { getStoreSettingsData } from '@/lib/store-data'
import SettingsShell from './settings-shell'

export default async function SettingsLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { orgSlug, storeSlug } = await params

    // Query Supabase directly instead of fetching our own /api/store over HTTP —
    // removes a full server→HTTP→server round-trip on every settings page load.
    let initialStore: any = null
    let initialError: 'unauthenticated' | 'forbidden' | 'unknown' | null = null

    const session = await auth0.getSession()
    if (!session?.user) {
        initialError = 'unauthenticated'
    } else {
        const result = await getStoreSettingsData(session.user.sub, storeSlug)
        if (result.error === 'forbidden' || result.error === 'not_found') initialError = 'forbidden'
        else if (result.error) initialError = 'unknown'
        else {
            const data = result.data
            if (!data.user?.name) {
                data.user = {
                    ...data.user,
                    name: data.user?.name || session.user.name || 'Account',
                    email: data.user?.email || session.user.email || '',
                    avatar_url: data.user?.avatar_url ?? session.user.picture ?? null,
                }
            }
            initialStore = data
        }
    }

    return (
        <SettingsShell orgSlug={orgSlug} slug={storeSlug} initialStore={initialStore} initialError={initialError}>
            {children}
        </SettingsShell>
    )
}
