import type { Metadata } from "next"
import SupportClient from "@/components/support-client"

export const metadata: Metadata = {
  title: "Support — Menengai Cloud",
  description: "Get help with your Menengai Cloud store, learn how to connect domains, manage settings and more.",
}

export default function Page() {
  return <SupportClient />
}
