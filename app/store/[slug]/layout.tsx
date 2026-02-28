// app/store/[slug]/layout.tsx
import { CartProvider } from '@/contexts/CartContext';

export default async function StoreLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    return (
        <CartProvider storeSlug={slug}>
            {children}
        </CartProvider>
    );
}
