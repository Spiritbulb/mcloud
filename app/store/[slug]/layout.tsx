import { CartProvider } from '@/contexts/CartContext'
import { createClient } from '@/lib/server'
import LayoutWrapper from '@/components/store/layout-wrapper'
import type { Metadata } from 'next'
import { headers } from 'next/headers'


async function getStoreTheme(slug: string) {
    const supabase = await createClient()
    const { data: store } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', slug)
        .single()

    if (!store) return null

    const { data: theme } = await supabase
        .from('store_themes')
        .select('*')
        .eq('store_id', store.id)
        .single()

    return theme
}


async function getStore(slug: string) {
    const supabase = await createClient()
    const { data: store } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .single()

    return store
}


export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>
}): Promise<Metadata> {
    const { slug } = await params
    const store = await getStore(slug)

    return {
        title: store?.name ?? 'Store',
        icons: store?.logo_url
            ? {
                icon: store.logo_url,
                apple: store.logo_url,
            }
            : undefined,
    }
}


export default async function StoreLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params

    const theme = await getStoreTheme(slug)
    const store = await getStore(slug)
    const headersList = await headers()
    const bannerScriptB64 = headersList.get('x-inject-owner-banner')
    const bannerScript = bannerScriptB64
        ? Buffer.from(bannerScriptB64, 'base64').toString('utf-8')
        : null

    const cssVars = theme
        ? ({
            '--sf-primary': theme.primary_color,
            '--sf-secondary': theme.secondary_color,
            '--sf-accent': theme.accent_color,
            '--sf-background': theme.background_color,
            '--sf-foreground': theme.foreground_color,
            '--sf-muted': theme.muted_color,
            '--sf-dark-primary': theme.dark_primary_color,
            '--sf-dark-background': theme.dark_background_color,
            '--sf-dark-foreground': theme.dark_foreground_color,
            '--sf-dark-muted': theme.dark_muted_color,
            '--sf-font-heading': `'${theme.heading_font}', serif`,
            '--sf-font-body': `'${theme.body_font}', sans-serif`,
            '--sf-font-scale': theme.font_scale,
            '--sf-border-radius': theme.border_radius,
        } as React.CSSProperties)
        : {}

    return (
        <CartProvider storeSlug={slug}>
            <LayoutWrapper store={store} settings={store?.settings} cssVars={cssVars}>
                {bannerScript && (
                    <div dangerouslySetInnerHTML={{ __html: bannerScript }} />
                )}
                {children}
            </LayoutWrapper>
        </CartProvider>
    )
}