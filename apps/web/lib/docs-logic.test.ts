import assert from "node:assert/strict"
import { test } from "node:test"
import {
    breadcrumbJsonLd,
    buildSearchIndex,
    docSeoTitle,
    docsSitemapEntries,
    faqJsonLd,
    resolveDocs,
    searchDocs,
    serializeJsonLd,
    slugify,
} from "./docs-logic"
import type { DocPage } from "./docs"
import type { Guide } from "./guides"

const page = (over: Partial<DocPage>): DocPage => ({ id: "x", title: "X", description: "", sections: [], ...over })

test("slugify makes URL-safe segments", () => {
    assert.equal(slugify("Plans & Billing"), "plans-and-billing")
    assert.equal(slugify("  M-PESA STK push (Daraja) "), "m-pesa-stk-push-daraja")
    assert.equal(slugify("Café"), "cafe")
})

test("resolveDocs prefers slug, then a URL-shaped id, then the title", () => {
    const [a, b, c, d] = resolveDocs([
        page({ id: "payments", slug: "Get Paid" }),
        page({ id: "domain" }),
        page({ id: "page-1730000000", title: "Track orders" }),
        page({ id: "Has Spaces", title: "Members" }),
    ])
    assert.equal(a.slug, "get-paid")
    assert.equal(b.slug, "domain")
    assert.equal(c.slug, "track-orders")
    assert.equal(d.slug, "members")
})

test("resolveDocs never repeats a slug and reserves 'guides'", () => {
    const slugs = resolveDocs([
        page({ id: "orders" }),
        page({ id: "page-1", title: "Orders" }),
        page({ id: "guides" }),
        page({ id: "page-2", title: "" }),
    ]).map((p) => p.slug)
    assert.deepEqual(slugs, ["orders", "orders-2", "guides-2", "page"])
})

test("docSeoTitle falls back to a branded title", () => {
    assert.equal(docSeoTitle(page({ title: "Domain" })), "Domain | Menengai Cloud Docs")
    assert.equal(docSeoTitle(page({ title: "Domain", seoTitle: "Connect a domain" })), "Connect a domain")
})

const guide: Guide = {
    slug: "accept-mpesa",
    title: "Accept M-PESA",
    description: "Payments guide",
    published: "2026-11-01",
    updated: "2026-11-02",
    related: ["payments"],
    faq: [{ q: "Is there a fee?", a: "No platform fee." }],
}

test("search matches every term across section text and guides", () => {
    const docs = resolveDocs([
        page({
            id: "payments",
            title: "Payments",
            sections: [{ id: "payments-daraja", title: "STK push", summary: "Prompt on phone", fields: [{ name: "Passkey", description: "From Safaricom" }] }],
        }),
    ])
    const index = buildSearchIndex(docs, [guide])
    assert.deepEqual(searchDocs(index, "passkey safaricom").map((e) => e.href), ["/docs/payments#payments-daraja"])
    assert.deepEqual(searchDocs(index, "platform fee").map((e) => e.href), ["/docs/guides/accept-mpesa"])
    assert.deepEqual(searchDocs(index, "   "), [])
})

test("structured data uses absolute URLs and escapes script-closing text", () => {
    const crumbs = breadcrumbJsonLd([{ name: "Docs", path: "/docs" }, { name: "Payments", path: "/docs/payments" }])
    assert.equal(crumbs.itemListElement[1].item, "https://mcloud.co.ke/docs/payments")
    assert.equal(crumbs.itemListElement[1].position, 2)
    assert.equal(faqJsonLd(guide.faq!).mainEntity[0].acceptedAnswer.text, "No platform fee.")
    const json = serializeJsonLd({ text: "</script><b>" })
    assert.ok(!json.includes("<"))
    assert.deepEqual(JSON.parse(json), { text: "</script><b>" })
})

test("sitemap lists every guide and doc page", () => {
    const urls = docsSitemapEntries(resolveDocs([page({ id: "domain" })]), [guide]).map((e) => e.url)
    assert.deepEqual(urls, [
        "https://mcloud.co.ke/docs/guides",
        "https://mcloud.co.ke/docs/guides/accept-mpesa",
        "https://mcloud.co.ke/docs/domain",
    ])
})
