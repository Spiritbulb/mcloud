'use client'

import Image from 'next/image'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, ShoppingCart, Minus, Plus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ProductDetailPageProps } from '../types'

function Grain() {
    return (
        <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[100] opacity-[0.032] mix-blend-overlay"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")` }}
        />
    )
}

export default function NoirProductDetailPage({
    product, selectedVariant, selectedOptions, quantity,
    currentImageIndex, onOptionChange, onQuantityChange,
    onImageChange, onAddToCart, isAddingToCart,
}: ProductDetailPageProps) {
    const formatPrice = (p: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(p)
    const isInStock = (selectedVariant?.inventory_quantity ?? 0) > 0
    const maxQty = selectedVariant?.inventory_quantity || 0
    const hasDiscount = product.compare_at_price && product.compare_at_price > (selectedVariant?.price || product.price)
    const tags = product.metadata?.tags || []

    const availableOptions: Record<string, Set<string>> = {}
    product.variants?.forEach(v => {
        Object.entries(v.options || {}).forEach(([k, val]) => {
            if (!availableOptions[k]) availableOptions[k] = new Set()
            availableOptions[k].add(val)
        })
    })

    return (
        <div className="min-h-screen bg-[#080808] text-[#e8e2d9]" style={{ fontFamily: "'Jost', sans-serif" }}>
            <Grain />

            <div className="px-8 md:px-16 lg:px-24 pt-24 pb-20">
                {/* Back */}
                <Link href="/products" className="inline-flex items-center gap-2 text-[9px] tracking-[0.35em] uppercase text-[#555] hover:text-[#c9a96e] transition-colors mb-12 group">
                    <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
                    All pieces
                </Link>

                <div className="grid lg:grid-cols-2 gap-12 xl:gap-24">
                    {/* ── Images ── */}
                    <div className="space-y-3">
                        {/* Main */}
                        <div className="relative aspect-[4/5] bg-[#0d0d0d] overflow-hidden group">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentImageIndex}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.4 }}
                                    className="absolute inset-0"
                                >
                                    {product.images[currentImageIndex] && (
                                        <img
                                            src={product.images[currentImageIndex]}
                                            alt={product.name}
                                            className="object-cover opacity-90 w-full h-full"
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>

                            {/* Nav arrows */}
                            {product.images.length > 1 && (
                                <>
                                    <button
                                        onClick={() => onImageChange(currentImageIndex === 0 ? product.images.length - 1 : currentImageIndex - 1)}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 border border-[#333] bg-black/60 flex items-center justify-center text-[#888] hover:text-[#c9a96e] hover:border-[#c9a96e]/50 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onImageChange(currentImageIndex === product.images.length - 1 ? 0 : currentImageIndex + 1)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 border border-[#333] bg-black/60 flex items-center justify-center text-[#888] hover:text-[#c9a96e] hover:border-[#c9a96e]/50 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </>
                            )}

                            {/* Dot indicators */}
                            {product.images.length > 1 && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                    {product.images.map((_, i) => (
                                        <button key={i} onClick={() => onImageChange(i)}
                                            className={cn('w-1 h-1 rounded-full transition-all duration-300', i === currentImageIndex ? 'bg-[#c9a96e] w-4' : 'bg-[#444]')}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {product.images.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto">
                                {product.images.map((img, i) => (
                                    <button
                                        key={i}
                                        onClick={() => onImageChange(i)}
                                        className={cn('flex-shrink-0 w-16 h-20 overflow-hidden border transition-colors', i === currentImageIndex ? 'border-[#c9a96e]/60' : 'border-[#1a1a1a] hover:border-[#333]')}
                                    >
                                        <img src={img} alt="" width={64} height={80} className="w-full h-full object-cover opacity-80" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Info ── */}
                    <div className="space-y-8 lg:pt-4">
                        {/* Title */}
                        <div>
                            {hasDiscount && (
                                <p className="text-[9px] tracking-[0.3em] uppercase text-[#c9a96e] mb-3">On sale</p>
                            )}
                            <h1
                                className="text-4xl md:text-5xl lg:text-6xl font-normal uppercase leading-none text-white mb-4"
                                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.02em' }}
                            >
                                {product.name}
                            </h1>
                            <div className="h-px bg-[#1a1a1a]" />
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-4">
                            <span
                                className="text-2xl font-light text-[#c9a96e]"
                                style={{ fontFamily: "'Cormorant Garamond', serif" }}
                            >
                                {selectedVariant ? formatPrice(selectedVariant.price) : formatPrice(product.price)}
                            </span>
                            {hasDiscount && (
                                <span className="text-base text-[#444] line-through" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                                    {formatPrice(product.compare_at_price!)}
                                </span>
                            )}
                        </div>

                        {/* Description */}
                        <div className="text-sm text-[#888] font-light leading-relaxed" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem' }}>
                            <ReactMarkdown components={{
                                p: ({ children }) => <p className="mb-3">{children}</p>,
                                ul: ({ children }) => <ul className="ml-4 space-y-1 list-none">{children}</ul>,
                                li: ({ children }) => <li className="before:content-['—'] before:mr-2 before:text-[#c9a96e]/50">{children}</li>,
                            }}>
                                {product.description || ''}
                            </ReactMarkdown>
                        </div>

                        {/* Stock status */}
                        <div className="flex items-center gap-2">
                            <div className={cn('w-1.5 h-1.5 rounded-full', isInStock ? 'bg-[#4a9a5c]' : 'bg-[#c9a96e]')} />
                            <span className="text-[10px] tracking-[0.25em] uppercase text-[#666]">
                                {isInStock ? `${selectedVariant?.inventory_quantity} in stock` : 'Sold out'}
                            </span>
                        </div>

                        <div className="h-px bg-[#1a1a1a]" />

                        {/* Variant options */}
                        {Object.keys(availableOptions).length > 0 && (
                            <div className="space-y-5">
                                {Object.entries(availableOptions).map(([name, values]) => (
                                    <div key={name}>
                                        <p className="text-[9px] tracking-[0.35em] uppercase text-[#555] mb-3">{name}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {Array.from(values).map(val => (
                                                <button
                                                    key={val}
                                                    onClick={() => onOptionChange(name, val)}
                                                    className={cn(
                                                        'px-4 py-1.5 text-xs tracking-widest uppercase border transition-all duration-200',
                                                        selectedOptions[name] === val
                                                            ? 'border-[#c9a96e]/70 text-[#c9a96e] bg-[#c9a96e]/5'
                                                            : 'border-[#222] text-[#666] hover:border-[#333] hover:text-[#888]'
                                                    )}
                                                >
                                                    {val}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Quantity */}
                        {isInStock && (
                            <div className="flex items-center gap-6">
                                <p className="text-[9px] tracking-[0.35em] uppercase text-[#555]">Qty</p>
                                <div className="flex items-center border border-[#1e1e1e]">
                                    <button
                                        onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                                        disabled={quantity <= 1}
                                        className="w-9 h-9 flex items-center justify-center text-[#666] hover:text-[#e8e2d9] disabled:opacity-30 transition-colors"
                                    >
                                        <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-10 text-center text-sm tabular-nums text-[#e8e2d9]">{quantity}</span>
                                    <button
                                        onClick={() => onQuantityChange(Math.min(maxQty, quantity + 1))}
                                        disabled={quantity >= maxQty}
                                        className="w-9 h-9 flex items-center justify-center text-[#666] hover:text-[#e8e2d9] disabled:opacity-30 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* CTA */}
                        <button
                            onClick={onAddToCart}
                            disabled={!isInStock || isAddingToCart}
                            className="w-full py-4 text-[10px] tracking-[0.4em] uppercase font-medium transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed bg-[#c9a96e] text-black hover:bg-[#e0c084]"
                        >
                            {isAddingToCart ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <ShoppingCart className="w-3.5 h-3.5" />
                            )}
                            {isInStock ? 'Add to cart' : 'Sold out'}
                        </button>

                        {/* Tags */}
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {tags.map(tag => (
                                    <span key={tag} className="text-[9px] tracking-[0.2em] uppercase text-[#444] border border-[#1e1e1e] px-2 py-1">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}