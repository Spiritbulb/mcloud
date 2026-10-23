import type { Metadata, Viewport } from "next";
import "./globals.css";
import Script from "next/script";
import { Suspense } from "react";
import GoogleAnalytics from "@/components/google-analytics";
import { CookieBanner } from "@/components/cookie-banner";
import { AuthProvider } from "@mcloud/auth/provider";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeColorSync } from "@/components/theme-color-sync";
import StatusBanner from '@mcloud/ui/status-banner'

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Menengai Cloud | Fast, Managed Websites for Kenyan Businesses",
  description:
    "Get a professional, high-speed website without touching servers, codes, or settings. Menengai Cloud handles design, hosting, security, and updates for Kenyan businesses that want results, not headaches.",
  keywords: [
    "managed websites Kenya",
    "business website Nakuru",
    "Kenya web design and hosting",
    "fast business website",
    "done for you website",
    "affordable business website Kenya",
    "website for small business Kenya",
    "M-Pesa payment website",
  ],
  metadataBase: new URL("https://mcloud.co.ke"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: "https://mcloud.co.ke",
    siteName: "Menengai Cloud",
    title: "Menengai Cloud | Your Website, Fully Managed",
    description:
      "Get a professional, high-speed website without touching servers, codes, or settings. Menengai Cloud handles design, hosting, security, and updates for Kenyan businesses that want results, not headaches.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Menengai Cloud | Fully Managed Websites for Kenyan Businesses",
    description:
      "Focus on running your business. Menengai Cloud keeps your website online, secure, fast, and looking sharp, every single day.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // These are the SSR/no-JS first-paint values; the inline theme script
  // below flips `data-theme` on <html> before paint, and globals.css
  // reads `prefers-color-scheme` + `[data-theme]` to pick the real colors.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FCFCFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0D0E" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable}`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Menengai" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=block"
        />
      </head>
      <body className="antialiased">
        <Script
          id="sw-reg"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
          if ('serviceWorker' in navigator && ${JSON.stringify(process.env.NODE_ENV !== 'production')}) {
            // Dev: no worker (it caches pages and reloads on every sw.js edit). Remove any
            // left over from an earlier visit.
            navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
          } else if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then((reg) => {
              reg.addEventListener('updatefound', () => {
                const sw = reg.installing;
                if (sw) sw.addEventListener('statechange', () => {
                  if (sw.state === 'activated') {/* controllerchange will handle reload */}
                });
              });
            });
            // Only reload when an existing worker is replaced. On the first visit there
            // is no controller yet, and claim() would otherwise force a second load.
            let refreshing = false;
            const hadController = !!navigator.serviceWorker.controller;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              if (refreshing || !hadController) return;
              refreshing = true;
              window.location.reload();
            });
          }
        `,
          }}
        />
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <CookieBanner />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ThemeColorSync />
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}