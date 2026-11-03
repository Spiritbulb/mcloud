// Registry of long-form guide articles served at /docs/guides/[slug].
// The body of each lives in content/guides/<slug>.mdx; everything search engines
// and the index pages need (title, description, dates, FAQ) lives here so it can
// be read without compiling MDX. guides.test.ts keeps the two in step.

export type GuideFaq = { q: string; a: string }

export type Guide = {
    slug: string
    /** The <h1> and search-result title. Lead with the phrase people search for. */
    title: string
    /** Meta description, 120-160 characters. */
    description: string
    /** ISO dates (YYYY-MM-DD). */
    published: string
    updated: string
    /** Slugs of the reference pages (/docs/[slug]) this guide leads into. */
    related: string[]
    /** Shown under the article and emitted as FAQPage structured data. */
    faq?: GuideFaq[]
}

export const GUIDES: Guide[] = [
    {
        slug: "accept-mpesa-payments-on-your-website",
        title: "How to accept M-PESA payments on your website",
        description:
            "Take M-PESA payments on your website straight to your own till or paybill: manual codes or automatic STK push through Safaricom Daraja, step by step.",
        published: "2026-11-02",
        updated: "2026-11-02",
        related: ["payments", "orders", "billing"],
        faq: [
            {
                q: "Does the money go through Menengai Cloud?",
                a: "No. Customers pay your own till or paybill number, so the money lands in your M-PESA account directly.",
            },
            {
                q: "Do I need a paybill, or will a till number work?",
                a: "Either works. Manual M-PESA accepts a till or a paybill. STK push needs the till or paybill registered on your Safaricom Daraja app as its Business Shortcode.",
            },
            {
                q: "Which plan do I need for STK push?",
                a: "STK push needs the Hobby plan (KES 795 a month) or Pro. Manual M-PESA works on every plan, including Free.",
            },
            {
                q: "Do I have to set up a callback URL in Daraja?",
                a: "No. Menengai Cloud handles the callback and confirms every payment with Safaricom before marking the order paid.",
            },
        ],
    },
    {
        slug: "start-an-online-shop-in-kenya",
        title: "How to start an online shop in Kenya",
        description:
            "A practical guide to starting an online shop in Kenya: what to sell, setting up your store, taking M-PESA, delivery across Kenya and getting your first orders.",
        published: "2026-11-02",
        updated: "2026-11-02",
        related: ["overview", "general", "products", "payments", "delivery"],
        faq: [
            {
                q: "How much does it cost to start an online shop in Kenya?",
                a: "You can start on the Free plan for KES 0 with up to 20 products and 50 orders a month. Hobby is KES 795 a month and adds a custom domain and STK push; Pro is KES 2,795 a month.",
            },
            {
                q: "Do I need a registered business to sell online?",
                a: "You can open a store without one, but a till or paybill and a Safaricom Daraja app for STK push are easier to get with a registered business. Check current KRA and county licensing rules for your trade.",
            },
            {
                q: "How do I deliver orders outside Nairobi?",
                a: "Add the couriers you use, then list delivery zones with a rate for each. Customers outside your zones are pointed to your contact page instead of checking out.",
            },
        ],
    },
    {
        slug: "custom-domain-for-your-business-website",
        title: "How to use your own domain (.co.ke or .com) for your business website",
        description:
            "Connect your own .co.ke or .com domain to your business website: choosing a name, buying it from a registrar, and adding the one DNS record it needs.",
        published: "2026-11-02",
        updated: "2026-11-02",
        related: ["domain", "general", "billing"],
        faq: [
            {
                q: "Should I choose .co.ke or .com?",
                a: ".co.ke tells customers you are a Kenyan business and is usually cheaper. .com suits businesses that sell beyond Kenya. Many businesses buy both and point one at the other.",
            },
            {
                q: "How long does a new domain take to work?",
                a: "DNS changes can take anywhere from a few minutes to many hours to spread. The Domain page shows Awaiting DNS propagation until the record is visible, then Domain verified.",
            },
            {
                q: "Will my old store address stop working?",
                a: "No. Your original Menengai Cloud address keeps working after you connect a custom domain.",
            },
        ],
    },
    {
        slug: "collect-donations-online-for-your-ngo",
        title: "How to collect donations online for your NGO in Kenya",
        description:
            "Set up a donation website for your NGO or charity in Kenya: campaigns with goals, suggested amounts, M-PESA giving and showing donors your impact.",
        published: "2026-11-02",
        updated: "2026-11-02",
        related: ["overview", "general", "editor", "payments"],
        faq: [
            {
                q: "Can donors give with M-PESA?",
                a: "Yes. Donations are paid like any order on your site, so donors can use manual M-PESA or an STK push prompt straight to your organisation's till or paybill.",
            },
            {
                q: "Can I run more than one campaign at a time?",
                a: "Yes. Each campaign has its own title, description, image, optional goal and suggested amounts, and donors pick the one they want to support.",
            },
            {
                q: "Can donors give in someone's name?",
                a: "Yes. Donors can add a dedication to their gift, which is saved with the donation.",
            },
        ],
    },
]

export function getGuide(slug: string): Guide | undefined {
    return GUIDES.find((g) => g.slug === slug)
}

/** Guides that lead into a given reference page, newest first. */
export function guidesForDoc(docSlug: string): Guide[] {
    return GUIDES.filter((g) => g.related.includes(docSlug)).sort((a, b) => b.updated.localeCompare(a.updated))
}
