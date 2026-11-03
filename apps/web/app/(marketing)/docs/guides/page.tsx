import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, ChevronRight } from "lucide-react"
import { JsonLd } from "@/components/docs/doc-blocks"
import { breadcrumbJsonLd, DOCS_PATH, guidePath, GUIDES_PATH } from "@/lib/docs-logic"
import { GUIDES } from "@/lib/guides"

const title = "Guides: selling and fundraising online in Kenya | Menengai Cloud"
const description =
    "Practical guides for Kenyan businesses and NGOs: start an online shop, accept M-PESA on your website, use your own .co.ke domain and collect donations online."

export const metadata: Metadata = {
    title,
    description,
    alternates: { canonical: GUIDES_PATH },
    openGraph: { type: "website", url: GUIDES_PATH, title, description, siteName: "Menengai Cloud", locale: "en_KE" },
}

export default function GuidesIndexPage() {
    const guides = [...GUIDES].sort((a, b) => b.updated.localeCompare(a.updated))
    return (
        <div className="max-w-3xl">
            <JsonLd data={breadcrumbJsonLd([{ name: "Docs", path: DOCS_PATH }, { name: "Guides", path: GUIDES_PATH }])} />
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                <Link href={DOCS_PATH} className="hover:text-foreground">Docs</Link>
                <ChevronRight className="w-3 h-3" aria-hidden />
                <span aria-current="page">Guides</span>
            </nav>
            <h1 className="text-3xl sm:text-4xl font-montserrat font-bold text-foreground leading-[1.15]">Guides</h1>
            <p className="mt-3 text-base text-muted-foreground">
                Step-by-step help for selling, getting paid and fundraising online in Kenya.
            </p>
            <ul className="mt-8 space-y-3">
                {guides.map((g) => (
                    <li key={g.slug}>
                        <Link href={guidePath(g.slug)} className="group block rounded-2xl border border-border bg-card p-5 hover:bg-secondary/50 transition-colors">
                            <h2 className="font-montserrat font-semibold text-foreground text-lg leading-snug">{g.title}</h2>
                            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{g.description}</p>
                            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                                Read guide <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}
