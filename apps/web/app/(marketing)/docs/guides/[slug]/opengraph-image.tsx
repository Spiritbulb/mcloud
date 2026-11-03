import { docsOgImage, OG_SIZE } from '@/components/docs/og-card'
import { getGuide, GUIDES } from '@/lib/guides'

export const size = OG_SIZE
export const contentType = 'image/png'
export const alt = 'Menengai Cloud guide'

export function generateStaticParams() {
    return GUIDES.map((g) => ({ slug: g.slug }))
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
    const guide = getGuide((await params).slug)
    return docsOgImage('Guides', guide?.title ?? 'Guides')
}
