'use client';

import '@/app/store/[slug]/storefront.css'
import { useEffect, useState, useCallback } from 'react';
import {
    Search, Loader2, ShoppingBag, X,
    Star, BadgeCheck, Package, Zap
} from 'lucide-react';
import { createClient } from '@/lib/client';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    compare_at_price: number | null;
    images: string[];
    inventory_quantity: number;
    is_active: boolean;
    sku: string | null;
    metadata: any;
}

interface ProductCardProps {
    product: Product;
    className?: string;
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, className }: ProductCardProps) {
    const { addToCart, storeSlug } = useCart();
    const [isLoading, setIsLoading] = useState(false);

    const imageUrl = Array.isArray(product.images) && product.images.length > 0
        ? product.images[0]
        : '/api/placeholder/400/500';

    const stock = product.inventory_quantity;
    const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
    const discount = hasDiscount
        ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
        : 0;

    const handleAddToCart = async () => {
        setIsLoading(true);
        try {
            addToCart({
                variantId: product.id,
                productId: product.id,
                name: product.name,
                price: product.price,
                image: imageUrl,
                quantity: 1,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className={cn("sf-card group hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col py-0", className)}>
            {/* Image */}
            <div className="relative overflow-hidden aspect-[4/5] sf-bg-muted">
                <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />

                {hasDiscount && (
                    <span className="sf-badge-sale absolute top-3 left-3 z-10 shadow-lg inline-flex items-center px-2.5 py-0.5 text-xs font-medium">
                        -{discount}%
                    </span>
                )}

                {stock === 0 && (
                    <div className="absolute inset-0 sf-bg-sold-out flex items-center justify-center z-10">
                        <BadgeCheck className="w-6 h-6 mr-1 text-white" />
                        <span className="text-white font-medium">Sold Out</span>
                    </div>
                )}
            </div>

            <CardContent className="pt-4 pb-6 flex-1 flex flex-col">
                <div className="space-y-2 mb-4">
                    {/* Star rating — use sf-foreground at low opacity, not a default blue */}
                    <div className="flex items-center gap-1 text-sm mb-1" style={{ color: 'var(--sf-foreground)', opacity: 0.45 }}>
                        <Star className="w-3 h-3 sf-star-filled" />
                        <span>4.8 (23)</span>
                    </div>

                    <Link href={`/${product.slug}`} className="block">
                        <CardTitle
                            className="sf-heading text-lg font-normal leading-tight line-clamp-2 group-hover:underline"
                            style={{ color: 'var(--sf-foreground)' }}
                        >
                            {product.name}
                        </CardTitle>
                    </Link>

                    {/* CardDescription: override shadcn's text-muted-foreground (blue-gray) */}
                    <CardDescription>
                        <span
                            className="text-sm line-clamp-2 block"
                            style={{ color: 'var(--sf-foreground-subtle)' }}
                        >
                            {/* 120 characters */}
                            {product.description?.slice(0, 100) + '...' || 'Premium quality product for your needs.'}
                        </span>
                    </CardDescription>
                </div>

                <div className="flex-1 flex flex-col justify-end space-y-3"
                    style={{ borderTop: '1px solid var(--sf-border)', paddingTop: '1rem' }}
                >
                    <div className="flex items-end justify-between">
                        <div className="space-y-1">
                            <div className="text-xl font-light" style={{ color: 'var(--sf-foreground)' }}>
                                KSh {product.price.toLocaleString()}
                            </div>
                            {hasDiscount && (
                                <div className="text-sm line-through" style={{ color: 'var(--sf-foreground)', opacity: 0.38 }}>
                                    KSh {product.compare_at_price!.toLocaleString()}
                                </div>
                            )}
                        </div>

                        {stock > 0 ? (
                            <Button
                                size="sm"
                                onClick={handleAddToCart}
                                disabled={isLoading}
                                className="sf-btn-primary flex-shrink-0"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <ShoppingBag className="w-4 h-4 mr-2" />
                                )}
                                Add to Cart
                            </Button>
                        ) : (
                            /* Replaced Badge variant="secondary" (shadcn blue-gray) with sf token span */
                            <span
                                className="sf-badge-oos flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium"
                            >
                                <Package className="w-3 h-3" />
                                Sold Out
                            </span>
                        )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2" style={{ color: 'var(--sf-foreground)', opacity: 0.38 }}>
                        <span>SKU: {product.sku || product.id.slice(-8)}</span>
                        {stock > 0 && (
                            <span className="flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                {stock} in stock
                            </span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Products Page ────────────────────────────────────────────────────────────
export default function ProductsPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const { storeSlug } = useCart();
    const supabase = createClient();

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchProducts = useCallback(async () => {
        try {
            setError(null);
            setLoading(true);

            if (!storeSlug) throw new Error('Store slug not available');

            const { data: store, error: storeError } = await supabase
                .from('stores')
                .select('id')
                .eq('slug', storeSlug)
                .eq('is_active', true)
                .single();

            if (storeError || !store) throw new Error('Store not found');

            const { data: productsData, error: productsError } = await supabase
                .from('products')
                .select('id, name, slug, description, price, compare_at_price, images, inventory_quantity, is_active, sku, metadata')
                .eq('store_id', store.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(100);

            if (productsError) throw productsError;

            const fetchedProducts = productsData || [];
            if (fetchedProducts.length === 0) setError('No products available at the moment');
            setProducts(fetchedProducts);
        } catch (err: any) {
            console.error('Error fetching products:', err);
            setError(err.message || 'Failed to load products. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [storeSlug, supabase]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const filteredProducts = products.filter((product) => {
        if (!debouncedSearch.trim()) return true;
        const searchLower = debouncedSearch.toLowerCase().trim();
        return (
            product.name?.toLowerCase().includes(searchLower) ||
            product.description?.toLowerCase().includes(searchLower) ||
            product.sku?.toLowerCase().includes(searchLower) ||
            JSON.stringify(product.metadata || {}).toLowerCase().includes(searchLower)
        );
    });

    // ── Loading state ─────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen">
                <div className="max-w-7xl mx-auto px-8 py-12">
                    <div className="flex justify-center items-center min-h-[60vh]">
                        <div className="text-center">
                            <Loader2
                                className="w-12 h-12 animate-spin mx-auto mb-4"
                                style={{ color: 'var(--sf-foreground)' }}
                            />
                            <p style={{ color: 'var(--sf-foreground-subtle)' }}>Loading products...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Error state ───────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="min-h-screen">
                <div className="max-w-7xl mx-auto px-8 py-12">
                    <div className="flex justify-center items-center min-h-[60vh]">
                        {/* Replaced shadcn Alert variant="destructive" — uses red from app theme, not sf tokens */}
                        <div
                            className="sf-card max-w-md w-full p-6 space-y-3 border"
                            style={{ borderColor: 'var(--sf-border-strong)' }}
                        >
                            <div className="flex items-center gap-2" style={{ color: 'var(--sf-foreground)' }}>
                                <ShoppingBag className="h-5 w-5 flex-shrink-0" />
                                <span className="sf-heading font-semibold">Error Loading Products</span>
                            </div>
                            <p className="text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                {error}
                            </p>
                            <button
                                onClick={fetchProducts}
                                className="sf-pill sf-pill-inactive border w-full py-2 text-sm mt-2"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Main render ───────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen">
            <div className="max-w-7xl mx-auto px-8 py-12">

                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="sf-heading text-4xl md:text-5xl font-light tracking-tight mb-4">
                        The Full{' '}
                        <span className="sf-text-accent">Collection</span>
                    </h1>
                    <p className="text-lg max-w-2xl mx-auto mb-8 font-light" style={{ color: 'var(--sf-foreground-subtle)' }}>
                        Premium hair care, elegant jewelry, and beauty essentials for your unique style
                    </p>

                    {/* Search Bar */}
                    <div className="max-w-2xl mx-auto">
                        <div className="relative">
                            <Search
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                                style={{ color: 'var(--sf-foreground)', opacity: 0.38 }}
                            />
                            <Input
                                type="text"
                                placeholder="Search for products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 pr-12 h-12"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                                    style={{ color: 'var(--sf-foreground)', opacity: 0.5 }}
                                    aria-label="Clear search"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {debouncedSearch && (
                            <p className="text-sm mt-3" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                {filteredProducts.length} {filteredProducts.length === 1 ? 'result' : 'results'} for &ldquo;{debouncedSearch}&rdquo;
                            </p>
                        )}
                    </div>
                </div>

                {/* Products Grid */}
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-20">
                        <Card className="sf-card max-w-md mx-auto">
                            <CardContent className="pt-12 pb-12">
                                <div className="w-20 h-20 sf-bg-muted flex items-center justify-center mx-auto mb-6">
                                    <Search
                                        className="w-10 h-10"
                                        style={{ color: 'var(--sf-foreground)', opacity: 0.25 }}
                                    />
                                </div>
                                <h3 className="sf-heading text-2xl font-light mb-3">
                                    {debouncedSearch ? 'No Products Found' : 'No Products Available'}
                                </h3>
                                <p className="mb-6 font-light" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                    {debouncedSearch
                                        ? `We couldn't find any products matching "${debouncedSearch}".`
                                        : 'Check back soon for new arrivals.'
                                    }
                                </p>
                                {debouncedSearch && (
                                    <button
                                        className="sf-btn-primary px-6 py-2 text-sm"
                                        onClick={() => setSearchQuery('')}
                                    >
                                        Clear Search
                                    </button>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {filteredProducts.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>

                        <div className="mt-12 text-center">
                            <p className="text-sm font-light" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                Showing{' '}
                                <span style={{ color: 'var(--sf-foreground)' }}>{filteredProducts.length}</span>{' '}
                                of{' '}
                                <span style={{ color: 'var(--sf-foreground)' }}>{products.length}</span>{' '}
                                products
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}