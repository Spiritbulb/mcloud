import type { Metadata, Viewport } from "next";
import "./globals.css";
import { headers } from "next/headers";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeColorSync } from "@/components/theme-color-sync";
import Script from "next/script";
import { Suspense } from "react";
import Analytics from "@/components/analytics";
import { AuthProvider } from "@mcloud/auth/provider";
import { Geist, Geist_Mono, Lora } from "next/font/google";

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
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: "https://mcloud.co.ke",
    siteName: "Menengai Cloud",
    title: "Menengai Cloud | Your Website, Fully Managed",
    description:
      "Get a professional, high-speed website without touching servers, codes, or settings. Menengai Cloud handles design, hosting, security, and updates for Kenyan businesses that want results, not headaches.",
    // Share image comes from app/opengraph-image.tsx (generated), so it is
    // always present. Do not reference static files here that do not exist.
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
  // Draw content under the system bars so the TWA feels edge-to-edge (native).
  // Pair with env(safe-area-inset-*) padding in globals.css.
  viewportFit: "cover",
  // Adaptive system bars matching the app `--background` token (globals.css):
  // light #FCFCFF, dark #1A1C1E. ThemeColorSync overrides these with the
  // resolved theme once hydrated; these are the SSR/no-JS first-paint values.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FCFCFF" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1C1E" },
  ],
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;

}>) {
  const headersList = await headers()
  const bannerScriptB64 = headersList.get('x-inject-owner-banner')
  const bannerScript = bannerScriptB64
    ? Buffer.from(bannerScriptB64, 'base64').toString('utf-8')
    : null

  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${lora.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Menengai" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        {/* theme-color (incl. light/dark variants) is set via the `viewport` export above */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body
        className={`antialiased`}
      >

        {/* SW registration — auto-reload once when a new service worker takes over,
            so users never get stale cached content and never need a manual refresh. */}
        <Script id="sw-reg" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then((reg) => {
              // When an updated worker is found and installed, it activates (skipWaiting),
              // then controllerchange fires — reload once to pick up fresh assets.
              reg.addEventListener('updatefound', () => {
                const sw = reg.installing;
                if (sw) sw.addEventListener('statechange', () => {
                  if (sw.state === 'activated') {/* controllerchange will handle reload */}
                });
              });
            });
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              if (refreshing) return;
              refreshing = true;
              window.location.reload();
            });
          }
        ` }} />
        {/* GA Scripts */}
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-P7RJ7JW0BM"
        />
        <Script
          id="ga-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-P7RJ7JW0BM');
        `,
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <ThemeColorSync />
          <Suspense fallback={null}>
            <Analytics />   {/* ← GA route tracking goes here */}
          </Suspense>
          <AuthProvider>
            {bannerScript && (
              <div dangerouslySetInnerHTML={{ __html: bannerScript }} />
            )}
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
