import type { Metadata } from 'next'

// An order page is private to whoever holds the link: keep it out of search results.
export const metadata: Metadata = {
    title: 'Your order',
    robots: { index: false, follow: false },
}

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
    return children
}
