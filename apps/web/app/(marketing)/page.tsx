import type { Metadata } from "next"
import HomeClient from "@/components/home-client"

export const metadata: Metadata = {
  title: "Menengai Cloud — Managed Platform for Enterprise Applications",
  description:
    "Launch and host production-grade applications without managing infrastructure. E-commerce storefronts, white-label trading apps, and more.",
  openGraph: {
    title: "Menengai Cloud — Managed Platform for Enterprise Applications",
    description:
      "Deploy storefronts, trading apps, and more — fully managed. No DevOps required.",
    url: "https://menengai.cloud",
    siteName: "Menengai Cloud",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Menengai Cloud — Managed Platform for Enterprise Applications",
    description: "Deploy storefronts and trading apps without managing infrastructure.",
  },
}

export default function Page() {
  // Logged-in users are redirected to their org in proxy.ts (clean HTTP redirect).
  return <HomeClient />
}
