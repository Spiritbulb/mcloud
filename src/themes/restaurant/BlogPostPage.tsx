'use client'

import Link from 'next/link'
import { ArrowLeft, Clock, Calendar, ArrowRight } from 'lucide-react'
import type { BlogPostPageProps } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    })
}

// ─── Restaurant Blog Post Page ─────────────────────────────────────────────────

export default function RestaurantBlogPostPage({
    storeSlug,
    post,
    relatedPosts,
    contentHtml,
}: BlogPostPageProps) {
    const date = formatDate(post.published_at)

    return (
        <div className="min-h-screen bg-[#faf7f2]">

            {/* Cover image hero */}
            {post.cover_image ? (
                <div className="relative w-full h-[55vh] max-h-[580px] overflow-hidden bg-[#f0e8e0]">
                    <img
                        src={post.cover_image}
                        alt={post.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

                    {/* Title over image */}
                    <div className="absolute bottom-0 left-0 right-0 max-w-3xl mx-auto px-6 md:px-8 pb-10">
                        {post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {post.tags.map((t) => (
                                    <span
                                        key={t}
                                        className="text-xs text-white/80 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20"
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                        )}
                        <h1 className="font-serif text-3xl md:text-5xl font-bold text-white leading-tight drop-shadow-lg">
                            {post.title}
                        </h1>
                    </div>
                </div>
            ) : (
                /* No cover image — warm header block */
                <div className="bg-[#2c1810] text-[#faf7f2] py-16 px-4">
                    <div className="max-w-3xl mx-auto">
                        {post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-5">
                                {post.tags.map((t) => (
                                    <span
                                        key={t}
                                        className="text-xs text-[#c8622a] bg-[#c8622a]/15 px-3 py-1 rounded-full font-medium"
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                        )}
                        <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight">
                            {post.title}
                        </h1>
                    </div>
                </div>
            )}

            {/* Article body */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-10">
                {/* Back link */}
                <Link
                    href={`/store/${storeSlug}/blog`}
                    className="inline-flex items-center gap-2 text-sm text-[#6b4c3b] hover:text-[#c8622a] transition-colors mb-8 group"
                >
                    <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                    Back to Stories &amp; Recipes
                </Link>

                {/* Author + meta bar */}
                <div className="flex flex-wrap items-center gap-5 py-5 mb-8 border-y border-[#e8ddd4] text-sm text-[#6b4c3b]">
                    {post.author && (
                        <div className="flex items-center gap-3">
                            {post.author.avatar_url ? (
                                <img
                                    src={post.author.avatar_url}
                                    alt={post.author.name}
                                    className="w-9 h-9 rounded-full object-cover border-2 border-[#c8622a]/20"
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-[#c8622a]/15 flex items-center justify-center text-sm font-bold text-[#c8622a]">
                                    {post.author.name[0]}
                                </div>
                            )}
                            <div>
                                <p className="font-medium text-[#2c1810]">{post.author.name}</p>
                                {post.author.bio && (
                                    <p className="text-xs line-clamp-1 text-[#6b4c3b]">
                                        {post.author.bio}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                    {date && (
                        <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#c8622a]" />
                            {date}
                        </span>
                    )}
                    {post.reading_time_minutes && (
                        <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#c8622a]" />
                            {post.reading_time_minutes} min read
                        </span>
                    )}
                </div>

                {/* Excerpt as pull quote */}
                {post.excerpt && (
                    <p className="text-lg font-light leading-relaxed italic text-[#4a2e20] mb-8 pl-5 border-l-4 border-[#c8622a]/50">
                        {post.excerpt}
                    </p>
                )}

                {/* Article content */}
                <div
                    className="prose prose-stone max-w-none
                        prose-headings:font-serif prose-headings:text-[#2c1810] prose-headings:font-bold
                        prose-p:text-[#4a2e20] prose-p:leading-relaxed
                        prose-a:text-[#c8622a] prose-a:no-underline hover:prose-a:underline
                        prose-img:rounded-xl prose-img:shadow-md
                        prose-blockquote:border-l-[#c8622a] prose-blockquote:text-[#6b4c3b]
                        prose-strong:text-[#2c1810]
                        prose-li:text-[#4a2e20]"
                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                />

                {/* Tags */}
                {post.tags.length > 0 && (
                    <div className="mt-10 pt-6 border-t border-[#e8ddd4] flex flex-wrap gap-2">
                        {post.tags.map((t) => (
                            <span
                                key={t}
                                className="text-xs text-[#c8622a] bg-[#c8622a]/10 px-3 py-1.5 rounded-full font-medium"
                            >
                                {t}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Related posts */}
            {relatedPosts.length > 0 && (
                <section className="bg-[#f5ede3] py-14 px-4 sm:px-6 border-t border-[#e8ddd4]">
                    <div className="max-w-5xl mx-auto">
                        <div className="text-center mb-10">
                            <span className="inline-block text-[#c8622a] text-sm font-medium tracking-widest uppercase mb-3">
                                More from us
                            </span>
                            <h2 className="font-serif text-3xl font-bold text-[#2c1810]">
                                You Might Also Enjoy
                            </h2>
                            <div className="mt-3 flex items-center justify-center gap-3">
                                <div className="h-px w-10 bg-[#c8622a]/40" />
                                <span className="text-[#c8622a] text-sm">✦</span>
                                <div className="h-px w-10 bg-[#c8622a]/40" />
                            </div>
                        </div>

                        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {relatedPosts.map((r) => (
                                <Link
                                    key={r.id}
                                    href={`/store/${storeSlug}/blog/${r.slug}`}
                                    className="group flex flex-col bg-white border border-[#e8ddd4] hover:border-[#c8622a]/30 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
                                >
                                    {r.cover_image && (
                                        <div className="aspect-[16/9] overflow-hidden bg-[#f0e8e0]">
                                            <img
                                                src={r.cover_image}
                                                alt={r.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        </div>
                                    )}
                                    <div className="p-4 space-y-2 flex-1 flex flex-col">
                                        <h3 className="font-serif font-bold text-[#2c1810] group-hover:text-[#c8622a] transition-colors line-clamp-2 leading-snug">
                                            {r.title}
                                        </h3>
                                        {r.excerpt && (
                                            <p className="text-sm text-[#6b4c3b] line-clamp-2 leading-relaxed flex-1">
                                                {r.excerpt}
                                            </p>
                                        )}
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#c8622a] pt-1 group-hover:gap-2.5 transition-all">
                                            Read more
                                            <ArrowRight className="w-3 h-3" />
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </div>
    )
}
