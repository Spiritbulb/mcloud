'use client'

import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, ArrowRight, Tag } from 'lucide-react'
import type { BlogPostPageProps } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// ─── Services Blog Post Page ───────────────────────────────────────────────────

export default function ServicesBlogPostPage({
    storeSlug,
    post,
    relatedPosts,
    contentHtml,
}: BlogPostPageProps) {
    const date = formatDate(post.published_at)

    return (
        <div
            className="min-h-screen bg-[#f8fafc] text-[#0f172a]"
            style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
        >
            {/* ── Cover image ── */}
            {post.cover_image && (
                <div className="relative w-full h-[50vh] max-h-[520px] overflow-hidden bg-[#e2e8f0]">
                    <img
                        src={post.cover_image}
                        alt={post.title}
                        className="w-full h-full object-cover"
                    />
                    <div
                        className="absolute inset-0"
                        style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(15,23,42,0.65) 100%)' }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 max-w-3xl mx-auto px-6 md:px-8 pb-10">
                        {post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {post.tags.map((t) => (
                                    <span
                                        key={t}
                                        className="text-xs font-semibold bg-[#2563eb] text-white px-3 py-0.5 rounded-full"
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                        )}
                        <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight tracking-tight">
                            {post.title}
                        </h1>
                    </div>
                </div>
            )}

            {/* ── Article column ── */}
            <div className="max-w-3xl mx-auto px-6 md:px-8 py-12">

                {/* Back link */}
                <Link
                    href={`/store/${storeSlug}/blog`}
                    className="inline-flex items-center gap-2 text-sm text-[#64748b] hover:text-[#2563eb] transition-colors mb-8 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Back to Resources &amp; Insights
                </Link>

                {/* Title (if no cover image) */}
                {!post.cover_image && (
                    <>
                        {post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-5">
                                {post.tags.map((t) => (
                                    <span
                                        key={t}
                                        className="inline-flex items-center gap-1 text-xs font-semibold bg-[#eff6ff] text-[#1d4ed8] px-3 py-1 rounded-full border border-[#bfdbfe]"
                                    >
                                        <Tag className="w-3 h-3" />
                                        {t}
                                    </span>
                                ))}
                            </div>
                        )}
                        <h1 className="text-3xl md:text-5xl font-bold text-[#0f172a] leading-tight tracking-tight mb-6">
                            {post.title}
                        </h1>
                    </>
                )}

                {/* Author + meta bar */}
                <div
                    className="flex flex-wrap items-center gap-4 py-5 mb-8 text-sm text-[#64748b]"
                    style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}
                >
                    {post.author && (
                        <div className="flex items-center gap-2.5">
                            {post.author.avatar_url ? (
                                <img
                                    src={post.author.avatar_url}
                                    alt={post.author.name}
                                    className="w-8 h-8 rounded-full object-cover border border-[#e2e8f0]"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-[#eff6ff] flex items-center justify-center text-xs font-bold text-[#2563eb]">
                                    {post.author.name[0]}
                                </div>
                            )}
                            <div>
                                <p className="text-sm font-semibold text-[#0f172a] leading-tight">
                                    {post.author.name}
                                </p>
                                {post.author.bio && (
                                    <p className="text-xs text-[#94a3b8] line-clamp-1">{post.author.bio}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {date && (
                        <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {date}
                        </span>
                    )}

                    {post.reading_time_minutes && (
                        <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {post.reading_time_minutes} min read
                        </span>
                    )}
                </div>

                {/* Excerpt / pull quote */}
                {post.excerpt && (
                    <div className="mb-8 pl-5 py-1" style={{ borderLeft: '3px solid #2563eb' }}>
                        <p className="text-lg font-light text-[#475569] leading-relaxed italic">
                            {post.excerpt}
                        </p>
                    </div>
                )}

                {/* Main content */}
                <div
                    className="prose prose-slate prose-base max-w-none
                        prose-headings:font-bold prose-headings:text-[#0f172a] prose-headings:tracking-tight
                        prose-p:text-[#475569] prose-p:leading-relaxed
                        prose-a:text-[#2563eb] prose-a:no-underline hover:prose-a:underline
                        prose-strong:text-[#0f172a]
                        prose-li:text-[#475569]
                        prose-blockquote:border-l-[#2563eb] prose-blockquote:text-[#64748b]
                        prose-img:rounded-xl prose-img:border prose-img:border-[#e2e8f0]
                        prose-code:text-[#1d4ed8] prose-code:bg-[#eff6ff] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded"
                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                />

                {/* Tags at bottom */}
                {post.tags.length > 0 && (
                    <div
                        className="mt-10 pt-6 flex flex-wrap gap-2"
                        style={{ borderTop: '1px solid #e2e8f0' }}
                    >
                        <Tag className="w-4 h-4 text-[#94a3b8] self-center flex-shrink-0" />
                        {post.tags.map((t) => (
                            <span
                                key={t}
                                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]"
                            >
                                {t}
                            </span>
                        ))}
                    </div>
                )}

                {/* Back link (bottom) */}
                <div className="mt-10 pt-6" style={{ borderTop: '1px solid #e2e8f0' }}>
                    <Link
                        href={`/store/${storeSlug}/blog`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb] hover:gap-3 transition-all group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        Back to Resources &amp; Insights
                    </Link>
                </div>
            </div>

            {/* ── Related posts ── */}
            {relatedPosts.length > 0 && (
                <section
                    className="py-16 bg-white"
                    style={{ borderTop: '1px solid #e2e8f0' }}
                >
                    <div className="max-w-6xl mx-auto px-6 md:px-10">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="h-px flex-1 bg-[#e2e8f0]" />
                            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#64748b]">
                                Related Articles
                            </h2>
                            <div className="h-px flex-1 bg-[#e2e8f0]" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {relatedPosts.map((related) => (
                                <Link
                                    key={related.id}
                                    href={`/store/${storeSlug}/blog/${related.slug}`}
                                    className="group block bg-[#f8fafc] rounded-xl border border-[#e2e8f0] hover:border-[#2563eb]/30 hover:shadow-md transition-all duration-200 overflow-hidden"
                                >
                                    {/* Accent bar */}
                                    <div className="h-0.5 bg-[#2563eb] opacity-0 group-hover:opacity-100 transition-opacity" />
                                    {related.cover_image && (
                                        <div className="aspect-[16/9] overflow-hidden bg-[#f1f5f9]">
                                            <img
                                                src={related.cover_image}
                                                alt={related.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        </div>
                                    )}
                                    <div className="p-5 space-y-2">
                                        <h3 className="text-base font-bold text-[#0f172a] leading-snug line-clamp-2 group-hover:text-[#2563eb] transition-colors">
                                            {related.title}
                                        </h3>
                                        {related.excerpt && (
                                            <p className="text-sm text-[#64748b] line-clamp-2 leading-relaxed">
                                                {related.excerpt}
                                            </p>
                                        )}
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563eb] group-hover:gap-2 transition-all pt-1">
                                            Read more <ArrowRight className="w-3 h-3" />
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
