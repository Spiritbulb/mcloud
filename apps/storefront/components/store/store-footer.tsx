import type { StoreThemeId } from '@/lib/store-themes'
import type { IconType } from "react-icons"
import { FaInstagram, FaTiktok, FaWhatsapp, FaXTwitter } from "react-icons/fa6"

function buildSocialLinks(settings: Store['settings']) {
    const s = settings.socialLinks
    return [
        s?.instagram && { href: s.instagram, label: 'Instagram', icon: FaInstagram },
        s?.tiktok && { href: s.tiktok, label: 'TikTok', icon: FaTiktok },
        s?.twitter && { href: s.twitter, label: 'Twitter / X', icon: FaXTwitter },
        s?.whatsapp && { href: `https://wa.me/${s.whatsapp}`, label: 'WhatsApp', icon: FaWhatsapp },
    ].filter(Boolean) as { href: string; label: string; icon: IconType }[]
}

interface Store {
    id: string
    name: string
    slug: string
    is_pro: boolean
    hideBranding?: boolean
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
    themeId?: StoreThemeId
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
                        {links.map(({ href, label, icon: SocialIcon }) => (
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
                                <SocialIcon className="w-4 h-4" />
                            </a>
                        ))}
                    </div>
                )}

                {!store.hideBranding && (
                    <p className="text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
                        Made on{' '}
                        <a
                            href="https://mcloud.co.ke"
                            style={{ color: 'var(--sf-foreground-subtle)' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--sf-foreground)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--sf-foreground-subtle)')}
                        >
                            Menengai Cloud
                        </a>
                    </p>
                )}
            </div>
        </footer>
    )
}

// ─── Theme dispatcher ─────────────────────────────────────────────────────────
// Every theme draws the Classic footer until it ships its own (see lib/store-themes.ts).
export default function StoreFooter({ store, settings, themeId = 'classic' }: StoreFooterProps) {
    switch (themeId) {
        default: return <ClassicFooter store={store} settings={settings} />
    }
}
