import type { Metadata } from 'next'
import { StoreHome } from '../store-home'

// The Editor's live preview. Unsaved copy arrives in the query string, so this route
// reads the request and is never cached. It lives apart from the public home so that
// reading searchParams there cannot make every real visit a function run.
// The leading hyphen cannot collide with a product slug.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { index: false, follow: false } }

interface Props {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ preview?: string; token?: string; settings?: string }>
}

export default async function StorePreviewPage({ params, searchParams }: Props) {
    const { slug } = await params
    const { preview, token, settings } = await searchParams
    return <StoreHome slug={slug} preview={preview} token={token} settings={settings} />
}
