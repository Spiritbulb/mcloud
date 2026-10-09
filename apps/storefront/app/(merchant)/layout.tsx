// Root layout for the merchant area (/org/*). The customer-facing storefront has its
// own root layout in app/(storefront); the two never share a document, so merchant
// chrome (fonts, theme script, auth context) cannot leak onto a merchant's public site.
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@mcloud/auth/provider'
import { Geist, Geist_Mono, Lora } from 'next/font/google'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
const lora = Lora({ variable: '--font-lora', subsets: ['latin'], style: ['normal', 'italic'] })

export const metadata: Metadata = {
    title: 'Menengai Cloud',
    robots: { index: false, follow: false },
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#FCFCFF' },
        { media: '(prefers-color-scheme: dark)', color: '#1A1C1E' },
    ],
}

// Same no-flash script as apps/web: sets `.dark` on <html> before first paint.
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

export default function MerchantRootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={`${geistSans.variable} ${geistMono.variable} ${lora.variable}`}
        >
            <head>
                <script dangerouslySetInnerHTML={{ __html: noFlashThemeScript }} />
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
                />
            </head>
            <body className="antialiased">
                <AuthProvider>{children}</AuthProvider>
            </body>
        </html>
    )
}
