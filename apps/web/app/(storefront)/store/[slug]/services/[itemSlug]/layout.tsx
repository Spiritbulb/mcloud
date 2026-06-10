import { createClient } from '@/lib/server'
import type { Metadata } from 'next'

interface Props {
    params: Promise<{ slug: string; itemSlug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug, itemSlug } = await params
    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores').select('id, name')
        .eq('slug', slug).eq('is_active', true).single()
    if (!store) return { title: 'Service' }

    return {
        title: `${store.name}`,
    }
}

export default function ServiceItemLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
