'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, X, Loader2, BookOpen, Clock, ArrowRight, Tag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { BlogListPageProps, BlogPost } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
    })
}

// ─── Featured post (hero card) ────────────────────────────────────────────────

function FeaturedPost({ post, storeSlug }: { post: BlogPost; storeSlug: string }) {
    const date = formatDate(post.published_at)

    return (
        <Link href={`/store/${storeSlug}/blog/${post.slug}`} className="group block mb-14">
            <div className="sf-card overflow-hidden grid md:grid-cols-2 hover:shadow-2xl transition-all duration-500">
                {/* Image */}
                <div className="relative aspect-[4/3] md:aspect-auto overflow-hidden sf-bg-muted">
                    {post.cover_image ? (
                        <img
                            src={post.cover_image}
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-16 h-16" style={{ color: 'var(--sf-foreground)', opacity: 0.1 }} />
                        </div>
                    )}
                    <span className="sf-badge-sale absolute top-4 left-4 inline-flex items-center px-3 py-1 text-xs font-medium shadow">
                        Featured
                    </span>
                </div>

                {/* Body */}
                <div className="p-8 md:p-12 flex flex-col justify-center gap-5">
                    {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {post.tags.map(t => (
                                <span key={t} className="inline-flex items-center gap-1 text-xs sf-text-accent">
                                    <Tag className="w-3 h-3" />{t}
                                </span>
                            ))}
                        </div>
                    )}

                    <h2
                        className="sf-heading text-3xl md:text-4xl font-light leading-tight group-hover:underline"
                        style={{ color: 'var(--sf-foreground)' }}
                    >
                        {post.title}
                    </h2>

                    {post.excerpt && (
                        <p className="text-base font-light leading-relaxed line-clamp-3" style={{ color: 'var(--sf-foreground-subtle)' }}>
                            {post.excerpt}
                        </p>
                    )}

                    <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--sf-foreground)', opacity: 0.42 }}>
                        {post.author && <span>{post.author.name}</span>}
                        {post.author && date && <span>·</span>}
                        {date && <span>{date}</span>}
                        {post.reading_time_minutes && (
                            <><span>·</span><span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.reading_time_minutes} min</span></>
                        )}
                    </div>

                    <span className="inline-flex items-center gap-2 text-sm sf-text-accent font-medium group-hover:gap-3 transition-all">
                        Read the full article <ArrowRight className="w-4 h-4" />
                    </span>
                </div>
            </div>
        </Link>
    )
}

// ─── Post card ────────────────────────────────────────────────────────────────

function PostCard({ post, storeSlug }: { post: BlogPost; storeSlug: string }) {
    const date = formatDate(post.published_at)

    return (
        <Link href={`/store/${storeSlug}/blog/${post.slug}`} className="group block h-full">
            <Card className="sf-card h-full flex flex-col overflow-hidden hover:shadow-xl transition-all duration-300 py-0">
                {/* Cover */}
                <div className="relative aspect-[16/9] overflow-hidden sf-bg-muted">
                    {post.cover_image ? (
                        <img
                            src={post.cover_image}
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-10 h-10" style={{ color: 'var(--sf-foreground)', opacity: 0.12 }} />
                        </div>
                    )}
                    {post.tags[0] && (
                        <span className="sf-badge-outline absolute top-3 left-3 inline-flex items-center border px-2.5 py-0.5 text-xs font-medium bg-white/90 backdrop-blur-sm">
                            {post.tags[0]}
                        </span>
                    )}
                </div>

                <CardContent className="pt-5 pb-6 flex-1 flex flex-col gap-3">
                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--sf-foreground)', opacity: 0.42 }}>
                        {date && <span>{date}</span>}
                        {post.reading_time_minutes && (
                            <><span>·</span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />{post.reading_time_minutes} min
                                </span></>
                        )}
                    </div>

                    <CardTitle
                        className="sf-heading text-xl font-normal leading-snug line-clamp-2 group-hover:underline"
                        style={{ color: 'var(--sf-foreground)' }}
                    >
                        {post.title}
                    </CardTitle>

                    {post.excerpt && (
                        <CardDescription>
                            <span className="text-sm leading-relaxed line-clamp-3" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                {post.excerpt}
                            </span>
                        </CardDescription>
                    )}

                    {/* Author + CTA */}
                    <div
                        className="mt-auto pt-4 flex items-center justify-between"
                        style={{ borderTop: '1px solid var(--sf-border)' }}
                    >
                        {post.author ? (
                            <div className="flex items-center gap-2">
                                {post.author.avatar_url ? (
                                    <img src={post.author.avatar_url} alt={post.author.name} className="w-6 h-6 rounded-full object-cover" />
                                ) : (
                                    <div
                                        className="w-6 h-6 rounded-full sf-bg-muted flex items-center justify-center text-[10px] font-medium"
                                        style={{ color: 'var(--sf-foreground)' }}
                                    >
                                        {post.author.name[0]}
                                    </div>
                                )}
                                <span className="text-xs" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                    {post.author.name}
                                </span>
                            </div>
                        ) : <span />}

                        <span className="inline-flex items-center gap-1 text-xs sf-text-accent group-hover:gap-2 transition-all">
                            Read more <ArrowRight className="w-3 h-3" />
                        </span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}

