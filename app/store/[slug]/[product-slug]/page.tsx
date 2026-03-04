'use client';

import '@/app/store/[slug]/storefront.css'
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import {
    ArrowLeft, ShoppingCart, Star, Minus, Plus,
    Shield, Truck, RefreshCw, Loader2,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { createClient } from '@/lib/client';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
                        <div className="text-center space-y-3">
                            <Loader2
                                className="w-10 h-10 animate-spin mx-auto"
                                style={{ color: 'var(--sf-foreground)', opacity: 0.5 }}
                            />
                            <p className="text-sm font-light" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                Loading product details...
                            </p>
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
                        <div
                            className="sf-card max-w-md w-full p-6 border space-y-3"
                            style={{ borderColor: 'var(--sf-border-strong)' }}
                        >
                            <p className="sf-heading font-semibold" style={{ color: 'var(--sf-foreground)' }}>
                                Product Not Found
                            </p>
                            <p className="text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                {error || "The product you're looking for doesn't exist."}
                            </p>
                            <Link
                                href="/products"
                                className="sf-pill sf-pill-inactive border inline-flex items-center gap-2 px-4 py-2 text-sm mt-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Products
                            </Link>
                        </div>
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
    const hasDiscount = product.compare_at_price && product.compare_at_price > (selectedVariant?.price || product.price);

    const availableOptions: Record<string, Set<string>> = {};
    product.variants?.forEach(variant => {
        Object.entries(variant.options || {}).forEach(([key, value]) => {
            if (!availableOptions[key]) availableOptions[key] = new Set();
            availableOptions[key].add(value);
        });
    });

    // ── Main render ───────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen pt-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">

                {/* Back link */}
                <Link
                    href="/products"
                    className="sf-pill sf-pill-inactive border inline-flex items-center gap-2 px-3 py-1.5 text-sm mb-8"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Products
                </Link>

                <div className="grid lg:grid-cols-2 gap-10 xl:gap-16">

                    {/* ── Images ─────────────────────────────────────────────── */}
                    <div className="space-y-3">
                        {/* Main image */}
                        <Card className="sf-card overflow-hidden py-0">
                            <div className="relative aspect-square sf-bg-muted">
                                {currentImage ? (
                                    <Image
                                        src={currentImage}
                                        alt={product.name}
                                        fill
                                        className={cn(
                                            "object-cover transition-opacity duration-300",
                                            imageLoaded ? 'opacity-100' : 'opacity-0'
                                        )}
                                        onLoad={() => setImageLoaded(true)}
                                    />
                                ) : null}

                                {!imageLoaded && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div
                                            className="sf-image-spinner h-8 w-8 border-2 border-t-transparent rounded-full animate-spin"
                                        />
                                    </div>
                                )}

                                {/* Prev / next arrows */}
                                {product.images.length > 1 && (
                                    <>
                                        <button
                                            onClick={prevImage}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center"
                                            style={{
                                                backgroundColor: 'var(--sf-background)',
                                                color: 'var(--sf-foreground)',
                                                border: '1px solid var(--sf-border-strong)',
                                            }}
                                            aria-label="Previous image"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={nextImage}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center"
                                            style={{
                                                backgroundColor: 'var(--sf-background)',
                                                color: 'var(--sf-foreground)',
                                                border: '1px solid var(--sf-border-strong)',
                                            }}
                                            aria-label="Next image"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </>
                                )}

                                {/* Dot indicators */}
                                {product.images.length > 1 && (
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                        {product.images.map((_, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setCurrentImageIndex(index)}
                                                className={cn(
                                                    "h-1 rounded-full transition-all",
                                                    index === currentImageIndex
                                                        ? 'sf-dot-active w-6'
                                                        : 'sf-dot-inactive w-1.5'
                                                )}
                                                aria-label={`View image ${index + 1}`}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Thumbnails */}
                        {product.images.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {product.images.map((image, index) => (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            setCurrentImageIndex(index);
                                            setImageLoaded(false);
                                        }}
                                        className={cn(
                                            "flex-shrink-0 w-20 h-20 overflow-hidden border-2 transition-all",
                                            index === currentImageIndex
                                                ? 'sf-thumb-active'
                                                : 'sf-thumb-inactive'
                                        )}
                                        aria-label={`View image ${index + 1}`}
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

                    {/* ── Product info ────────────────────────────────────────── */}
                    <div className="space-y-6 lg:max-w-lg">

                        {/* Title + sale badge */}
                        <div className="space-y-2">
                            {hasDiscount && (
                                <span className="sf-badge-sale inline-flex items-center px-2.5 py-0.5 text-xs font-medium">
                                    Sale
                                </span>
                            )}
                            <h1 className="sf-heading text-3xl lg:text-4xl font-light tracking-tight">
                                {product.name}
                            </h1>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        className={cn(
                                            "h-4 w-4",
                                            i < Math.floor(rating) ? 'sf-star-filled' : 'sf-star-empty'
                                        )}
                                    />
                                ))}
                            </div>
                            <span className="text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                {rating.toFixed(1)} &middot; {reviews} reviews
                            </span>
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-3">
                            <span className="text-3xl font-light" style={{ color: 'var(--sf-foreground)' }}>
                                {selectedVariant ? formatPrice(selectedVariant.price) : formatPrice(product.price)}
                            </span>
                            {hasDiscount && (
                                <span
                                    className="text-lg line-through"
                                    style={{ color: 'var(--sf-foreground)', opacity: 0.38 }}
                                >
                                    {formatPrice(product.compare_at_price!)}
                                </span>
                            )}
                        </div>

                        <div style={{ height: '1px', backgroundColor: 'var(--sf-border)' }} />

                        {/* Description */}
                        <div
                            className="sf-prose text-sm leading-relaxed font-light"
                            style={{ color: 'var(--sf-foreground-subtle)' }}
                        >
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
                                            <a
                                                href={href}
                                                className="underline underline-offset-2"
                                                style={{ color: 'var(--sf-foreground)' }}
                                            >
                                                {children}
                                            </a>
                                        ),
                                    }}
                                >
                                    {product.description || 'No description available for this product.'}
                                </ReactMarkdown>
                            )}
                        </div>

                        <div style={{ height: '1px', backgroundColor: 'var(--sf-border)' }} />

                        {/* Stock status */}
                        <div className="flex items-center gap-2">
                            <div className={cn("h-2 w-2 rounded-full flex-shrink-0", isInStock ? 'sf-dot-instock' : 'sf-dot-outofstock')} />
                            <span className={cn("text-sm", isInStock ? 'sf-text-instock' : 'sf-text-outofstock')}>
                                {isInStock
                                    ? `In stock — ${selectedVariant?.inventory_quantity} available`
                                    : 'Out of stock'}
                            </span>
                        </div>

                        {/* Variant options */}
                        {Object.keys(availableOptions).length > 0 && (
                            <div className="space-y-4">
                                {Object.entries(availableOptions).map(([optionName, values]) => (
                                    <div key={optionName}>
                                        <label
                                            className="text-xs uppercase tracking-wider mb-2 block"
                                            style={{ color: 'var(--sf-foreground-subtle)' }}
                                        >
                                            {optionName}
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {Array.from(values).map((value) => {
                                                const active = selectedOptions[optionName] === value;
                                                return (
                                                    <button
                                                        key={value}
                                                        onClick={() => handleOptionChange(optionName, value)}
                                                        className={cn("sf-pill capitalize px-4 py-1.5 text-sm border transition-colors",
                                                            active ? 'sf-pill-active' : 'sf-pill-inactive'
                                                        )}
                                                    >
                                                        {value}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Quantity */}
                        {isInStock && (
                            <div className="flex items-center gap-4">
                                <label
                                    className="text-xs uppercase tracking-wider"
                                    style={{ color: 'var(--sf-foreground-subtle)' }}
                                >
                                    Quantity
                                </label>
                                <div
                                    className="inline-flex items-center"
                                    style={{ border: '1px solid var(--sf-border-strong)' }}
                                >
                                    <button
                                        className="w-10 h-10 flex items-center justify-center transition-colors disabled:opacity-30"
                                        style={{ color: 'var(--sf-foreground)' }}
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        disabled={quantity <= 1}
                                        aria-label="Decrease quantity"
                                    >
                                        <Minus className="h-3.5 w-3.5" />
                                    </button>
                                    <span
                                        className="px-4 text-sm min-w-[3rem] text-center tabular-nums"
                                        style={{ color: 'var(--sf-foreground)' }}
                                    >
                                        {quantity}
                                    </span>
                                    <button
                                        className="w-10 h-10 flex items-center justify-center transition-colors disabled:opacity-30"
                                        style={{ color: 'var(--sf-foreground)' }}
                                        onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                                        disabled={quantity >= maxQuantity}
                                        aria-label="Increase quantity"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Add to Cart — full width, no wishlist */}
                        <Button
                            onClick={handleAddToCart}
                            disabled={!isInStock || variantLoading}
                            className="w-full sf-btn-primary justify-center"
                            size="lg"
                        >
                            {variantLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                <>
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                    {isInStock ? 'Add to Cart' : 'Out of Stock'}
                                </>
                            )}
                        </Button>

                        {/* Guarantees */}
                        <div
                            className="grid grid-cols-3 gap-3 pt-2"
                            style={{ borderTop: '1px solid var(--sf-border)' }}
                        >
                            {[
                                { icon: Truck, label: 'Fast Shipping' },
                                { icon: Shield, label: 'Secure Payment' },
                                { icon: RefreshCw, label: '30-Day Returns' },
                            ].map(({ icon: Icon, label }) => (
                                <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                                    <Icon
                                        className="h-4 w-4"
                                        style={{ color: 'var(--sf-foreground)', opacity: 0.45 }}
                                    />
                                    <span
                                        className="text-xs leading-tight"
                                        style={{ color: 'var(--sf-foreground-subtle)' }}
                                    >
                                        {label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Tags */}
                        {tags.length > 0 && (
                            <div style={{ borderTop: '1px solid var(--sf-border)', paddingTop: '1rem' }}>
                                <p
                                    className="text-xs uppercase tracking-wider mb-2"
                                    style={{ color: 'var(--sf-foreground-subtle)' }}
                                >
                                    Tags
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="sf-badge-outline inline-flex items-center border px-2.5 py-0.5 text-xs"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}