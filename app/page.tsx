import type { Metadata } from "next"
import HomeClient from "@/components/home-client"

export const metadata: Metadata = {
  title: "Menengai Cloud — Your store in 2 seconds",
  description:
    "Build your e-commerce store, blog, or streaming site in seconds. Free forever. No credit card required.",
  openGraph: {
    title: "Menengai Cloud — Your store in 2 seconds",
    description:
      "Build your e-commerce store, blog, or streaming site in seconds. Free forever.",
    url: "https://menengai.cloud",
    siteName: "Menengai Cloud",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Menengai Cloud — Your store in 2 seconds",
    description: "Build your store, blog, or streaming site. Free forever.",
  },
}

export default function Page() {
  return <HomeClient />
}
