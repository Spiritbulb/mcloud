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
export default function StoreFooter({ store, settings }: { store: Store, settings: any }) {
    return (
        <footer className="sf-footer border-t py-8">
            <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm opacity-60">
                <p>© {new Date().getFullYear()} {store.name}</p>
                {settings.socialLinks && (
                    <div className="flex items-center gap-4">
                        {settings.socialLinks.instagram && (
                            <a href={settings.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity">
                                Instagram
                            </a>
                        )}
                        {settings.socialLinks.tiktok && (
                            <a href={settings.socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity">
                                TikTok
                            </a>
                        )}
                        {settings.socialLinks.twitter && (
                            <a href={settings.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity">
                                Twitter / X
                            </a>
                        )}
                        {settings.socialLinks.whatsapp && (
                            <a href={`https://wa.me/${settings.socialLinks.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity">
                                WhatsApp
                            </a>
                        )}
                    </div>
                )}
                <p className="text-xs">
                    Powered by{' '}
                    <a href="https://menengai.cloud" className="hover:opacity-100 transition-opacity">
                        Menengai Cloud
                    </a>
                </p>
            </div>
        </footer>)
}
