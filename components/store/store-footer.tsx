interface Store {
    id: string
    name: string
    slug: string
    description: string | null
    logo_url: string | null
    currency: string
    settings: {
        heroTitle?: string
        heroSubtitle?: string
        heroImage?: string
        heroImagePath?: string
        logoPath?: string
        heroSlides?: {
            title: string
            subtitle?: string
            image?: string
            accent?: string
            buttonText?: string
        }[]
        socialLinks?: {
            instagram?: string
            twitter?: string
            tiktok?: string
            whatsapp?: string
        }
    }
}

interface StoreFooterProps {
    store: Store
    settings: Store['settings']
    themeId?: string
}

// ─── Shared: build social link list ───────────────────────────────────────────
function buildSocialLinks(settings: Store['settings']) {
    return [
        settings.socialLinks?.instagram && { href: settings.socialLinks.instagram, label: 'Instagram' },
        settings.socialLinks?.tiktok && { href: settings.socialLinks.tiktok, label: 'TikTok' },
        settings.socialLinks?.twitter && { href: settings.socialLinks.twitter, label: 'Twitter / X' },
        settings.socialLinks?.whatsapp && {
            href: `https://wa.me/${settings.socialLinks.whatsapp}`,
            label: 'WhatsApp',
        },
    ].filter(Boolean) as { href: string; label: string }[]
}

// ─── Classic Footer ────────────────────────────────────────────────────────────
// Colours come entirely from storefront.css sf-* custom properties.
function ClassicFooter({ store, settings }: { store: Store; settings: Store['settings'] }) {
    const links = buildSocialLinks(settings)

    return (
        <footer className="sf-footer">
            <div className="container mx-auto px-4 md:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
                <p style={{ color: 'var(--sf-foreground-subtle)' }}>
                    © {new Date().getFullYear()} {store.name}
                </p>

                {links.length > 0 && (
                    <div className="flex items-center gap-5">
                        {links.map(({ href, label }) => (
                            <a
                                key={label}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="transition-colors"
                                style={{ color: 'var(--sf-foreground-subtle)' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--sf-foreground)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--sf-foreground-subtle)')}
                            >
                                {label}
                            </a>
                        ))}
                    </div>
                )}

                <p className="text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
                    Powered by{' '}
                    <a
                        href="https://menengai.cloud"
                        style={{ color: 'var(--sf-foreground-subtle)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--sf-foreground)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--sf-foreground-subtle)')}
                    >
                        Menengai Cloud
                    </a>
                </p>
            </div>
        </footer>
    )
}

// ─── Noir Footer ──────────────────────────────────────────────────────────────
// Matches NoirStoreFront: #080808 bg, [#1a1a1a] border, [#333] muted text, Jost font.
function NoirFooter({ store, settings }: { store: Store; settings: Store['settings'] }) {
    const links = buildSocialLinks(settings)

    return (
        <footer
            className="border-t border-[#1a1a1a] bg-[#080808]"
            style={{ fontFamily: "'Jost', sans-serif" }}
        >
            <div className="px-8 md:px-16 lg:px-24 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Brand */}
                <div className="flex flex-col items-center md:items-start gap-1">
                    <p className="text-[9px] tracking-[0.4em] uppercase text-[#333]">
                        {store.name}
                    </p>
                    <p className="text-[9px] tracking-[0.3em] uppercase text-[#252525]">
                        © {new Date().getFullYear()}
                    </p>
                </div>

                {/* Social links */}
                {links.length > 0 && (
                    <div className="flex items-center gap-6">
                        {links.map(({ href, label }) => (
                            <a
                                key={label}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] tracking-[0.2em] uppercase text-[#444] hover:text-[#c9a96e] transition-colors duration-300"
                            >
                                {label}
                            </a>
                        ))}
                    </div>
                )}

                {/* Powered by */}
                <p className="text-[9px] tracking-[0.3em] uppercase text-[#252525]">
                    Powered by{' '}
                    <a
                        href="https://menengai.cloud"
                        className="hover:text-[#c9a96e] transition-colors duration-300"
                    >
                        Menengai Cloud
                    </a>
                </p>
            </div>
        </footer>
    )
}

// ─── Minimal Footer ───────────────────────────────────────────────────────────
// Matches MinimalStoreFront: #f7f4f0 bg, [#e5e0d9] border, warm neutrals, DM Sans font.
function MinimalFooter({ store, settings }: { store: Store; settings: Store['settings'] }) {
    const links = buildSocialLinks(settings)

    return (
        <footer
            className="border-t border-[#e5e0d9] bg-[#f7f4f0]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
            <div className="px-6 md:px-12 lg:px-20 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
                {/* Brand */}
                <p className="text-xs text-[#9a9189]">
                    © {new Date().getFullYear()} {store.name}
                </p>

                {/* Social links */}
                {links.length > 0 && (
                    <div className="flex items-center gap-5">
                        {links.map(({ href, label }) => (
                            <a
                                key={label}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[#9a9189] hover:text-[#5c5650] transition-colors"
                            >
                                {label}
                            </a>
                        ))}
                    </div>
                )}

                {/* Powered by */}
                <p className="text-xs text-[#c8c0b6]">
                    Powered by{' '}
                    <a
                        href="https://menengai.cloud"
                        className="hover:text-[#5c5650] transition-colors"
                    >
                        Menengai Cloud
                    </a>
                </p>
            </div>
        </footer>
    )
}

// ─── Theme dispatcher ─────────────────────────────────────────────────────────
export default function StoreFooter({ store, settings, themeId = 'classic' }: StoreFooterProps) {
    switch (themeId) {
        case 'noir': return <NoirFooter store={store} settings={settings} />
        case 'minimal': return <MinimalFooter store={store} settings={settings} />
        default: return <ClassicFooter store={store} settings={settings} />
    }
}