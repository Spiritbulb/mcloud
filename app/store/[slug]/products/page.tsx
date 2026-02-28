'use client';

import { useEffect, useState, useCallback } from 'react';
import { Playfair_Display } from 'next/font/google';
import {
    Search, Loader2, ShoppingBag, X, Heart, Star,
    BadgeCheck, Package, Zap
} from 'lucide-react';
import { createClient } from '@/lib/client';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';

const playfairDisplay = Playfair_Display({
    subsets: ['latin'],
    variable: '--font-playfair-display',
    display: 'swap',
});

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
                variantId: product.id, // Use product ID as variant ID for simple products
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
        <Card className={cn("group hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col", className)}>
            <div className="relative overflow-hidden aspect-[4/5] bg-muted">
                <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />

                {hasDiscount && (
                    <Badge className="absolute top-3 left-3 z-10 bg-destructive text-destructive-foreground shadow-lg">
                        -{discount}%
                    </Badge>
                )}

                {stock === 0 && (
                    <div className="absolute inset-0 bg-destructive/80 flex items-center justify-center z-10">
                        <BadgeCheck className="w-6 h-6 text-destructive-foreground mr-1" />
                        Sold Out
                    </div>
                )}
            </div>

            <CardContent className="pt-4 pb-6 flex-1 flex flex-col">
                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                        <Star className="w-3 h-3 fill-primary" />
                        <span>4.8 (23)</span>
                    </div>

                    <Link href={`/${product.slug}`} className="block">
                        <CardTitle className="text-lg font-normal leading-tight hover:text-primary transition-colors line-clamp-2 group-hover:underline">
                            {product.name}
                        </CardTitle>
                    </Link>

                    <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                        {product.description || 'Premium quality product for your needs.'}
                    </CardDescription>
                </div>

                <div className="border-t pt-4 space-y-3 flex-1 flex flex-col justify-end">
                    <div className="flex items-end justify-between">
                        <div className="space-y-1">
                            <div className="text-xl font-light text-primary">
                                KSh {product.price.toLocaleString()}
                            </div>
                            {hasDiscount && (
                                <div className="text-sm text-muted-foreground line-through">
                                    KSh {product.compare_at_price!.toLocaleString()}
                                </div>
                            )}
                        </div>

                        {stock > 0 ? (
                            <Button
                                size="sm"
                                onClick={handleAddToCart}
                                disabled={isLoading}
                                className="flex-shrink-0"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <ShoppingBag className="w-4 h-4 mr-2" />
                                )}
                                Add to Cart
                            </Button>
                        ) : (
                            <Badge variant="secondary" className="flex-shrink-0">
                                <Package className="w-3 h-3 mr-1" />
                                Sold Out
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
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

    const { storeSlug } = useCart(); // Gets slug from CartContext (which awaits params)
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

            if (!storeSlug) {
                throw new Error('Store slug not available');
            }

            // Get the store ID
            const { data: store, error: storeError } = await supabase
                .from('stores')
                .select('id')
                .eq('slug', storeSlug)
                .eq('is_active', true)
                .single();

            if (storeError || !store) {
                throw new Error('Store not found');
            }

            // Fetch products
            const { data: productsData, error: productsError } = await supabase
                .from('products')
                .select('id, name, slug, description, price, compare_at_price, images, inventory_quantity, is_active, sku, metadata')
                .eq('store_id', store.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(100);

            if (productsError) {
                throw productsError;
            }

            const fetchedProducts = productsData || [];

            if (fetchedProducts.length === 0) {
                setError('No products available at the moment');
            }

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
        const name = product.name?.toLowerCase() || '';
        const description = product.description?.toLowerCase() || '';
        const sku = product.sku?.toLowerCase() || '';
        const metadataStr = JSON.stringify(product.metadata || {}).toLowerCase();

        return (
            name.includes(searchLower) ||
            description.includes(searchLower) ||
            sku.includes(searchLower) ||
            metadataStr.includes(searchLower)
        );
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="max-w-7xl mx-auto px-8 py-12">
                    <div className="flex justify-center items-center min-h-[60vh]">
                        <div className="text-center">
                            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                            <p className="text-muted-foreground">Loading products...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background">
                <div className="max-w-7xl mx-auto px-8 py-12">
                    <div className="flex justify-center items-center min-h-[60vh]">
                        <Alert variant="destructive" className="max-w-md">
                            <ShoppingBag className="h-5 w-5" />
                            <AlertTitle>Error Loading Products</AlertTitle>
                            <AlertDescription className="mt-2">
                                {error}
                                <Button onClick={fetchProducts} variant="outline" className="mt-4 w-full">
                                    Try Again
                                </Button>
                            </AlertDescription>
                        </Alert>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-8 py-12">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className={`text-4xl md:text-5xl font-light tracking-tight mb-4 ${playfairDisplay.className}`}>
                        The Full <span className="text-primary">Collection</span>
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8 font-light">
                        Premium hair care, elegant jewelry, and beauty essentials for your unique style
                    </p>

                    {/* Search Bar */}
                    <div className="max-w-2xl mx-auto">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search for products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 pr-12 h-12"
                            />
                            {searchQuery && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            )}
                        </div>

                        {debouncedSearch && (
                            <p className="text-sm text-muted-foreground mt-3">
                                {filteredProducts.length} {filteredProducts.length === 1 ? 'result' : 'results'} for "{debouncedSearch}"
                            </p>
                        )}
                    </div>
                </div>

                {/* Products Grid */}
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-20">
                        <Card className="max-w-md mx-auto border-border/50">
                            <CardContent className="pt-12 pb-12">
                                <div className="w-20 h-20 bg-muted flex items-center justify-center mx-auto mb-6">
                                    <Search className="w-10 h-10 text-muted-foreground" />
                                </div>
                                <h3 className="text-2xl font-light mb-3">
                                    {debouncedSearch ? 'No Products Found' : 'No Products Available'}
                                </h3>
                                <p className="text-muted-foreground mb-6 font-light">
                                    {debouncedSearch
                                        ? `We couldn't find any products matching "${debouncedSearch}".`
                                        : 'Check back soon for new arrivals.'
                                    }
                                </p>
                                {debouncedSearch && (
                                    <Button onClick={() => setSearchQuery('')}>Clear Search</Button>
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
                            <p className="text-muted-foreground text-sm font-light">
                                Showing <span className="font-normal text-foreground">{filteredProducts.length}</span> of{' '}
                                <span className="font-normal text-foreground">{products.length}</span> products
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
