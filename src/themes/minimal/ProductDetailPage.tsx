'use client'

import Image from 'next/image'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, ShoppingBag, Minus, Plus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { ProductDetailPageProps } from '../types'

export default function MinimalProductDetailPage({
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
        <div className="min-h-screen bg-[#f7f4f0] text-[#1a1714]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <div className="px-6 md:px-12 lg:px-20 pt-20 pb-20">
                {/* Back */}
                <Link href="/products" className="inline-flex items-center gap-1.5 text-xs tracking-wider uppercase text-[#9a9189] hover:text-[#5c5650] transition-colors mb-10 group">
                    <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                    All products
                </Link>

                <div className="grid lg:grid-cols-2 gap-10 xl:gap-20">
                    {/* ── Images ── */}
                    <div className="space-y-2">
                        {/* Main */}
                        <div className="relative aspect-[4/5] bg-[#ede9e3] overflow-hidden">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentImageIndex}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.35 }}
                                    className="absolute inset-0"
                                >
                                    {product.images[currentImageIndex] && (
                                        <img src={product.images[currentImageIndex]} alt={product.name} className="object-cover w-full h-full" />
                                    )}
                                </motion.div>
                            </AnimatePresence>

                            {product.images.length > 1 && (
                                <>
                                    <button
                                        onClick={() => onImageChange(currentImageIndex === 0 ? product.images.length - 1 : currentImageIndex - 1)}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#f7f4f0]/80 flex items-center justify-center text-[#5c5650] hover:bg-[#f7f4f0] transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onImageChange(currentImageIndex === product.images.length - 1 ? 0 : currentImageIndex + 1)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#f7f4f0]/80 flex items-center justify-center text-[#5c5650] hover:bg-[#f7f4f0] transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {product.images.length > 1 && (
                            <div className="flex gap-2 overflow-x-auto">
                                {product.images.map((img, i) => (
                                    <button key={i} onClick={() => onImageChange(i)}
                                        className={cn('flex-shrink-0 w-16 h-20 overflow-hidden transition-opacity', i === currentImageIndex ? 'opacity-100 outline outline-1 outline-[#5c5650]' : 'opacity-50 hover:opacity-80')}
                                    >
                                        <img src={img} alt="" width={64} height={80} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Info ── */}
                    <div className="space-y-7 lg:pt-2">
                        <div>
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-normal leading-tight mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>
                                {product.name}
                            </h1>
                            <div className="flex items-baseline gap-3">
                                <span className="text-xl text-[#1a1714]">
                                    {selectedVariant ? formatPrice(selectedVariant.price) : formatPrice(product.price)}
                                </span>
                                {hasDiscount && (
                                    <span className="text-sm text-[#c8c0b6] line-through">{formatPrice(product.compare_at_price!)}</span>
                                )}
                                {hasDiscount && (
                                    <span className="text-xs bg-[#1a1714] text-[#f7f4f0] px-1.5 py-0.5 uppercase tracking-wider">Sale</span>
                                )}
                            </div>
                        </div>

                        <div className="h-px bg-[#e5e0d9]" />

                        {/* Description */}
                        <div className="text-sm text-[#5c5650] leading-relaxed font-light space-y-3">
                            <ReactMarkdown components={{
                                p: ({ children }) => <p className="mb-3">{children}</p>,
                                ul: ({ children }) => <ul className="space-y-1.5 ml-4 list-disc list-outside marker:text-[#c8c0b6]">{children}</ul>,
                                li: ({ children }) => <li>{children}</li>,
                            }}>
                                {product.description || ''}
                            </ReactMarkdown>
                        </div>

                        {/* Stock */}
                        <p className="text-xs text-[#9a9189] uppercase tracking-wider">
                            {isInStock ? `${selectedVariant?.inventory_quantity} in stock` : 'Out of stock'}
                        </p>

                        <div className="h-px bg-[#e5e0d9]" />

                        {/* Variants */}
                        {Object.keys(availableOptions).length > 0 && (
                            <div className="space-y-5">
                                {Object.entries(availableOptions).map(([name, values]) => (
                                    <div key={name}>
                                        <p className="text-xs uppercase tracking-wider text-[#9a9189] mb-2.5">{name}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {Array.from(values).map(val => (
                                                <button
                                                    key={val}
                                                    onClick={() => onOptionChange(name, val)}
                                                    className={cn(
                                                        'px-3 py-1.5 text-xs border transition-all duration-150',
                                                        selectedOptions[name] === val
                                                            ? 'border-[#1a1714] bg-[#1a1714] text-[#f7f4f0]'
                                                            : 'border-[#e5e0d9] text-[#5c5650] hover:border-[#9a9189]'
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
                            <div className="flex items-center gap-4">
                                <p className="text-xs uppercase tracking-wider text-[#9a9189]">Quantity</p>
                                <div className="flex items-center border border-[#e5e0d9]">
                                    <button onClick={() => onQuantityChange(Math.max(1, quantity - 1))} disabled={quantity <= 1} className="w-9 h-9 flex items-center justify-center text-[#9a9189] hover:text-[#1a1714] disabled:opacity-30 transition-colors">
                                        <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-10 text-center text-sm">{quantity}</span>
                                    <button onClick={() => onQuantityChange(Math.min(maxQty, quantity + 1))} disabled={quantity >= maxQty} className="w-9 h-9 flex items-center justify-center text-[#9a9189] hover:text-[#1a1714] disabled:opacity-30 transition-colors">
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Add to bag */}
                        <button
                            onClick={onAddToCart}
                            disabled={!isInStock || isAddingToCart}
                            className="w-full py-3.5 bg-[#1a1714] text-[#f7f4f0] text-xs tracking-[0.2em] uppercase hover:bg-[#2e2925] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {isAddingToCart ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                            {isInStock ? 'Add to bag' : 'Sold out'}
                        </button>

                        {/* Tags */}
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-2">
                                {tags.map(tag => (
                                    <span key={tag} className="text-[10px] uppercase tracking-wider text-[#9a9189] border border-[#e5e0d9] px-2 py-0.5">
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