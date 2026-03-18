'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, X, BookOpen, Clock, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import type { BlogListPageProps, BlogPost } from '../types'

function formatDate(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Featured ─────────────────────────────────────────────────────────────────

function MinimalFeaturedPost({ post, storeSlug }: { post: BlogPost; storeSlug: string }) {
    const date = formatDate(post.published_at)
    return (
        <Link href={`/store/${storeSlug}/blog/${post.slug}`} className="group block mb-14">
            <div className="grid md:grid-cols-2">
                <div className="relative overflow-hidden aspect-[4/3] bg-[#ede9e3]">
                    {post.cover_image
                        ? <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
                        : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-12 h-12 text-[#c8c0b6]" /></div>
                    }
                </div>
                <div className="bg-[#f0ede9] p-8 md:p-10 flex flex-col justify-between" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <div className="space-y-4">
                        <p className="text-[9px] tracking-[0.3em] uppercase text-[#9a9189]">Featured</p>
                        <h2 className="text-3xl md:text-4xl font-normal text-[#1a1714] leading-tight group-hover:text-[#5c5650] transition-colors" style={{ fontFamily: "'DM Serif Display', serif" }}>
                            {post.title}
                        </h2>
                        {post.excerpt && (
                            <p className="text-sm text-[#9a9189] leading-relaxed line-clamp-3">{post.excerpt}</p>
                        )}
                    </div>
                    <div className="mt-8 space-y-3">
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#c8c0b6]">
                            {post.author && <span>{post.author.name}</span>}
                            {post.author && date && <span>·</span>}
                            {date && <span>{date}</span>}
                            {post.reading_time_minutes && <><span>·</span><span>{post.reading_time_minutes} min read</span></>}
                        </div>
                        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#5c5650] group-hover:gap-4 transition-all">
                            Read <ArrowRight className="w-3 h-3" />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    )
}

// ─── Post card ────────────────────────────────────────────────────────────────

function MinimalPostCard({ post, storeSlug, index }: { post: BlogPost; storeSlug: string; index: number }) {
    const date = formatDate(post.published_at)
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.4 }}
        >
            <Link href={`/store/${storeSlug}/blog/${post.slug}`} className="group block">
                <div className="relative overflow-hidden aspect-[3/2] bg-[#ede9e3] mb-4">
                    {post.cover_image
                        ? <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                        : <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-6 h-6 text-[#c8c0b6]" /></div>
                    }
                    {post.tags[0] && (
                        <span className="absolute top-2 left-2 text-[9px] tracking-[0.15em] uppercase bg-[#1a1714] text-[#f7f4f0] px-1.5 py-0.5">
                            {post.tags[0]}
                        </span>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                        <div className="w-full bg-[#1a1714] text-[#f7f4f0] text-[10px] tracking-[0.2em] uppercase py-2.5 flex items-center justify-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            Read article <ArrowRight className="w-3 h-3" />
                        </div>
                    </div>
                </div>
                <div className="space-y-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#c8c0b6]">
                        {post.author && <span>{post.author.name}</span>}
                        {post.author && date && <span>·</span>}
                        {date && <span>{date}</span>}
                        {post.reading_time_minutes && (
                            <><span>·</span><span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{post.reading_time_minutes} min</span></>
                        )}
                    </div>
                    <h3 className="text-sm text-[#1a1714] leading-snug">{post.title}</h3>
                    {post.excerpt && (
                        <p className="text-xs text-[#9a9189] leading-relaxed line-clamp-2">{post.excerpt}</p>
                    )}
                </div>
            </Link>
        </motion.div>
    )
}

// ─── Minimal Blog List Page ───────────────────────────────────────────────────

export default function MinimalBlogListPage({ storeSlug, posts, loading, error, onRetry }: BlogListPageProps) {
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
        <div className="min-h-screen bg-[#f7f4f0] flex items-center justify-center">
            <div className="space-y-3 text-center">
                <div className="flex gap-1 justify-center">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#c8c0b6] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                </div>
                <p className="text-xs text-[#9a9189] tracking-wider uppercase" style={{ fontFamily: "'DM Sans', sans-serif" }}>Loading</p>
            </div>
        </div>
    )

    if (error) return (
        <div className="min-h-screen bg-[#f7f4f0] flex items-center justify-center px-6">
            <div className="text-center space-y-4 max-w-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <p className="text-sm text-[#5c5650]">{error}</p>
                {onRetry && <button onClick={onRetry} className="text-xs uppercase tracking-wider text-[#1a1714] underline underline-offset-4">Try again</button>}
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-[#f7f4f0] text-[#1a1714]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <div className="px-6 md:px-12 lg:px-20 pt-24 pb-20">

                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-4xl md:text-6xl font-normal text-[#1a1714] mb-2 leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
                        Journal
                    </h1>
                    <div className="h-px bg-[#e5e0d9]" />
                </div>

                {/* Filters bar */}
                <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
                    <div className="flex items-center gap-2 border-b border-[#c8c0b6] pb-1 focus-within:border-[#5c5650] transition-colors">
                        <Search className="w-3.5 h-3.5 text-[#c8c0b6]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => handleSearch(e.target.value)}
                            placeholder="Search articles…"
                            className="bg-transparent text-sm placeholder:text-[#c8c0b6] outline-none w-36"
                        />
                        {searchQuery && (
                            <button onClick={() => { setSearchQuery(''); setDebouncedSearch('') }}>
                                <X className="w-3.5 h-3.5 text-[#c8c0b6]" />
                            </button>
                        )}
                    </div>
                    <span className="text-xs text-[#c8c0b6]">{filtered.length} article{filtered.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Tags */}
                {allTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-10">
                        <button
                            onClick={() => setActiveTag(null)}
                            className={`text-[10px] uppercase tracking-widest px-3 py-1 border transition-colors ${!activeTag ? 'border-[#1a1714] text-[#1a1714]' : 'border-[#e5e0d9] text-[#9a9189] hover:border-[#c8c0b6]'}`}
                        >
                            All
                        </button>
                        {allTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                                className={`text-[10px] uppercase tracking-widest px-3 py-1 border transition-colors ${activeTag === tag ? 'border-[#1a1714] text-[#1a1714]' : 'border-[#e5e0d9] text-[#9a9189] hover:border-[#c8c0b6]'}`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}

                {featured && !debouncedSearch && !activeTag && <MinimalFeaturedPost post={featured} storeSlug={storeSlug} />}

                {debouncedSearch && (
                    <p className="text-xs text-[#9a9189] mb-8">
                        {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{debouncedSearch}&rdquo;
                    </p>
                )}

                {gridPosts.length === 0 ? (
                    <div className="py-24 text-center space-y-3">
                        <p className="text-sm text-[#9a9189]">{debouncedSearch ? `No results for "${debouncedSearch}"` : 'No articles yet'}</p>
                        {(debouncedSearch || activeTag) && (
                            <button onClick={() => { setSearchQuery(''); setDebouncedSearch(''); setActiveTag(null) }} className="text-xs uppercase tracking-wider text-[#5c5650] underline underline-offset-4">Clear</button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-10">
                        {gridPosts.map((post, i) => (
                            <MinimalPostCard key={post.id} post={post} storeSlug={storeSlug} index={i} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}