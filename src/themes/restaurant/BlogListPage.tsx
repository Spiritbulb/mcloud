'use client'

import Link from 'next/link'
import { Loader2, AlertCircle, BookOpen, Clock, Calendar } from 'lucide-react'
import type { BlogListPageProps, BlogPost } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    })
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post, storeSlug }: { post: BlogPost; storeSlug: string }) {
    const date = formatDate(post.published_at)

    return (
        <Link
            href={`/store/${storeSlug}/blog/${post.slug}`}
            className="group flex flex-col bg-white border border-[#e8ddd4] hover:border-[#c8622a]/30 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
        >
            {/* Cover image */}
            <div className="relative aspect-[16/9] overflow-hidden bg-[#f0e8e0]">
                {post.cover_image ? (
                    <img
                        src={post.cover_image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">
                        🍳
                    </div>
                )}
                {post.tags[0] && (
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[#c8622a] text-xs font-medium px-3 py-1 rounded-full border border-[#c8622a]/20">
                        {post.tags[0]}
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col p-5 gap-3">
                {/* Meta */}
                <div className="flex items-center gap-3 text-xs text-[#6b4c3b]">
                    {date && (
                        <span className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            {date}
                        </span>
                    )}
                    {post.reading_time_minutes && (
                        <span className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {post.reading_time_minutes} min read
                        </span>
                    )}
                </div>

                {/* Title */}
                <h3 className="font-serif text-xl font-bold text-[#2c1810] group-hover:text-[#c8622a] transition-colors leading-snug line-clamp-2">
                    {post.title}
                </h3>

                {/* Excerpt */}
                {post.excerpt && (
                    <p className="text-sm text-[#6b4c3b] leading-relaxed line-clamp-3 flex-1">
                        {post.excerpt}
                    </p>
                )}

                {/* Footer */}
                <div className="mt-auto pt-4 border-t border-[#f0e8e0] flex items-center justify-between">
                    {post.author ? (
                        <div className="flex items-center gap-2">
                            {post.author.avatar_url ? (
                                <img
                                    src={post.author.avatar_url}
                                    alt={post.author.name}
                                    className="w-6 h-6 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-[#c8622a]/20 flex items-center justify-center text-[10px] font-bold text-[#c8622a]">
                                    {post.author.name[0]}
                                </div>
                            )}
                            <span className="text-xs text-[#6b4c3b]">{post.author.name}</span>
                        </div>
                    ) : (
                        <span />
                    )}
                    <span className="text-xs font-medium text-[#c8622a] group-hover:gap-2 transition-all flex items-center gap-1">
                        Read more →
                    </span>
                </div>
            </div>
        </Link>
    )
}

// ─── Restaurant Blog List Page ─────────────────────────────────────────────────

export default function RestaurantBlogListPage({
    storeSlug,
    posts,
    loading,
    error,
    onRetry,
}: BlogListPageProps) {
    // ── Loading ──
    if (loading) {
        return (
            <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto text-[#c8622a]" />
                    <p className="text-[#6b4c3b]">Loading stories…</p>
                </div>
            </div>
        )
    }

    // ── Error ──
    if (error) {
        return (
            <div className="min-h-screen bg-[#faf7f2] flex items-center justify-center px-4">
                <div className="bg-white border border-[#e8ddd4] rounded-xl p-8 max-w-sm w-full text-center space-y-4 shadow-sm">
                    <AlertCircle className="w-10 h-10 text-[#c8622a] mx-auto" />
                    <h3 className="font-serif text-xl font-bold text-[#2c1810]">
                        Couldn't load stories
                    </h3>
                    <p className="text-sm text-[#6b4c3b]">{error}</p>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="bg-[#c8622a] hover:bg-[#b05520] text-white font-medium px-6 py-2.5 rounded-full text-sm transition-colors"
                        >
                            Try Again
                        </button>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#faf7f2]">
            {/* Header */}
            <div className="bg-[#2c1810] text-[#faf7f2] py-14 px-4 text-center">
                <span className="inline-block text-[#c8622a] text-sm font-medium tracking-widest uppercase mb-3">
                    From our kitchen
                </span>
                <h1 className="font-serif text-4xl md:text-5xl font-bold">
                    Stories &amp; Recipes
                </h1>
                <div className="mt-4 flex items-center justify-center gap-3">
                    <div className="h-px w-12 bg-[#c8622a]/50" />
                    <span className="text-[#c8622a]">✦</span>
                    <div className="h-px w-12 bg-[#c8622a]/50" />
                </div>
                <p className="mt-4 text-[#d4b8a8] text-base font-light max-w-md mx-auto">
                    Recipes, behind-the-scenes stories, and inspiration from our kitchen
                </p>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
                {posts.length === 0 ? (
                    <div className="text-center py-20 space-y-4">
                        <div className="w-16 h-16 bg-[#f0e8e0] rounded-full flex items-center justify-center mx-auto text-3xl">
                            📖
                        </div>
                        <h3 className="font-serif text-2xl font-bold text-[#2c1810]">
                            No stories yet
                        </h3>
                        <p className="text-sm text-[#6b4c3b]">
                            Check back soon — our stories and recipes are coming!
                        </p>
                        <Link
                            href={`/store/${storeSlug}/products`}
                            className="inline-flex items-center gap-2 bg-[#c8622a] hover:bg-[#b05520] text-white font-medium px-6 py-3 rounded-full text-sm transition-colors mt-2"
                        >
                            <BookOpen className="w-4 h-4" />
                            Browse our menu instead
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {posts.map((post) => (
                                <PostCard key={post.id} post={post} storeSlug={storeSlug} />
                            ))}
                        </div>
                        <p className="text-center text-xs text-[#6b4c3b] mt-10">
                            {posts.length} {posts.length === 1 ? 'story' : 'stories'} published
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}
