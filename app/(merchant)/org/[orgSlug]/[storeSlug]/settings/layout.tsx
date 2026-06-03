import { cookies } from 'next/headers'
import SettingsShell from './settings-shell'

export default async function SettingsLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ orgSlug: string; storeSlug: string }>
}) {
    const { orgSlug, storeSlug } = await params
    const cookieStore = await cookies()

    let initialStore: any = null
    let initialError: 'unauthenticated' | 'forbidden' | 'unknown' | null = null

    try {
        const res = await fetch(
            `${process.env.API_BASE_URL}/store/${storeSlug}`,
            {
                headers: {
                    Cookie: cookieStore.toString(),
                },
                next: { revalidate: 60 },
            }
        )

        if (res.status === 401) initialError = 'unauthenticated'
        else if (res.status === 403 || res.status === 404) initialError = 'forbidden'
        else if (!res.ok) initialError = 'unknown'
        else initialStore = await res.json()
    } catch {
        initialError = 'unknown'
    }

    return (
        <SettingsShell orgSlug={orgSlug} slug={storeSlug} initialStore={initialStore} initialError={initialError}>
            {children}
        </SettingsShell>
    )
}
