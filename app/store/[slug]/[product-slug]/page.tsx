'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import {
    ArrowLeft, Heart, ShoppingCart, Star, Minus, Plus,
    Shield, Truck, RefreshCw, Loader2,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { createClient } from '@/lib/client';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProductVariant {
    id: string;
    name: string;
    price: number;
    inventory_quantity: number;
    options: Record<string, string>;
    sku: string | null;
    image_url: string | null;
}

interface ProductData {
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
    metadata: {
        tags?: string[];
        productType?: string;
        rating?: number;
        reviews?: number;
        features?: string[];
        descriptionHtml?: string;
    };
    variants?: ProductVariant[];
}

export default function ProductDetailPage() {
    const params = useParams();
    const productSlug = params?.['product-slug'] as string;
    const { storeSlug, addToCart, itemLoadingStates } = useCart();
    const supabase = createClient();

    const [product, setProduct] = useState<ProductData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
    const [quantity, setQuantity] = useState(1);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [imageLoaded, setImageLoaded] = useState(false);

    const fetchProduct = useCallback(async () => {
        try {
            setError(null);
            setLoading(true);

            if (!storeSlug || !productSlug) throw new Error('Store or product not available');

            const { data: store, error: storeError } = await supabase
                .from('stores')
                .select('id')
                .eq('slug', storeSlug)
                .eq('is_active', true)
                .single();

            if (storeError || !store) throw new Error('Store not found');

            const { data: productData, error: productError } = await supabase
                .from('products')
                .select('id, name, slug, description, price, compare_at_price, images, inventory_quantity, is_active, sku, metadata')
                .eq('store_id', store.id)
                .eq('slug', productSlug)
                .eq('is_active', true)
                .single();

            if (productError || !productData) {
                setError('Product not found');
                return;
            }

            const { data: variantsData, error: variantsError } = await supabase
                .from('product_variants')
                .select('id, name, price, inventory_quantity, options, sku, image_url, is_active, position')
                .eq('product_id', productData.id)
                .eq('is_active', true)
                .order('position', { ascending: true });

            if (variantsError) console.warn('Variants error (optional):', variantsError);

            const variants = variantsData || [];
            setProduct({ ...productData, variants });

            if (variants.length > 0) {
                setSelectedVariant(variants[0]);
                setSelectedOptions(variants[0].options || {});
            } else {
                setSelectedVariant({
                    id: productData.id,
                    name: 'Default',
                    price: productData.price,
                    inventory_quantity: productData.inventory_quantity,
                    options: {},
                    sku: productData.sku,
                    image_url: null,
                });
            }
        } catch (err: any) {
            console.error('Error fetching product:', err);
            setError(err.message || 'Failed to fetch product');
        } finally {
            setLoading(false);
        }
    }, [storeSlug, productSlug, supabase]);

    useEffect(() => {
        if (productSlug) fetchProduct();
    }, [fetchProduct]);

    useEffect(() => {
        if (product?.variants?.length && Object.keys(selectedOptions).length > 0) {
            const variant = product.variants.find((v) =>
                Object.entries(selectedOptions).every(([key, value]) => v.options?.[key] === value)
            );
            if (variant) setSelectedVariant(variant);
        }
    }, [selectedOptions, product]);

    const formatPrice = (price: number) =>
        new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(price);

    const handleOptionChange = (optionName: string, value: string) =>
        setSelectedOptions(prev => ({ ...prev, [optionName]: value }));

    const handleAddToCart = async () => {
        if (!selectedVariant || !product) return;
        await addToCart({
            variantId: selectedVariant.id,
            productId: product.id,
            name: `${product.name} - ${selectedVariant.name}`,
            price: selectedVariant.price,
            image: product.images[0] || '',
            quantity,
        });
    };

    const nextImage = () =>
        product && product.images.length > 1 && setCurrentImageIndex(prev =>
            prev === product.images.length - 1 ? 0 : prev + 1
        );

    const prevImage = () =>
        product && product.images.length > 1 && setCurrentImageIndex(prev =>
            prev === 0 ? product.images.length - 1 : prev - 1
        );

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen pt-20">
                <div className="max-w-7xl mx-auto px-8 py-12">
                    <div className="flex justify-center items-center min-h-[60vh]">
                        <div className="text-center">
                            <Loader2 className="w-12 h-12 sf-text-primary animate-spin mx-auto mb-4" />
                            <p className="opacity-50 font-light">Loading product details...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Error ─────────────────────────────────────────────────────────────────
    if (error || !product) {
        return (
            <div className="min-h-screen">
                <div className="max-w-7xl mx-auto px-8 py-12">
                    <div className="flex justify-center items-center min-h-[60vh]">
                        <Alert variant="destructive" className="max-w-md">
                            <AlertTitle>Product Not Found</AlertTitle>
                            <AlertDescription>
                                {error || "The product you're looking for doesn't exist."}
                                <Button variant="outline" className="mt-4 w-full" asChild>
                                    <Link href="/products">
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Back to Products
                                    </Link>
                                </Button>
                            </AlertDescription>
                        </Alert>
                    </div>
                </div>
            </div>
        );
    }

    const currentImage = product.images[currentImageIndex];
    const isInStock = (selectedVariant?.inventory_quantity ?? 0) > 0;
    const maxQuantity = selectedVariant?.inventory_quantity || 0;
    const tags = product.metadata?.tags || [];
    const rating = product.metadata?.rating || 4;
    const reviews = product.metadata?.reviews || 24;
    const variantLoading = selectedVariant?.id ? itemLoadingStates[selectedVariant.id] : false;

    const availableOptions: Record<string, Set<string>> = {};
    product.variants?.forEach(variant => {
        Object.entries(variant.options || {}).forEach(([key, value]) => {
            if (!availableOptions[key]) availableOptions[key] = new Set();
            availableOptions[key].add(value);
        });
    });

    // ── Main render ───────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen pt-8">
            <div className="max-w-7xl mx-auto px-8 py-8">

                <Button variant="ghost" className="mb-8 -ml-4" asChild>
                    <Link href="/products">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Products
                    </Link>
                </Button>

                <div className="grid lg:grid-cols-2 gap-12">

                    {/* ── Product Images ── */}
                    <div className="space-y-4">
                        <Card className="sf-card overflow-hidden py-0">
                            <div className="relative aspect-square sf-bg-muted">
                                {currentImage && (
                                    <Image
                                        src={currentImage}
                                        alt={product.name}
                                        fill
                                        className={cn(
                                            "object-cover transition-opacity",
                                            imageLoaded ? 'opacity-100' : 'opacity-0'
                                        )}
                                        onLoad={() => setImageLoaded(true)}
                                    />
                                )}

                                {!imageLoaded && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="sf-image-spinner h-8 w-8 border-2 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}

                                {product.images.length > 1 && (
                                    <>
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            onClick={prevImage}
                                            className="absolute left-4 top-1/2 -translate-y-1/2"
                                        >
                                            <ChevronLeft className="h-5 w-5" />
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            onClick={nextImage}
                                            className="absolute right-4 top-1/2 -translate-y-1/2"
                                        >
                                            <ChevronRight className="h-5 w-5" />
                                        </Button>
                                    </>
                                )}

                                {product.images.length > 1 && (
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                                        {product.images.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setCurrentImageIndex(index)}
                                                className={cn(
                                                    "h-1.5 rounded-full transition-all",
                                                    index === currentImageIndex
                                                        ? 'sf-dot-active w-6'
                                                        : 'sf-dot-inactive w-1.5'
                                                )}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>

                        {product.images.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-2 -mb-2">
                                {product.images.map((image, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentImageIndex(index)}
                                        className={cn(
                                            "flex-shrink-0 w-20 h-20 overflow-hidden border-2 rounded-lg transition-all",
                                            index === currentImageIndex
                                                ? 'sf-thumb-active'
                                                : 'sf-thumb-inactive'
                                        )}
                                    >
                                        <Image
                                            src={image}
                                            alt={`${product.name} ${index + 1}`}
                                            width={80}
                                            height={80}
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Product Info ── */}
                    <div className="space-y-6 lg:max-w-2xl">

                        <h1 className="sf-heading text-3xl lg:text-4xl font-light tracking-tight">
                            {product.name}
                        </h1>

                        {/* Rating */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        className={cn(
                                            "h-4 w-4 transition-colors",
                                            i < Math.floor(rating)
                                                ? 'sf-star-filled'
                                                : 'sf-star-empty'
                                        )}
                                    />
                                ))}
                            </div>
                            <span className="text-sm opacity-50">
                                {rating.toFixed(1)} ({reviews} reviews)
                            </span>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-4">
                            <div className="text-3xl lg:text-4xl font-light sf-text-primary">
                                {selectedVariant ? formatPrice(selectedVariant.price) : formatPrice(product.price)}
                            </div>
                            {product.compare_at_price && product.compare_at_price > (selectedVariant?.price || product.price) && (
                                <div className="text-xl opacity-40 line-through">
                                    {formatPrice(product.compare_at_price)}
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div className="sf-prose text-sm leading-relaxed font-light opacity-70">
                            {product.metadata?.descriptionHtml ? (
                                <div
                                    className="prose prose-sm max-w-none prose-headings:font-normal prose-p:my-3 prose-ul:my-3 prose-ol:my-3 prose-li:my-1"
                                    dangerouslySetInnerHTML={{ __html: product.metadata.descriptionHtml }}
                                />
                            ) : (
                                <ReactMarkdown
                                    components={{
                                        h1: ({ children }) => <h1 className="sf-heading text-xl font-normal mt-4 mb-2">{children}</h1>,
                                        h2: ({ children }) => <h2 className="sf-heading text-lg font-normal mt-3 mb-2">{children}</h2>,
                                        h3: ({ children }) => <h3 className="sf-heading text-base font-normal mt-2 mb-1">{children}</h3>,
                                        p: ({ children }) => <p className="my-3">{children}</p>,
                                        ul: ({ children }) => <ul className="my-3 ml-6 list-disc">{children}</ul>,
                                        ol: ({ children }) => <ol className="my-3 ml-6 list-decimal">{children}</ol>,
                                        li: ({ children }) => <li className="my-1">{children}</li>,
                                        strong: ({ children }) => <strong className="font-medium">{children}</strong>,
                                        em: ({ children }) => <em className="italic">{children}</em>,
                                        a: ({ children, href }) => (
                                            <a href={href} className="sf-text-primary hover:underline font-medium">
                                                {children}
                                            </a>
                                        ),
                                    }}
                                >
                                    {product.description || 'No description available for this product.'}
                                </ReactMarkdown>
                            )}
                        </div>

                        {/* Stock status */}
                        <div className="flex items-center gap-3">
                            <div className={cn("h-2 w-2 rounded-full", isInStock ? 'sf-dot-instock' : 'sf-dot-outofstock')} />
                            <span className={cn("text-sm font-normal", isInStock ? 'sf-text-instock' : 'sf-text-outofstock')}>
                                {isInStock
                                    ? `In Stock (${selectedVariant?.inventory_quantity || 0} available)`
                                    : 'Out of Stock'}
                            </span>
                        </div>

                        {/* Variant options */}
                        {Object.keys(availableOptions).length > 0 && (
                            <div className="space-y-4">
                                {Object.entries(availableOptions).map(([optionName, values]) => (
                                    <div key={optionName}>
                                        <label className="text-sm font-normal mb-2 block capitalize">
                                            {optionName}:
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {Array.from(values).map((value) => (
                                                <Button
                                                    key={value}
                                                    variant={selectedOptions[optionName] === value ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => handleOptionChange(optionName, value)}
                                                    className={cn(
                                                        "capitalize",
                                                        selectedOptions[optionName] === value && 'sf-btn-primary'
                                                    )}
                                                >
                                                    {value}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Quantity */}
                        {isInStock && (
                            <div className="flex items-center gap-4">
                                <label className="text-sm font-normal whitespace-nowrap">Quantity:</label>
                                <div className="flex items-center border rounded-lg px-1">
                                    <Button
                                        variant="ghost" size="icon"
                                        className="h-10 w-10 p-0 hover:bg-transparent"
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        disabled={quantity <= 1}
                                    >
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="px-4 py-2 text-sm font-normal min-w-[3rem] text-center">
                                        {quantity}
                                    </span>
                                    <Button
                                        variant="ghost" size="icon"
                                        className="h-10 w-10 p-0 hover:bg-transparent"
                                        onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                                        disabled={quantity >= maxQuantity}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Add to Cart */}
                        <div className="flex gap-3">
                            <Button
                                onClick={handleAddToCart}
                                disabled={!isInStock || variantLoading}
                                className="flex-1 justify-center sf-btn-primary"
                                size="lg"
                            >
                                {variantLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart className="mr-2 h-5 w-5" />
                                        {isInStock ? 'Add to Cart' : 'Out of Stock'}
                                    </>
                                )}
                            </Button>
                            <Button variant="outline" size="icon" className="h-12 w-12 shrink-0">
                                <Heart className="h-5 w-5" />
                            </Button>
                        </div>

                        <Separator />

                        {/* Guarantees */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-start gap-3 opacity-60">
                                <Truck className="h-5 w-5 mt-0.5 shrink-0 sf-text-primary" />
                                <span>Fast Shipping</span>
                            </div>
                            <div className="flex items-start gap-3 opacity-60">
                                <Shield className="h-5 w-5 mt-0.5 shrink-0 sf-text-primary" />
                                <span>Secure Payment</span>
                            </div>
                            <div className="flex items-start gap-3 opacity-60">
                                <RefreshCw className="h-5 w-5 mt-0.5 shrink-0 sf-text-primary" />
                                <span>30-Day Returns</span>
                            </div>
                        </div>

                        {tags.length > 0 && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="text-sm font-normal mb-3">Tags:</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map((tag) => (
                                            <Badge key={tag} variant="secondary">{tag}</Badge>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
