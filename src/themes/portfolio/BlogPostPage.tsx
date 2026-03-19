'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Clock, Calendar, BookOpen } from 'lucide-react'
import type { BlogPostPageProps } from '../types'

function formatDate(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function PortfolioBlogPostPage({ storeSlug, post, relatedPosts, contentHtml }: BlogPostPageProps) {
    const date = formatDate(post.published_at)

    return (
        <div className="min-h-screen bg-white text-[#111111] font-sans">

            {/* ── COVER IMAGE ── */}
            {post.cover_image && (
                <div className="relative w-full h-[50vh] md:h-[65vh] overflow-hidden bg-gray-50">
                    <img
                        src={post.cover_image}
                        alt={post.title}
                        className="w-full h-full object-cover"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white/80" />

                    {/* Back link overlaid on image */}
                    <div className="absolute top-6 left-6 md:left-12">
                        <Link
                            href={`/store/${storeSlug}/blog`}
                            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white bg-black/30 backdrop-blur-sm hover:bg-black/50 px-4 py-2 transition-colors group"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                            Insights
                        </Link>
                    </div>
                </div>
            )}

            {/* ── ARTICLE ── */}
            <div className="max-w-3xl mx-auto px-6 md:px-8 py-16 md:py-20">

                {/* Back link (when no cover image) */}
                {!post.cover_image && (
                    <Link
                        href={`/store/${storeSlug}/blog`}
                        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-[#6366f1] transition-colors mb-10 group"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                        All Insights
                    </Link>
                )}

                {/* Eyebrow / tags */}
                {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                        {post.tags.map(tag => (
                            <span
                                key={tag}
                                className="text-[10px] font-bold uppercase tracking-[0.25em] bg-[#6366f1] text-white px-3 py-1"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Title */}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#111111] leading-tight mb-8">
                    {post.title}
                </h1>

                {/* Author / meta bar */}
                <div className="flex flex-wrap items-center gap-5 py-6 mb-10 border-t-2 border-b border-gray-100 border-t-[#6366f1]/20">
                    {post.author && (
                        <div className="flex items-center gap-3">
                            {post.author.avatar_url ? (
                                <img
                                    src={post.author.avatar_url}
                                    alt={post.author.name}
                                    className="w-9 h-9 rounded-full object-cover ring-2 ring-[#6366f1]/20"
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-[#6366f1]/10 text-[#6366f1] font-black text-sm flex items-center justify-center">
                                    {post.author.name[0]}
                                </div>
                            )}
                            <div>
                                <p className="text-sm font-black text-[#111111]">{post.author.name}</p>
                                {post.author.bio && (
                                    <p className="text-[11px] text-gray-400 line-clamp-1 max-w-[200px]">{post.author.bio}</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-400 ml-auto">
                        {date && (
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-[#6366f1]" />
                                {date}
                            </span>
                        )}
                        {post.reading_time_minutes && (
                            <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-[#6366f1]" />
                                {post.reading_time_minutes} min read
                            </span>
                        )}
                    </div>
                </div>

                {/* Excerpt / pull quote */}
                {post.excerpt && (
                    <p className="text-xl text-gray-500 font-light leading-relaxed mb-10 border-l-4 border-[#6366f1] pl-6">
                        {post.excerpt}
                    </p>
                )}

                {/* Article body */}
                <div
                    className="
                        prose-portfolio
                        [&_h2]:text-2xl [&_h2]:md:text-3xl [&_h2]:font-black [&_h2]:text-[#111111] [&_h2]:mt-12 [&_h2]:mb-5 [&_h2]:leading-tight
                        [&_h3]:text-xl [&_h3]:font-black [&_h3]:text-[#111111] [&_h3]:mt-10 [&_h3]:mb-4 [&_h3]:leading-tight
                        [&_h4]:text-base [&_h4]:font-black [&_h4]:text-[#111111] [&_h4]:mt-8 [&_h4]:mb-3 [&_h4]:uppercase [&_h4]:tracking-wider
                        [&_p]:text-base [&_p]:text-gray-500 [&_p]:leading-[1.9] [&_p]:mb-6
                        [&_ul]:mb-6 [&_ul]:space-y-2 [&_ul]:ml-0 [&_ul]:list-none
                        [&_ol]:mb-6 [&_ol]:space-y-2 [&_ol]:ml-0 [&_ol]:list-none [&_ol]:counter-reset-[list]
                        [&_li]:text-base [&_li]:text-gray-500 [&_li]:leading-relaxed [&_li]:pl-5 [&_li]:relative
                        [&_ul_li]:before:content-['—'] [&_ul_li]:before:absolute [&_ul_li]:before:left-0 [&_ul_li]:before:text-[#6366f1] [&_ul_li]:before:font-black
                        [&_blockquote]:my-10 [&_blockquote]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-[#6366f1] [&_blockquote]:text-xl [&_blockquote]:text-gray-400 [&_blockquote]:font-light [&_blockquote]:leading-relaxed
                        [&_hr]:my-12 [&_hr]:border-gray-100
                        [&_img]:w-full [&_img]:my-10 [&_img]:border [&_img]:border-gray-100
                        [&_a]:text-[#6366f1] [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-[#4f46e5]
                        [&_code]:bg-gray-50 [&_code]:border [&_code]:border-gray-100 [&_code]:px-2 [&_code]:py-0.5 [&_code]:text-sm [&_code]:font-mono [&_code]:text-[#6366f1]
                        [&_pre]:bg-[#111111] [&_pre]:text-gray-100 [&_pre]:p-6 [&_pre]:my-8 [&_pre]:overflow-x-auto [&_pre]:text-sm [&_pre]:font-mono
                        [&_strong]:font-black [&_strong]:text-[#111111]
                        [&_em]:italic [&_em]:text-gray-600
                        [&_table]:w-full [&_table]:my-8 [&_table]:text-sm [&_table]:border-collapse
                        [&_th]:bg-gray-50 [&_th]:font-black [&_th]:uppercase [&_th]:tracking-widest [&_th]:text-[11px] [&_th]:text-[#111111] [&_th]:p-3 [&_th]:text-left [&_th]:border [&_th]:border-gray-100
                        [&_td]:p-3 [&_td]:text-gray-500 [&_td]:border [&_td]:border-gray-100
                    "
                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                />

                {/* Bottom tags */}
                {post.tags.length > 0 && (
                    <div className="mt-12 pt-8 border-t border-gray-100">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-300 mb-4">Tagged</p>
                        <div className="flex flex-wrap gap-2">
                            {post.tags.map(tag => (
                                <span
                                    key={tag}
                                    className="text-[11px] font-bold uppercase tracking-widest text-[#6366f1] border border-[#6366f1]/20 bg-[#6366f1]/5 px-3 py-1.5"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Author bio card */}
                {post.author?.bio && (
                    <div className="mt-12 border border-gray-100 p-6 md:p-8 flex gap-5 items-start">
                        {post.author.avatar_url ? (
                            <img src={post.author.avatar_url} alt={post.author.name} className="w-14 h-14 rounded-full object-cover flex-shrink-0 ring-2 ring-[#6366f1]/20" />
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-[#6366f1]/10 text-[#6366f1] text-xl font-black flex items-center justify-center flex-shrink-0">
                                {post.author.name[0]}
                            </div>
                        )}
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-[#6366f1] mb-1">Author</p>
                            <p className="text-base font-black text-[#111111] mb-2">{post.author.name}</p>
                            <p className="text-sm text-gray-400 leading-relaxed">{post.author.bio}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── RELATED POSTS ── */}
            {relatedPosts.length > 0 && (
                <div className="border-t-2 border-gray-100 py-16 md:py-24 px-6 md:px-12">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex items-end justify-between mb-12">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#6366f1] mb-3">Continue Reading</p>
                                <h3 className="text-3xl md:text-4xl font-black text-[#111111]">More Insights</h3>
                            </div>
                            <Link
                                href={`/store/${storeSlug}/blog`}
                                className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-[#6366f1] transition-colors group hidden sm:flex"
                            >
                                All articles <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                            {relatedPosts.map(related => (
                                <Link
                                    key={related.id}
                                    href={`/store/${storeSlug}/blog/${related.slug}`}
                                    className="group block border border-gray-100 bg-white hover:border-[#6366f1]/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                                >
                                    {related.cover_image ? (
                                        <div className="aspect-video overflow-hidden bg-gray-50">
                                            <img
                                                src={related.cover_image}
                                                alt={related.title}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                                            />
                                        </div>
                                    ) : (
                                        <div className="aspect-video bg-gray-50 flex items-center justify-center">
                                            <BookOpen className="w-8 h-8 text-gray-200" />
                                        </div>
                                    )}
                                    <div className="p-5 space-y-2">
                                        {related.author && (
                                            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-300">
                                                {related.author.name}
                                            </p>
                                        )}
                                        <h4 className="text-base font-black text-[#111111] leading-tight group-hover:text-[#6366f1] transition-colors line-clamp-2">
                                            {related.title}
                                        </h4>
                                        {related.excerpt && (
                                            <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">{related.excerpt}</p>
                                        )}
                                        <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#6366f1] group-hover:gap-4 transition-all duration-200 pt-1">
                                            Read <ArrowRight className="w-3 h-3" />
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
