interface HeroSlide {
    image?: string
    imagePath?: string
    title?: string
    subtitle?: string
    buttonText?: string
    buttonLink?: string
}

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
        heroSlides?: HeroSlide[]
        socialLinks?: {
            instagram?: string
            twitter?: string
            tiktok?: string
            whatsapp?: string
        }
    }
}

export default function StoreFooter({ store, settings }: { store: Store; settings: any }) {
    const links = [
        settings.socialLinks?.instagram && { href: settings.socialLinks.instagram, label: 'Instagram' },
        settings.socialLinks?.tiktok && { href: settings.socialLinks.tiktok, label: 'TikTok' },
        settings.socialLinks?.twitter && { href: settings.socialLinks.twitter, label: 'Twitter / X' },
        settings.socialLinks?.whatsapp && { href: `https://wa.me/${settings.socialLinks.whatsapp}`, label: 'WhatsApp' },
    ].filter(Boolean) as { href: string; label: string }[]

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