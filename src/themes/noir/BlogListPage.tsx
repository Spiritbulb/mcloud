'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, X, BookOpen, Clock, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import type { BlogListPageProps, BlogPost } from '../types'

function Grain() {
    return (
        <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-[100] opacity-[0.032] mix-blend-overlay"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")` }}
        />
    )
}

function formatDate(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Featured ─────────────────────────────────────────────────────────────────

function NoirFeaturedPost({ post, storeSlug }: { post: BlogPost; storeSlug: string }) {
    const date = formatDate(post.published_at)
    return (
        <Link href={`/store/${storeSlug}/blog/${post.slug}`} className="group block mb-20">
            <div className="grid lg:grid-cols-2 gap-0 border border-[#1a1a1a] group-hover:border-[#c9a96e]/30 transition-colors duration-500">
                <div className="relative aspect-[4/3] lg:aspect-auto bg-[#0e0e0e] overflow-hidden">
                    {post.cover_image
                        ? <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover opacity-85 group-hover:opacity-100 transition-all duration-700 group-hover:scale-[1.02]" />
                        : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-16 h-16 text-[#1a1a1a]" /></div>
                    }
                </div>
                <div className="p-10 md:p-14 flex flex-col justify-between bg-[#0a0a0a]">
                    <div className="space-y-5">
                        <p className="text-[9px] tracking-[0.4em] uppercase text-[#c9a96e]">Featured</p>
                        <h2 className="text-4xl md:text-5xl font-normal uppercase leading-none text-white" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.02em' }}>
                            {post.title}
                        </h2>
                        {post.excerpt && (
                            <p className="text-base text-[#666] font-light leading-relaxed" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                                {post.excerpt}
                            </p>
                        )}
                    </div>
                    <div className="space-y-4 mt-8">
                        <div className="flex flex-wrap items-center gap-3 text-[9px] tracking-[0.25em] uppercase text-[#555]">
                            {post.author && <span>{post.author.name}</span>}
                            {post.author && date && <span>·</span>}
                            {date && <span>{date}</span>}
                            {post.reading_time_minutes && <><span>·</span><span>{post.reading_time_minutes} min read</span></>}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] tracking-[0.3em] uppercase text-[#c9a96e] group-hover:gap-5 transition-all">
                            Read the piece <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    )
}

// ─── Post card ────────────────────────────────────────────────────────────────

function NoirPostCard({ post, storeSlug, index }: { post: BlogPost; storeSlug: string; index: number }) {
    const date = formatDate(post.published_at)
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.5 }}
        >
            <Link href={`/store/${storeSlug}/blog/${post.slug}`} className="group block">
                <div className="relative overflow-hidden aspect-[16/10] bg-[#0e0e0e] mb-4">
                    {post.cover_image
                        ? <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" />
                        : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-8 h-8 text-[#2a2a2a]" /></div>
                    }
                    {post.tags[0] && (
                        <span className="absolute top-3 right-3 text-[9px] tracking-[0.25em] uppercase text-[#c9a96e] border border-[#c9a96e]/40 px-2 py-1 bg-black/80">
                            {post.tags[0]}
                        </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-[#c9a96e] text-black text-[9px] tracking-[0.3em] uppercase py-2.5 flex items-center justify-center gap-2">
                        Read article <ArrowRight className="w-3 h-3" />
                    </div>
                </div>
                <div className="space-y-2" style={{ fontFamily: "'Jost', sans-serif" }}>
                    <div className="flex flex-wrap items-center gap-2 text-[9px] tracking-[0.2em] uppercase text-[#555]">
                        {post.author && <span>{post.author.name}</span>}
                        {post.author && date && <span>·</span>}
                        {date && <span>{date}</span>}
                        {post.reading_time_minutes && (
                            <><span>·</span><span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{post.reading_time_minutes} min</span></>
                        )}
                    </div>
                    <h3 className="text-lg font-normal leading-snug text-[#e8e2d9] group-hover:text-white transition-colors" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        {post.title}
                    </h3>
                    {post.excerpt && (
                        <p className="text-sm text-[#555] font-light leading-relaxed line-clamp-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                            {post.excerpt}
                        </p>
                    )}
                </div>
            </Link>
        </motion.div>
    )
}

// ─── Noir Blog List Page ──────────────────────────────────────────────────────

export default function NoirBlogListPage({ storeSlug, posts, loading, error, onRetry }: BlogListPageProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [activeTag, setActiveTag] = useState<string | null>(null)

    const handleSearch = (value: string) => {
        setSearchQuery(value)
        clearTimeout((handleSearch as any)._t)
            ; (handleSearch as any)._t = setTimeout(() => setDebouncedSearch(value), 300)
    }

    const allTags = Array.from(new Set(posts.flatMap(p => p.tags))).slice(0, 8)
    const featured = posts.find(p => p.metadata?.featured)

    const filtered = posts.filter(p => {
        const q = debouncedSearch.toLowerCase()
        const matchSearch = !q || p.title.toLowerCase().includes(q) || p.excerpt?.toLowerCase().includes(q) || p.author?.name.toLowerCase().includes(q)
        return matchSearch && (!activeTag || p.tags.includes(activeTag))
    })

    const gridPosts = (featured && !debouncedSearch && !activeTag)
        ? filtered.filter(p => p.id !== featured.id)
        : filtered

    if (loading) return (
        <div className="min-h-screen bg-[#080808] flex items-center justify-center">
            <div className="text-center space-y-4">
                <div className="w-px h-16 bg-gradient-to-b from-transparent via-[#c9a96e] to-transparent mx-auto animate-pulse" />
                <p className="text-[9px] tracking-[0.4em] uppercase text-[#555]" style={{ fontFamily: "'Jost', sans-serif" }}>Loading</p>
            </div>
        </div>
    )

    if (error) return (
        <div className="min-h-screen bg-[#080808] flex items-center justify-center px-8">
            <div className="text-center space-y-4 max-w-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[#c9a96e]">Error</p>
                <p className="text-sm text-[#666] font-light">{error}</p>
                {onRetry && (
                    <button onClick={onRetry} className="text-[10px] tracking-[0.3em] uppercase text-[#e8e2d9] border-b border-[#c9a96e]/50 pb-0.5 hover:border-[#c9a96e] transition-colors">
                        Try again
                    </button>
                )}
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#080808] text-[#e8e2d9]" style={{ fontFamily: "'Jost', sans-serif" }}>
            <Grain />
            <div className="px-8 md:px-16 lg:px-24 pt-28 pb-20">

                {/* Header */}
                <div className="mb-16 flex items-end justify-between gap-6 flex-wrap">
                    <div>
                        <p className="text-[9px] tracking-[0.4em] uppercase text-[#c9a96e] mb-3">The Archive</p>
                        <h1 className="text-6xl md:text-8xl font-normal uppercase leading-none text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                            Journal
                        </h1>
                    </div>
                    <div className="flex items-center gap-3 border-b border-[#222] pb-1">
                        <Search className="w-3.5 h-3.5 text-[#555]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => handleSearch(e.target.value)}
                            placeholder="Search the archive…"
                            className="bg-transparent text-sm text-[#e8e2d9] placeholder:text-[#444] outline-none w-48 tracking-wide"
                        />
                        {searchQuery && (
                            <button onClick={() => { setSearchQuery(''); setDebouncedSearch('') }}>
                                <X className="w-3.5 h-3.5 text-[#555] hover:text-[#c9a96e] transition-colors" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Tag filters */}
                {allTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-16">
                        <button
                            onClick={() => setActiveTag(null)}
                            className={`text-[9px] tracking-[0.3em] uppercase px-3 py-1.5 border transition-colors ${!activeTag ? 'border-[#c9a96e]/60 text-[#c9a96e]' : 'border-[#222] text-[#555] hover:border-[#333] hover:text-[#888]'}`}
                        >
                            All
                        </button>
                        {allTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                                className={`text-[9px] tracking-[0.3em] uppercase px-3 py-1.5 border transition-colors ${activeTag === tag ? 'border-[#c9a96e]/60 text-[#c9a96e]' : 'border-[#222] text-[#555] hover:border-[#333] hover:text-[#888]'}`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}

                {featured && !debouncedSearch && !activeTag && <NoirFeaturedPost post={featured} storeSlug={storeSlug} />}

                {debouncedSearch && (
                    <p className="text-[10px] tracking-[0.3em] uppercase text-[#555] mb-10">
                        {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{debouncedSearch}&rdquo;
                    </p>
                )}

                {gridPosts.length === 0 ? (
                    <div className="py-32 text-center">
                        <p className="text-[10px] tracking-[0.3em] uppercase text-[#333]">No articles found</p>
                        {(debouncedSearch || activeTag) && (
                            <button onClick={() => { setSearchQuery(''); setDebouncedSearch(''); setActiveTag(null) }} className="mt-4 text-[10px] tracking-[0.2em] uppercase text-[#c9a96e] hover:text-[#e8e2d9] transition-colors">
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-14">
                            {gridPosts.map((post, i) => (
                                <NoirPostCard key={post.id} post={post} storeSlug={storeSlug} index={i} />
                            ))}
                        </div>
                        <div className="mt-20 flex items-center gap-6">
                            <div className="h-px flex-1 bg-[#1a1a1a]" />
                            <p className="text-[9px] tracking-[0.3em] uppercase text-[#444]">{gridPosts.length} of {posts.length} articles</p>
                            <div className="h-px flex-1 bg-[#1a1a1a]" />
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}