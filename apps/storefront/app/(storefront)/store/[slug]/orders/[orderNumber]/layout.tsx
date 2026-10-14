// The order page is a static shell that fetches its own data from the no-store API: an order is
// per-order and per-viewer, so it must never come from a cached page. Declared cacheable like the
// rest of the store tree (a client page cannot export route config, so it lives here).
export const revalidate = 3600

export function generateStaticParams() {
    return []
}

export default function OrderNumberLayout({ children }: { children: React.ReactNode }) {
    return children
}
