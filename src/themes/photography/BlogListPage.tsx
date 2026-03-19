'use client'

import Link from 'next/link'
import type { BlogListPageProps, BlogPost } from '../types'

function formatDate(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function FeaturedPost({ post, storeSlug }: { post: BlogPost; storeSlug: string }) {
    const date = formatDate(post.published_at)
    return (
        <Link href={`/store/${storeSlug}/blog/${post.slug}`} className="group block mb-16">
            <div className="grid grid-cols-1 lg:grid-cols-2">
                {/* Cover image */}
                <div className="relative aspect-[4/3] lg:aspect-auto bg-[#181818] overflow-hidden">
                    {post.cover_image ? (
                        <img
                            src={post.cover_image}
                            alt={post.title}
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                            style={{ opacity: 0.85 }}
                        />
                    ) : (
                        <div className="w-full h-full bg-[#181818]" />
                    )}
                </div>

                {/* Text content */}
                <div className="bg-[#111] p-8 md:p-12 flex flex-col justify-between">
                    <div className="space-y-4">
                        <p className="text-[9px] tracking-[0.4em] uppercase text-[#c8965a]">Featured</p>
                        <h2
                            className="text-3xl md:text-4xl font-normal leading-tight text-[#f2f2f2]"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                            {post.title}
                        </h2>
                        {post.excerpt && (
                            <p className="text-sm text-[#666] font-light leading-relaxed">
                                {post.excerpt}
                            </p>
                        )}
                    </div>

                    <div className="space-y-3 mt-8">
                        <div className="flex flex-wrap items-center gap-3 text-[9px] tracking-[0.25em] uppercase text-[#555]">
                            {post.author && <span>{post.author.name}</span>}
                            {post.author && date && <span>·</span>}
                            {date && <span>{date}</span>}
                            {post.reading_time_minutes && (
                                <><span>·</span><span>{post.reading_time_minutes} min read</span></>
                            )}
                        </div>
                        <div className="text-[10px] tracking-[0.3em] uppercase text-[#c8965a] group-hover:tracking-[0.5em] transition-all duration-300">
                            Read Entry →
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    )
}

function PostCard({ post, storeSlug }: { post: BlogPost; storeSlug: string }) {
    const date = formatDate(post.published_at)
    return (
        <Link href={`/store/${storeSlug}/blog/${post.slug}`} className="group block">
            {/* Cover image */}
            <div className="relative aspect-[3/2] bg-[#181818] overflow-hidden mb-4">
                {post.cover_image ? (
                    <img
                        src={post.cover_image}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                        style={{ opacity: 0.8 }}
                    />
                ) : (
                    <div className="w-full h-full bg-[#181818]" />
                )}
                {post.tags[0] && (
                    <span className="absolute top-3 right-3 text-[9px] tracking-[0.25em] uppercase text-[#c8965a] bg-black/80 border border-[#c8965a]/30 px-2 py-0.5">
                        {post.tags[0]}
                    </span>
                )}
            </div>

            {/* Meta */}
            <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-[9px] tracking-[0.2em] uppercase text-[#555]">
                    {post.author && <span>{post.author.name}</span>}
                    {post.author && date && <span>·</span>}
                    {date && <span>{date}</span>}
                </div>
                <h3
                    className="text-lg font-normal leading-snug text-[#f2f2f2] group-hover:text-[#c8965a] transition-colors duration-200"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                    {post.title}
                </h3>
                {post.excerpt && (
                    <p className="text-sm text-[#555] font-light leading-relaxed line-clamp-2">
                        {post.excerpt}
                    </p>
                )}
            </div>
        </Link>
    )
}

export default function PhotographyBlogListPage({ storeSlug, posts, loading, error, onRetry }: BlogListPageProps) {
    if (loading) {
        return (
            <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center">
                <div className="w-px h-16 bg-gradient-to-b from-transparent via-[#c8965a] to-transparent animate-pulse" />
            </div>
        )
    }

    if (error) {
        return (
            <div
                className="min-h-screen bg-[#0c0c0c] flex items-center justify-center px-6"
                style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}
            >
                <div className="text-center space-y-4">
                    <p className="text-[10px] tracking-[0.35em] uppercase text-[#c8965a]">Error</p>
                    <p className="text-sm text-[#666] font-light">{error}</p>
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="text-[10px] tracking-[0.3em] uppercase text-[#f2f2f2] border-b border-[#c8965a]/50 pb-0.5 hover:border-[#c8965a] transition-colors"
                        >
                            Try again
                        </button>
                    )}
                </div>
            </div>
        )
    }

    const featuredPost = posts[0] ?? null
    const remainingPosts = posts.slice(1)

    return (
        <div
            className="min-h-screen bg-[#0c0c0c] text-[#f2f2f2]"
            style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}
        >
            <div className="px-6 md:px-12 lg:px-20 pt-24 pb-20">

                {/* Header */}
                <div className="mb-16">
                    <p className="text-[9px] tracking-[0.4em] uppercase text-[#c8965a] mb-4">Writing & Thoughts</p>
                    <h1
                        className="text-5xl md:text-7xl font-normal leading-none text-[#f2f2f2]"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                        Journal
                    </h1>
                    <div className="w-8 h-px bg-[#c8965a] mt-6" />
                </div>

                {posts.length === 0 ? (
                    <div className="py-32 text-center">
                        <p className="text-[11px] tracking-[0.3em] uppercase text-[#444]">No entries yet</p>
                    </div>
                ) : (
                    <>
                        {/* Featured post */}
                        {featuredPost && (
                            <FeaturedPost post={featuredPost} storeSlug={storeSlug} />
                        )}

                        {/* Remaining posts grid */}
                        {remainingPosts.length > 0 && (
                            <>
                                <div className="h-px bg-[#1c1c1c] mb-12" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12">
                                    {remainingPosts.map(post => (
                                        <PostCard key={post.id} post={post} storeSlug={storeSlug} />
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Footer count */}
                        {posts.length > 1 && (
                            <div className="mt-16 flex items-center gap-6">
                                <div className="h-px flex-1 bg-[#1c1c1c]" />
                                <p className="text-[9px] tracking-[0.3em] uppercase text-[#444]">
                                    {posts.length} {posts.length === 1 ? 'entry' : 'entries'}
                                </p>
                                <div className="h-px flex-1 bg-[#1c1c1c]" />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
