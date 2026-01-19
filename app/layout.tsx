import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import { LayoutWrapper } from "@/components/layout-wrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

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
  metadataBase: new URL("https://menengai.cloud"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: "https://menengai.cloud",
    siteName: "Menengai Cloud",
    title: "Menengai Cloud | Your Website, Fully Managed",
    description:
      "Get a professional, high-speed website without touching servers, codes, or settings. Menengai Cloud handles design, hosting, security, and updates for Kenyan businesses that want results, not headaches.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Menengai Cloud - Managed Websites for Kenyan Businesses",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Menengai Cloud | Fully Managed Websites for Kenyan Businesses",
    description:
      "Focus on running your business. Menengai Cloud keeps your website online, secure, fast, and looking sharp—every single day.",
    images: ["/twitter-image.jpg"],
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


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
      (function() {
        try {
          const theme = localStorage.getItem('theme') || 'system';
          const html = document.documentElement;
          
          if (theme === 'dark') {
            html.classList.add('dark');
          } else if (theme === 'system') {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
              html.classList.add('dark');
            }
          }
        } catch (e) {}
      })();
    `,
          }}
        />

      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} antialiased`}
      >
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}
