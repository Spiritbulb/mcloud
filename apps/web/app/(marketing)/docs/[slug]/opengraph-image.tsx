import { docsOgImage, OG_SIZE } from '@/components/docs/og-card'
import { getDocs } from '@/lib/docs-data'
import { findDoc } from '@/lib/docs-logic'

export const size = OG_SIZE
export const contentType = 'image/png'
export const alt = 'Menengai Cloud documentation'
export const revalidate = 3600

export function generateStaticParams() {
    return []
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
    const page = findDoc(await getDocs(), (await params).slug)
    return docsOgImage('Docs', page?.title ?? 'Documentation')
}
