'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, BookOpen, Clock, Calendar, ArrowRight, Search, X, AlertCircle, RefreshCw } from 'lucide-react'
import type { BlogListPageProps, BlogPost } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post, storeSlug }: { post: BlogPost; storeSlug: string }) {
    const date = formatDate(post.published_at)

    return (
        <Link
            href={`/store/${storeSlug}/blog/${post.slug}`}
            className="group block bg-white rounded-xl border border-[#e2e8f0] shadow-sm hover:shadow-md hover:border-[#2563eb]/30 transition-all duration-200 overflow-hidden h-full flex flex-col"
        >
            {/* Cover image */}
            <div className="relative aspect-[16/9] overflow-hidden bg-[#f1f5f9]">
                {post.cover_image ? (
                    <img
                        src={post.cover_image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-10 h-10 text-[#cbd5e1]" />
                    </div>
                )}
                {/* Blue top-accent on hover */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#2563eb] opacity-0 group-hover:opacity-100 transition-opacity" />
                {post.tags[0] && (
                    <span className="absolute top-3 left-3 inline-flex items-center px-2.5 py-0.5 text-xs font-semibold bg-white/95 text-[#1d4ed8] rounded-full border border-[#bfdbfe] backdrop-blur-sm">
                        {post.tags[0]}
                    </span>
                )}
            </div>

            {/* Body */}
            <div className="flex flex-col flex-1 p-5 gap-3">
                {/* Meta */}
                <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
                    {date && (
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {date}
                        </span>
                    )}
                    {post.reading_time_minutes && (
                        <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {post.reading_time_minutes} min read
                            </span>
                        </>
                    )}
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-[#0f172a] leading-snug line-clamp-2 group-hover:text-[#2563eb] transition-colors">
                    {post.title}
                </h3>

                {/* Excerpt */}
                {post.excerpt && (
                    <p className="text-sm text-[#64748b] leading-relaxed line-clamp-3 flex-1">
                        {post.excerpt}
                    </p>
                )}

                {/* Footer */}
                <div className="mt-auto pt-4 border-t border-[#f1f5f9] flex items-center justify-between">
                    {post.author ? (
                        <div className="flex items-center gap-2">
                            {post.author.avatar_url ? (
                                <img
                                    src={post.author.avatar_url}
                                    alt={post.author.name}
                                    className="w-6 h-6 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-[#eff6ff] flex items-center justify-center text-[10px] font-bold text-[#2563eb]">
                                    {post.author.name[0]}
                                </div>
                            )}
                            <span className="text-xs text-[#64748b]">{post.author.name}</span>
                        </div>
                    ) : <span />}

                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563eb] group-hover:gap-2 transition-all">
                        Read more <ArrowRight className="w-3 h-3" />
                    </span>
                </div>
            </div>
        </Link>
    )
}

// ─── Featured Post ────────────────────────────────────────────────────────────

function FeaturedPost({ post, storeSlug }: { post: BlogPost; storeSlug: string }) {
    const date = formatDate(post.published_at)

    return (
        <Link
            href={`/store/${storeSlug}/blog/${post.slug}`}
            className="group block bg-white rounded-xl border border-[#e2e8f0] shadow-sm hover:shadow-lg hover:border-[#2563eb]/30 transition-all duration-200 overflow-hidden mb-10"
        >
            <div className="grid md:grid-cols-2">
                {/* Image */}
                <div className="relative aspect-[4/3] md:aspect-auto overflow-hidden bg-[#f1f5f9] min-h-[240px]">
                    {post.cover_image ? (
                        <img
                            src={post.cover_image}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-16 h-16 text-[#cbd5e1]" />
                        </div>
                    )}
                    <span className="absolute top-4 left-4 inline-flex items-center px-3 py-1 text-xs font-semibold bg-[#2563eb] text-white rounded-full shadow">
                        Featured
                    </span>
                </div>

                {/* Content */}
                <div className="p-8 md:p-10 flex flex-col justify-center gap-4">
                    {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {post.tags.map((t) => (
                                <span key={t} className="text-xs font-semibold text-[#2563eb] bg-[#eff6ff] px-2.5 py-0.5 rounded-full">
                                    {t}
                                </span>
                            ))}
                        </div>
                    )}
                    <h2 className="text-2xl md:text-3xl font-bold text-[#0f172a] leading-tight group-hover:text-[#2563eb] transition-colors line-clamp-3">
                        {post.title}
                    </h2>
                    {post.excerpt && (
                        <p className="text-sm text-[#64748b] leading-relaxed line-clamp-3">{post.excerpt}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
                        {post.author && <span>{post.author.name}</span>}
                        {post.author && date && <span>·</span>}
                        {date && (
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {date}
                            </span>
                        )}
                        {post.reading_time_minutes && (
                            <>
                                <span>·</span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {post.reading_time_minutes} min
                                </span>
                            </>
                        )}
                    </div>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb] group-hover:gap-3 transition-all mt-1">
                        Read the full article <ArrowRight className="w-4 h-4" />
                    </span>
                </div>
            </div>
        </Link>
    )
}

// ─── Services Blog List Page ───────────────────────────────────────────────────

export default function ServicesBlogListPage({
    storeSlug,
    posts,
    loading,
    error,
    onRetry,
}: BlogListPageProps) {
    const [query, setQuery] = useState('')
    const [debounced, setDebounced] = useState('')
    const [activeTag, setActiveTag] = useState<string | null>(null)

    const handleSearch = (value: string) => {
        setQuery(value)
        clearTimeout((handleSearch as any)._t)
            ; (handleSearch as any)._t = setTimeout(() => setDebounced(value), 280)
    }

    const allTags = Array.from(new Set(posts.flatMap((p) => p.tags))).slice(0, 10)
    const featured = posts.find((p) => p.metadata?.featured)

    const filtered = posts.filter((p) => {
        const q = debounced.toLowerCase()
        const matchSearch =
            !q ||
            p.title.toLowerCase().includes(q) ||
            p.excerpt?.toLowerCase().includes(q) ||
            p.author?.name.toLowerCase().includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q))
        const matchTag = !activeTag || p.tags.includes(activeTag)
        return matchSearch && matchTag
    })

    const gridPosts =
        featured && !debounced && !activeTag
            ? filtered.filter((p) => p.id !== featured.id)
            : filtered

    // ── Loading ──
    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-[#2563eb] mx-auto mb-4" />
                    <p className="text-sm text-[#64748b]">Loading articles…</p>
                </div>
            </div>
        )
    }

    // ── Error ──
    if (error) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
                <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm max-w-md w-full p-8 text-center space-y-4">
                    <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
                    <h3 className="text-lg font-semibold text-[#0f172a]">Failed to load articles</h3>
                    <p className="text-sm text-[#64748b]">{error}</p>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Try Again
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div
            className="min-h-screen bg-[#f8fafc] text-[#0f172a]"
            style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
        >
            {/* ── Page header ── */}
            <div className="bg-white border-b border-[#e2e8f0]">
                <div className="max-w-6xl mx-auto px-6 md:px-10 py-14">
                    <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#2563eb] mb-3">
                        Knowledge base
                    </span>
                    <h1 className="text-4xl md:text-5xl font-bold text-[#0f172a] tracking-tight mb-3">
                        Resources &amp; Insights
                    </h1>
                    <p className="text-base text-[#64748b] max-w-xl leading-relaxed mb-8">
                        Expert articles, guides, and industry insights to help you make informed decisions.
                    </p>

                    {/* Search */}
                    <div className="max-w-lg relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Search articles…"
                            className="w-full pl-11 pr-10 py-3 text-sm bg-[#f8fafc] border border-[#e2e8f0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] text-[#0f172a] placeholder-[#94a3b8]"
                        />
                        {query && (
                            <button
                                onClick={() => { setQuery(''); setDebounced('') }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#94a3b8] hover:text-[#0f172a] transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 md:px-10 py-12">

                {/* ── Tag filters ── */}
                {allTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-10">
                        <button
                            onClick={() => setActiveTag(null)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-full border transition-colors ${!activeTag ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#2563eb]/50'}`}
                        >
                            All
                        </button>
                        {allTags.map((tag) => (
                            <button
                                key={tag}
                                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                                className={`px-4 py-1.5 text-sm font-medium rounded-full border transition-colors ${activeTag === tag ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'bg-white text-[#64748b] border-[#e2e8f0] hover:border-[#2563eb]/50'}`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Featured post ── */}
                {featured && !debounced && !activeTag && (
                    <FeaturedPost post={featured} storeSlug={storeSlug} />
                )}

                {/* ── Search count ── */}
                {debounced && (
                    <p className="text-sm text-[#64748b] mb-8">
                        {filtered.length} article{filtered.length !== 1 ? 's' : ''} for &ldquo;{debounced}&rdquo;
                    </p>
                )}

                {/* ── Grid ── */}
                {gridPosts.length === 0 ? (
                    <div className="text-center py-24">
                        <BookOpen className="w-12 h-12 text-[#cbd5e1] mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-[#0f172a] mb-2">No articles found</h3>
                        <p className="text-sm text-[#64748b] mb-6">
                            {debounced
                                ? `Nothing matched "${debounced}". Try a different keyword.`
                                : 'Check back soon — great content is on the way.'}
                        </p>
                        {(debounced || activeTag) && (
                            <button
                                onClick={() => { setQuery(''); setDebounced(''); setActiveTag(null) }}
                                className="inline-flex items-center gap-2 text-[#2563eb] text-sm font-semibold border border-[#2563eb] px-5 py-2.5 rounded-lg hover:bg-[#eff6ff] transition-colors"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {gridPosts.map((post) => (
                                <PostCard key={post.id} post={post} storeSlug={storeSlug} />
                            ))}
                        </div>
                        <p className="mt-10 text-center text-xs text-[#94a3b8]">
                            Showing <span className="text-[#0f172a] font-medium">{gridPosts.length}</span> of{' '}
                            <span className="text-[#0f172a] font-medium">{posts.length}</span> articles
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}
