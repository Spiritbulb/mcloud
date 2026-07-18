// app/(storefront)/store/[slug]/layout.tsx
import { CartProvider } from '@/contexts/CartContext'
import { CustomerAuthProvider } from '@/contexts/CustomerAuthContext'
import { StoreProvider } from '@/contexts/StoreContext'
import { WishlistProvider } from '@/contexts/WishlistContext'
import { createClient } from '@mcloud/db/server'
import { googleFontsHref } from '@/lib/fonts'
import { isCustomDomainHost } from '@/lib/host'
import { getNavPages } from '@/lib/pages'
import LayoutWrapper from '@/components/store/layout-wrapper'
import PreviewListener from '@/components/store/preview-listener'
import EditorBridge from '@/components/store/editor-bridge'
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


// Pure derivation mirrored from apps/web/lib/plans.ts (planFromActiveRow). The
// storefront is a separate app with no dependency on apps/web, so this tiny
// rule is inlined rather than imported: an active row on the 'pro' plan is
// the only case that hides Menengai Cloud branding.
function hideBrandingFromRow(row: { plan: string | null; status: string } | null | undefined): boolean {
    return !!row && row.status === 'active' && row.plan === 'pro'
}

async function getStore(slug: string) {
    const supabase = await createClient()
    const { data: store } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .single()

    if (!store) return store

    const { data: subRow } = await supabase
        .from('store_subscriptions')
        .select('plan, status')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    return { ...store, hideBranding: hideBrandingFromRow(subRow) }
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

    // The store's own published pages, linked from the nav. Without this an
    // authored page (About, Contact) is reachable only by typing its URL.
    const navPages = store?.id ? await getNavPages(store.id) : []
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

    // On a custom domain the storefront is white-labelled: in-store links must be
    // bare ("/cart") so the internal slug never appears. On the platform host they
    // stay slug-prefixed ("/store/{slug}/cart"). Derived from the request host so
    // every link/button renders the host-correct URL with no client redirect hop.
    const host = headersList.get('host') ?? ''
    const onCustomDomain = isCustomDomainHost(host)
    const basePath = onCustomDomain ? '' : `/store/${slug}`

    // A theme names its fonts, but naming one does not make it render: without a
    // webfont the browser silently falls back (a store asking for Quicksand got
    // serif). Pull whatever the theme names from Google Fonts so the choice is
    // real. System stacks are skipped since they need no fetch.
    const fontHref = googleFontsHref([theme?.heading_font, theme?.body_font])

    return (
        // CustomerAuthProvider has no server deps — sits at the top
        <CustomerAuthProvider>
            {fontHref && (
                <link rel="stylesheet" href={fontHref} />
            )}
            {/* Applies unsaved theme values from the Editor. Inert unless framed by
                the admin origin: a real visitor is never framed, so for them this
                listener never activates. */}
            <PreviewListener adminOrigin={process.env.NEXT_PUBLIC_ADMIN_ORIGIN ?? 'http://localhost:3000'} />
            {/* Click a section here -> the Editor opens its drawer; select one there
                -> this scrolls to it. Same containment as PreviewListener, and it
                never writes to the page. */}
            <EditorBridge adminOrigin={process.env.NEXT_PUBLIC_ADMIN_ORIGIN ?? 'http://localhost:3000'} />
            <StoreProvider slug={slug} basePath={basePath} isCustomDomain={onCustomDomain}>
                {/* WishlistProvider resolves the store + customer server-side via the slug. */}
                <WishlistProvider storeSlug={slug}>
                    <CartProvider storeSlug={slug}>
                        <LayoutWrapper store={store} settings={store?.settings} cssVars={cssVars} pages={navPages}>
                            {bannerScript && (
                                <div dangerouslySetInnerHTML={{ __html: bannerScript }} />
                            )}
                            {children}
                        </LayoutWrapper>
                    </CartProvider>
                </WishlistProvider>
            </StoreProvider>
        </CustomerAuthProvider>
    )
}