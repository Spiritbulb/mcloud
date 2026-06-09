import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth0 } from "@/lib/auth0"
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

export default async function Page() {
  // Logged-in users skip marketing and go straight to their org (or onboarding).
  // /org/pick resolves the user's first org and redirects, or sends them to /onboarding.
  const session = await auth0.getSession()
  if (session?.user) redirect("/org/pick")

  return <HomeClient />
}
