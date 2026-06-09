import { cookies, headers } from 'next/headers'
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
    const headerStore = await headers()

    // Build an absolute base URL from the incoming request so server-side fetch
    // works in every environment (local dev, preview, prod) and uses the same
    // host the browser authenticated against — env vars like
    // NEXT_PUBLIC_API_BASE_URL point at prod and break local/preview.
    const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host')
    const proto = headerStore.get('x-forwarded-proto') ?? 'https'
    const baseUrl = `${proto}://${host}/api`

    let initialStore: any = null
    let initialError: 'unauthenticated' | 'forbidden' | 'unknown' | null = null

    try {
        const res = await fetch(
            `${baseUrl}/store/${storeSlug}`,
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
