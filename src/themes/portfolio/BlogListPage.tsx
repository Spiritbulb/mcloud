'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, Clock, AlertCircle, RefreshCw, Search, X } from 'lucide-react'
import type { BlogListPageProps, BlogPost } from '../types'

function formatDate(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// ─── Featured post (magazine-style, full-width) ────────────────────────────────
function FeaturedPost({ post, storeSlug }: { post: BlogPost; storeSlug: string }) {
    const date = formatDate(post.published_at)

    return (
        <Link
            href={`/store/${storeSlug}/blog/${post.slug}`}
            className="group block border border-gray-100 hover:border-[#6366f1]/30 transition-all duration-300 hover:shadow-xl mb-12 md:mb-16"
        >
            <div className="grid md:grid-cols-2">
                {/* Image */}
                <div className="relative overflow-hidden aspect-video md:aspect-auto bg-gray-50">
                    {post.cover_image ? (
                        <img
                            src={post.cover_image}
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                    ) : (
                        <div className="w-full h-full min-h-[240px] flex items-center justify-center bg-gray-50">
                            <BookOpen className="w-12 h-12 text-gray-200" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-[#6366f1]/0 group-hover:bg-[#6366f1]/5 transition-colors duration-300" />
                </div>

                {/* Content */}
                <div className="p-8 md:p-10 lg:p-12 flex flex-col justify-between bg-white">
                    <div className="space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-0.5 bg-[#6366f1]" />
                            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#6366f1]">Featured</span>
                        </div>

                        <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-[#111111] leading-tight group-hover:text-[#6366f1] transition-colors">
                            {post.title}
                        </h2>

                        {post.excerpt && (
                            <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">
                                {post.excerpt}
                            </p>
                        )}
                    </div>

                    <div className="mt-8 space-y-4">
                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-300">
                            {post.author && (
                                <div className="flex items-center gap-2">
                                    {post.author.avatar_url ? (
                                        <img src={post.author.avatar_url} alt={post.author.name} className="w-5 h-5 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-[#6366f1]/10 text-[#6366f1] text-[9px] font-black flex items-center justify-center">
                                            {post.author.name[0]}
                                        </div>
                                    )}
                                    <span className="font-bold text-gray-400">{post.author.name}</span>
                                </div>
                            )}
                            {date && <span>{date}</span>}
                            {post.reading_time_minutes && (
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {post.reading_time_minutes} min read
                                </span>
                            )}
                        </div>

                        {/* CTA */}
                        <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#6366f1] group-hover:gap-4 transition-all duration-200">
                            Read article <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    )
}

// ─── Regular post card ─────────────────────────────────────────────────────────
function PostCard({ post, storeSlug }: { post: BlogPost; storeSlug: string }) {
    const date = formatDate(post.published_at)

    return (
        <Link
            href={`/store/${storeSlug}/blog/${post.slug}`}
            className="group block border border-gray-100 bg-white hover:border-[#6366f1]/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
        >
            {/* Image */}
            <div className="relative overflow-hidden aspect-video bg-gray-50">
                {post.cover_image ? (
                    <img
                        src={post.cover_image}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-gray-200" />
                    </div>
                )}

                {/* Tag badge */}
                {post.tags[0] && (
                    <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-widest bg-[#6366f1] text-white px-2.5 py-1">
                        {post.tags[0]}
                    </span>
                )}

                {/* Arrow on hover */}
                <div className="absolute bottom-3 right-3 w-8 h-8 bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">
                    <ArrowRight className="w-4 h-4 text-[#6366f1]" />
                </div>
            </div>

            {/* Content */}
            <div className="p-5 md:p-6 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-300">
                    {post.author && <span className="font-bold text-gray-400">{post.author.name}</span>}
                    {post.author && date && <span>·</span>}
                    {date && <span>{date}</span>}
                    {post.reading_time_minutes && (
                        <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {post.reading_time_minutes} min
                            </span>
                        </>
                    )}
                </div>

                <h3 className="text-base font-black text-[#111111] leading-tight group-hover:text-[#6366f1] transition-colors line-clamp-2">
                    {post.title}
                </h3>

                {post.excerpt && (
                    <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">{post.excerpt}</p>
                )}
            </div>
        </Link>
    )
}

// ─── Portfolio Blog List Page ──────────────────────────────────────────────────
export default function PortfolioBlogListPage({ storeSlug, posts, loading, error, onRetry }: BlogListPageProps) {
    const [query, setQuery] = useState('')
    const [debounced, setDebounced] = useState('')
    const [activeTag, setActiveTag] = useState<string | null>(null)

    const handleQuery = (v: string) => {
        setQuery(v)
        clearTimeout((handleQuery as any)._t)
            ; (handleQuery as any)._t = setTimeout(() => setDebounced(v), 280)
    }

    const allTags = Array.from(new Set(posts.flatMap(p => p.tags))).slice(0, 10)
    const featured = posts.find(p => p.metadata?.featured)

    const filtered = posts.filter(p => {
        const q = debounced.toLowerCase()
        const matchSearch = !q || p.title.toLowerCase().includes(q) || p.excerpt?.toLowerCase().includes(q) || p.author?.name.toLowerCase().includes(q)
        return matchSearch && (!activeTag || p.tags.includes(activeTag))
    })

    const gridPosts = (featured && !debounced && !activeTag)
        ? filtered.filter(p => p.id !== featured.id)
        : filtered

    // ── Loading ──
    if (loading) {
        return (
            <div className="min-h-screen bg-white font-sans flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-gray-200 border-t-[#6366f1] rounded-full animate-spin" />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Loading insights…</p>
                </div>
            </div>
        )
    }

    // ── Error ──
    if (error) {
        return (
            <div className="min-h-screen bg-white font-sans flex items-center justify-center px-6">
                <div className="text-center space-y-6 max-w-sm">
                    <AlertCircle className="w-10 h-10 text-[#6366f1] mx-auto" />
                    <div>
                        <h2 className="text-xl font-black text-[#111111] mb-2">Something went wrong</h2>
                        <p className="text-sm text-gray-400">{error}</p>
                    </div>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="inline-flex items-center gap-2 bg-[#6366f1] text-white text-sm font-bold uppercase tracking-widest px-6 py-3 hover:bg-[#4f46e5] transition-colors"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Retry
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white text-[#111111] font-sans">

            {/* ── Header ── */}
            <div className="border-b border-gray-100 py-16 md:py-24 px-6 md:px-12">
                <div className="max-w-7xl mx-auto">
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#6366f1] mb-4">Blog</p>
                    <h1 className="text-5xl md:text-7xl font-black text-[#111111] leading-tight mb-4">
                        Insights
                    </h1>
                    <p className="text-lg text-gray-400 max-w-xl">
                        Thoughts, case studies, and perspectives from our studio.
                    </p>
                </div>
            </div>

            {/* ── Filters bar ── */}
            <div className="border-b border-gray-100 py-4 px-6 md:px-12 bg-white sticky top-0 z-40">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
                    {/* Search */}
                    <div className="flex items-center gap-3 border border-gray-200 px-4 py-2 focus-within:border-[#6366f1] transition-colors">
                        <Search className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        <input
                            type="text"
                            value={query}
                            onChange={e => handleQuery(e.target.value)}
                            placeholder="Search insights…"
                            className="text-sm text-[#111111] placeholder:text-gray-300 outline-none bg-transparent w-40"
                        />
                        {query && (
                            <button onClick={() => { setQuery(''); setDebounced('') }}>
                                <X className="w-3.5 h-3.5 text-gray-300 hover:text-[#111111] transition-colors" />
                            </button>
                        )}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-300">
                        {filtered.length} article{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-16">

                {/* Tags */}
                {allTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-12">
                        <button
                            onClick={() => setActiveTag(null)}
                            className={`text-[11px] font-bold uppercase tracking-widest px-4 py-2 border-2 transition-all duration-150 ${!activeTag
                                ? 'border-[#6366f1] bg-[#6366f1] text-white'
                                : 'border-gray-200 text-gray-400 hover:border-[#6366f1]/40 hover:text-[#6366f1]'
                                }`}
                        >
                            All
                        </button>
                        {allTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                                className={`text-[11px] font-bold uppercase tracking-widest px-4 py-2 border-2 transition-all duration-150 ${activeTag === tag
                                    ? 'border-[#6366f1] bg-[#6366f1] text-white'
                                    : 'border-gray-200 text-gray-400 hover:border-[#6366f1]/40 hover:text-[#6366f1]'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}

                {/* Featured post */}
                {featured && !debounced && !activeTag && (
                    <FeaturedPost post={featured} storeSlug={storeSlug} />
                )}

                {/* Search result count */}
                {debounced && (
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-8">
                        {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{debounced}&rdquo;
                    </p>
                )}

                {/* Grid */}
                {gridPosts.length === 0 ? (
                    <div className="py-32 text-center">
                        <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-5" />
                        <h3 className="text-xl font-black text-[#111111] mb-2">
                            {debounced ? `No results for "${debounced}"` : 'No articles yet'}
                        </h3>
                        {(debounced || activeTag) && (
                            <button
                                onClick={() => { setQuery(''); setDebounced(''); setActiveTag(null) }}
                                className="mt-4 text-xs font-bold uppercase tracking-widest text-[#6366f1] hover:underline"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {gridPosts.map(post => (
                            <PostCard key={post.id} post={post} storeSlug={storeSlug} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