// ─── Classic Blog List Page ───────────────────────────────────────────────────

export default function ClassicBlogListPage({
    storeSlug, posts, loading, error, onRetry,
}: BlogListPageProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [activeTag, setActiveTag] = useState<string | null>(null)

    const handleSearch = (value: string) => {
        setSearchQuery(value)
        clearTimeout((handleSearch as any)._t)
            ; (handleSearch as any)._t = setTimeout(() => setDebouncedSearch(value), 300)
    }

    const allTags = Array.from(new Set(posts.flatMap(p => p.tags))).slice(0, 12)
    const featured = posts.find(p => p.metadata?.featured)

    const filtered = posts.filter(p => {
        const q = debouncedSearch.toLowerCase()
        const matchSearch = !q ||
            p.title.toLowerCase().includes(q) ||
            p.excerpt?.toLowerCase().includes(q) ||
            p.author?.name.toLowerCase().includes(q) ||
            p.tags.some(t => t.toLowerCase().includes(q))
        const matchTag = !activeTag || p.tags.includes(activeTag)
        return matchSearch && matchTag
    })

    const gridPosts = (featured && !debouncedSearch && !activeTag)
        ? filtered.filter(p => p.id !== featured.id)
        : filtered

    // ── Loading ──
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: 'var(--sf-foreground)' }} />
                <p style={{ color: 'var(--sf-foreground-subtle)' }}>Loading articles…</p>
            </div>
        </div>
    )

    // ── Error ──
    if (error) return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="sf-card max-w-md w-full p-6 space-y-3 border" style={{ borderColor: 'var(--sf-border-strong)' }}>
                <p className="sf-heading font-semibold" style={{ color: 'var(--sf-foreground)' }}>Failed to load articles</p>
                <p className="text-sm" style={{ color: 'var(--sf-foreground-subtle)' }}>{error}</p>
                {onRetry && (
                    <button onClick={onRetry} className="sf-pill sf-pill-inactive border w-full py-2 text-sm">
                        Try Again
                    </button>
                )}
            </div>
        </div>
    )

    return (
        <div className="min-h-screen">
            <div className="max-w-7xl mx-auto px-6 md:px-8 py-12">

                {/* ── Header ── */}
                <div className="text-center mb-12">
                    <h1 className="sf-heading text-4xl md:text-5xl font-light tracking-tight mb-4">
                        Our <span className="sf-text-accent">Journal</span>
                    </h1>
                    <p className="text-lg max-w-xl mx-auto mb-8 font-light" style={{ color: 'var(--sf-foreground-subtle)' }}>
                        Stories, guides, and inspiration
                    </p>

                    <div className="max-w-xl mx-auto relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--sf-foreground)', opacity: 0.38 }} />
                        <Input
                            placeholder="Search articles…"
                            value={searchQuery}
                            onChange={e => handleSearch(e.target.value)}
                            className="pl-11 pr-10 h-11"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => { setSearchQuery(''); setDebouncedSearch('') }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                                style={{ color: 'var(--sf-foreground)', opacity: 0.5 }}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Tag filters ── */}
                {allTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center mb-12">
                        <button
                            onClick={() => setActiveTag(null)}
                            className={`sf-pill px-4 py-1.5 text-sm border transition-colors ${!activeTag ? 'sf-pill-active' : 'sf-pill-inactive'}`}
                        >
                            All
                        </button>
                        {allTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                                className={`sf-pill px-4 py-1.5 text-sm border transition-colors ${activeTag === tag ? 'sf-pill-active' : 'sf-pill-inactive'}`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Featured ── */}
                {featured && !debouncedSearch && !activeTag && (
                    <FeaturedPost post={featured} storeSlug={storeSlug} />
                )}

                {/* ── Search count ── */}
                {debouncedSearch && (
                    <p className="text-sm mb-8" style={{ color: 'var(--sf-foreground-subtle)' }}>
                        {filtered.length} {filtered.length === 1 ? 'article' : 'articles'} for &ldquo;{debouncedSearch}&rdquo;
                    </p>
                )}

                {/* ── Grid ── */}
                {gridPosts.length === 0 ? (
                    <div className="text-center py-20">
                        <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--sf-foreground)', opacity: 0.15 }} />
                        <h3 className="sf-heading text-2xl font-light mb-2">No articles found</h3>
                        <p className="text-sm mb-6" style={{ color: 'var(--sf-foreground-subtle)' }}>
                            {debouncedSearch ? `Nothing matched "${debouncedSearch}".` : 'Check back soon.'}
                        </p>
                        {(debouncedSearch || activeTag) && (
                            <button
                                onClick={() => { setSearchQuery(''); setDebouncedSearch(''); setActiveTag(null) }}
                                className="sf-btn-primary px-6 py-2 text-sm"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {gridPosts.map(post => (
                                <PostCard key={post.id} post={post} storeSlug={storeSlug} />
                            ))}
                        </div>
                        <div className="mt-12 text-center">
                            <p className="text-sm font-light" style={{ color: 'var(--sf-foreground-subtle)' }}>
                                Showing <span style={{ color: 'var(--sf-foreground)' }}>{gridPosts.length}</span> of{' '}
                                <span style={{ color: 'var(--sf-foreground)' }}>{posts.length}</span> articles
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}