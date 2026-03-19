'use client'

import Link from 'next/link'
import { Calendar, Clock } from 'lucide-react'
import type { BlogPostPageProps } from '../types'

function formatDate(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function PhotographyBlogPostPage({ storeSlug, post, relatedPosts, contentHtml }: BlogPostPageProps) {
    const date = formatDate(post.published_at)

    return (
        <div
            className="min-h-screen bg-[#0c0c0c] text-[#f2f2f2]"
            style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}
        >
            {/* ── Full-width cover image ── */}
            {post.cover_image && (
                <div className="relative w-full overflow-hidden bg-[#111]" style={{ height: '60vh', maxHeight: 680 }}>
                    <img
                        src={post.cover_image}
                        alt={post.title}
                        className="w-full h-full object-cover"
                        style={{ opacity: 0.55 }}
                    />
                    <div
                        className="absolute inset-0"
                        style={{ background: 'linear-gradient(to bottom, transparent 20%, #0c0c0c 100%)' }}
                    />
                    {/* Title overlay at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 px-6 md:px-12 lg:px-20 pb-12">
                        {post.tags[0] && (
                            <p className="text-[9px] tracking-[0.4em] uppercase text-[#c8965a] mb-4">
                                {post.tags[0]}
                            </p>
                        )}
                        <h1
                            className="text-4xl md:text-6xl lg:text-7xl font-normal leading-none text-[#f2f2f2] max-w-3xl"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                            {post.title}
                        </h1>
                    </div>
                </div>
            )}

            <div className="px-6 md:px-12 lg:px-20 pt-14 pb-20">
                {/* Back link */}
                <Link
                    href={`/store/${storeSlug}/blog`}
                    className="inline-flex items-center gap-2 text-[9px] tracking-[0.35em] uppercase text-[#555] hover:text-[#c8965a] transition-colors mb-12 group"
                >
                    <span className="transition-transform group-hover:-translate-x-1 inline-block">←</span>
                    Journal
                </Link>

                {/* Title (when no cover image) */}
                {!post.cover_image && (
                    <div className="mb-10 max-w-2xl">
                        {post.tags[0] && (
                            <p className="text-[9px] tracking-[0.4em] uppercase text-[#c8965a] mb-5">
                                {post.tags[0]}
                            </p>
                        )}
                        <h1
                            className="text-4xl md:text-6xl font-normal leading-tight text-[#f2f2f2] mb-4"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                            {post.title}
                        </h1>
                        <div className="w-8 h-px bg-[#c8965a]" />
                    </div>
                )}

                {/* Centered content column */}
                <div className="max-w-2xl mx-auto">

                    {/* Author info */}
                    <div
                        className="flex flex-wrap items-center gap-5 mb-10 pb-8"
                        style={{ borderBottom: '1px solid #1c1c1c' }}
                    >
                        {post.author && (
                            <div className="flex items-center gap-3">
                                {post.author.avatar_url ? (
                                    <img
                                        src={post.author.avatar_url}
                                        alt={post.author.name}
                                        className="w-9 h-9 object-cover"
                                        style={{ opacity: 0.9 }}
                                    />
                                ) : (
                                    <div className="w-9 h-9 bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center text-xs text-[#666]">
                                        {post.author.name[0]}
                                    </div>
                                )}
                                <div>
                                    <p className="text-[10px] tracking-[0.2em] uppercase text-[#888]">
                                        {post.author.name}
                                    </p>
                                    {post.author.bio && (
                                        <p className="text-[9px] text-[#444] line-clamp-1 font-light mt-0.5">
                                            {post.author.bio}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                        {date && (
                            <span className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-[#444]">
                                <Calendar className="w-3 h-3" />
                                {date}
                            </span>
                        )}
                        {post.reading_time_minutes && (
                            <span className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-[#444]">
                                <Clock className="w-3 h-3" />
                                {post.reading_time_minutes} min read
                            </span>
                        )}
                    </div>

                    {/* Excerpt / pull quote */}
                    {post.excerpt && (
                        <p
                            className="text-lg font-light leading-relaxed mb-10 text-[#888] italic"
                            style={{
                                fontFamily: "'Playfair Display', Georgia, serif",
                                borderLeft: '2px solid #c8965a',
                                paddingLeft: '1.25rem',
                            }}
                        >
                            {post.excerpt}
                        </p>
                    )}

                    {/* Article body */}
                    <div
                        className="
                            [&_h2]:text-3xl [&_h2]:font-normal [&_h2]:mt-12 [&_h2]:mb-5 [&_h2]:text-[#f2f2f2] [&_h2]:leading-tight
                            [&_h3]:text-xl [&_h3]:font-normal [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-[#e8e8e8]
                            [&_p]:text-[#888] [&_p]:font-light [&_p]:leading-relaxed [&_p]:mb-6
                            [&_ul]:mb-6 [&_ul]:space-y-2
                            [&_ol]:mb-6 [&_ol]:space-y-2
                            [&_li]:text-[#777] [&_li]:font-light [&_li]:leading-relaxed [&_li]:pl-4
                            [&_blockquote]:my-8 [&_blockquote]:pl-5 [&_blockquote]:text-lg [&_blockquote]:font-light [&_blockquote]:italic [&_blockquote]:text-[#666] [&_blockquote]:border-l-2 [&_blockquote]:border-[#c8965a]
                            [&_hr]:my-12 [&_hr]:border-[#1c1c1c]
                            [&_img]:w-full [&_img]:object-cover [&_img]:my-10
                            [&_a]:text-[#c8965a] [&_a]:underline [&_a]:underline-offset-2
                            [&_code]:bg-[#111] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono [&_code]:text-[#c8965a]
                            [&_strong]:text-[#ccc] [&_strong]:font-medium
                        "
                        style={{ fontSize: '1rem' }}
                        dangerouslySetInnerHTML={{ __html: contentHtml }}
                    />

                    {/* Tags */}
                    {post.tags.length > 0 && (
                        <div
                            className="mt-10 pt-8 flex flex-wrap gap-2"
                            style={{ borderTop: '1px solid #1c1c1c' }}
                        >
                            {post.tags.map(t => (
                                <span
                                    key={t}
                                    className="text-[9px] tracking-[0.2em] uppercase text-[#444] border border-[#1e1e1e] px-2.5 py-1"
                                >
                                    {t}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Related posts ── */}
            {relatedPosts.length > 0 && (
                <div
                    className="px-6 md:px-12 lg:px-20 pb-20"
                    style={{ borderTop: '1px solid #111' }}
                >
                    <div className="flex items-center gap-6 mb-12 pt-16">
                        <div className="h-px flex-1 bg-[#1c1c1c]" />
                        <p className="text-[9px] tracking-[0.4em] uppercase text-[#c8965a]">More from the Journal</p>
                        <div className="h-px flex-1 bg-[#1c1c1c]" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                        {relatedPosts.map(related => (
                            <Link
                                key={related.id}
                                href={`/store/${storeSlug}/blog/${related.slug}`}
                                className="group block"
                            >
                                {related.cover_image && (
                                    <div className="aspect-[3/2] bg-[#181818] overflow-hidden mb-3">
                                        <img
                                            src={related.cover_image}
                                            alt={related.title}
                                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                                            style={{ opacity: 0.75 }}
                                        />
                                    </div>
                                )}
                                <h4
                                    className="text-base font-normal leading-snug text-[#f2f2f2] group-hover:text-[#c8965a] transition-colors duration-200"
                                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                                >
                                    {related.title}
                                </h4>
                                {related.author && (
                                    <p className="text-[9px] tracking-[0.2em] uppercase text-[#444] mt-1">
                                        {related.author.name}
                                    </p>
                                )}
                                <span className="inline-block mt-2 text-[9px] tracking-[0.3em] uppercase text-[#c8965a] group-hover:tracking-[0.45em] transition-all duration-300">
                                    Read →
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
