import { createClient } from '@mcloud/db/server'
import type { Metadata } from 'next'

interface Props {
    params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params
    const supabase = await createClient()

    const { data: store } = await supabase
        .from('stores').select('name, description')
        .eq('slug', slug).eq('is_active', true).single()
    if (!store) return { title: 'Services' }

    return {
        title: `Services — ${store.name}`,
        description: store.description ?? `Browse services offered by ${store.name}`,
    }
}

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
