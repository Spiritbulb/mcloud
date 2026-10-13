// Root layout for the storefront product's own marketing and onboarding pages
// (/, /moving, /start). Like (merchant) and (storefront) it owns its document, so none of
// its chrome reaches a merchant's public site. Platform host only: on a custom domain the
// proxy rewrites every path onto the store, so these routes are never served there.
import type { Metadata, Viewport } from 'next'
import '../(merchant)/globals.css'
import { Geist, Geist_Mono } from 'next/font/google'
import { SiteHeader } from './_components/site-header'
import { SiteFooter } from './_components/site-footer'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'https://app.mcloud.co.ke'),
    title: {
        default: 'Menengai Storefronts. Your shop or NGO site, live in minutes',
        template: '%s | Menengai Storefronts',
    },
    description:
        'Hosted websites for Kenyan merchants and NGOs, with M-PESA checkout, donations, a visual editor and your own domain.',
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#FCFCFF' },
        { media: '(prefers-color-scheme: dark)', color: '#0C0D0E' },
    ],
}

// Same no-flash script as the merchant layout: sets `.dark` on <html> before first paint.
const noFlashThemeScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var isDark = stored === 'dark' || stored === 'light'
      ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {}
})();
`

export default function MarketingRootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
            <head>
                <script dangerouslySetInnerHTML={{ __html: noFlashThemeScript }} />
            </head>
            <body className="antialiased bg-background text-foreground">
                <SiteHeader />
                <main>{children}</main>
                <SiteFooter />
            </body>
        </html>
    )
}
