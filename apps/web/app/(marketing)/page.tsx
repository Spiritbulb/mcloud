import type { Metadata } from "next"
import HomeClient from "@/components/home-client"

export const metadata: Metadata = {
  title: "Menengai Cloud. Business Websites and Apps, Fully Managed",
  description:
    "The commerce engine of Spiritbulb. Menengai Cloud powers managed business websites and white-label apps for Kenya. Storefronts, hosting, payments, and updates, fully handled.",
  openGraph: {
    title: "Menengai Cloud. Business Websites and Apps, Fully Managed",
    description:
      "The commerce engine of Spiritbulb. Managed storefronts and white-label apps for Kenya, with hosting, payments, and updates handled for you.",
    url: "https://mcloud.co.ke",
    siteName: "Menengai Cloud",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Menengai Cloud. Business Websites and Apps, Fully Managed",
    description: "The commerce engine of Spiritbulb. Managed storefronts and white-label apps for Kenya.",
  },
}

// Structured data. The WebSite node is what Google reads for the bold site name
// in results (without it, it falls back to the bare domain). The Organization
// node declares the brand entity and links it to its parent, Spiritbulb, so the
// two are connected as one ecosystem in search. Reciprocal subOrganization lives
// in the Spiritbulb repo's own layout.
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Menengai Cloud",
    url: "https://mcloud.co.ke",
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Menengai Cloud",
    alternateName: "MCloud",
    url: "https://mcloud.co.ke",
    logo: "https://mcloud.co.ke/mclogo.png",
    description:
      "The commerce engine of Spiritbulb. Menengai Cloud powers managed business websites and white-label apps for Kenya, with hosting, security, payments, and updates fully handled.",
    parentOrganization: {
      "@type": "Organization",
      name: "Spiritbulb",
      url: "https://spiritb.uk",
    },
    areaServed: "KE",
  },
]

export default function Page() {
  // Logged-in users are redirected to their org in proxy.ts (clean HTTP redirect).
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient />
    </>
  )
}
