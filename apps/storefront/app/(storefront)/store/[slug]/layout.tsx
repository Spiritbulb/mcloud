// app/(storefront)/store/[slug]/layout.tsx
import { CartProvider } from '@/contexts/CartContext'
import { CustomerAuthProvider } from '@/contexts/CustomerAuthContext'
import { StoreProvider } from '@/contexts/StoreContext'
import { WishlistProvider } from '@/contexts/WishlistContext'
import { planHasFeature } from '@mcloud/merchant/plans'
import { getStorePlanCached, getStoreRow, getStoreTheme } from '@/lib/store-queries'
import { googleFontsHref } from '@/lib/fonts'
import { getNavPages } from '@/lib/pages'
import LayoutWrapper from '@/components/store/layout-wrapper'
import PreviewListener from '@/components/store/preview-listener'
import EditorBridge from '@/components/store/editor-bridge'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'


// No store is prebuilt: each is generated on first visit and then served from the cache.
// Declaring this is what makes Next treat the dynamic route as cacheable (ISR).
export function generateStaticParams() {
    return []
}

async function getStore(slug: string) {
    const store = await getStoreRow(slug)
    if (!store) return notFound()

    // Pro is the only plan that hides Menengai Cloud branding (PLAN_LIMITS.pro.features.removeBranding).
    const plan = await getStorePlanCached(store.id)
    return { ...store, hideBranding: planHasFeature(plan, 'removeBranding') }
}


export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>
}): Promise<Metadata> {
    const { slug } = await params
    const store = await getStore(slug)

    // The square icon when set; otherwise the logo, which browsers fit (and shrink) into a square.
    const icon = store?.icon_url ?? store?.logo_url

    return {
        title: store?.name ?? 'Store',
        icons: icon ? { icon, apple: icon } : undefined,
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

    const store = await getStore(slug)
    // Theme and nav pages only need the store id, so they run together.
    const [theme, navPages] = await Promise.all([
        getStoreTheme(store.id),
        // The store's own published pages, linked from the nav. Without this an
        // authored page (About, Contact) is reachable only by typing its URL.
        getNavPages(store.id),
    ])

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
            <StoreProvider slug={slug}>
                {/* WishlistProvider resolves the store + customer server-side via the slug. */}
                <WishlistProvider storeSlug={slug}>
                    <CartProvider storeSlug={slug}>
                        <LayoutWrapper store={store} settings={store?.settings} cssVars={cssVars} pages={navPages}>
                            {children}
                        </LayoutWrapper>
                    </CartProvider>
                </WishlistProvider>
            </StoreProvider>
        </CustomerAuthProvider>
    )
}