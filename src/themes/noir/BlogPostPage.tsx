'use client'

import Link from 'next/link'
import { ArrowLeft, Clock, Calendar, ArrowRight } from 'lucide-react'
import type { BlogPostPageProps } from '../types'

function Grain() {
    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[100] opacity-[0.032] mix-blend-overlay"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")` }} />
    )
}

function formatDate(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function NoirBlogPostPage({ storeSlug, post, relatedPosts, contentHtml }: BlogPostPageProps) {
    const date = formatDate(post.published_at)

    return (
        <div className="min-h-screen bg-[#080808] text-[#e8e2d9]" style={{ fontFamily: "'Jost', sans-serif" }}>
            <Grain />

            {post.cover_image && (
                <div className="relative h-[55vh] max-h-[620px] overflow-hidden bg-[#0e0e0e]">
                    <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, #080808 100%)' }} />
                    <div className="absolute bottom-0 left-0 right-0 px-8 md:px-16 lg:px-24 pb-14">
                        {post.tags[0] && <p className="text-[9px] tracking-[0.4em] uppercase text-[#c9a96e] mb-4">{post.tags[0]}</p>}
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-normal uppercase leading-none text-white max-w-4xl"
                            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.02em' }}>
                            {post.title}
                        </h1>
                    </div>
                </div>
            )}

            <div className="px-8 md:px-16 lg:px-24 pt-16 pb-20">
                <Link href={`/store/${storeSlug}/blog`}
                    className="inline-flex items-center gap-2 text-[9px] tracking-[0.35em] uppercase text-[#555] hover:text-[#c9a96e] transition-colors mb-12 group">
                    <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
                    All articles
                </Link>

                {!post.cover_image && (
                    <div className="mb-12 max-w-3xl">
                        {post.tags[0] && <p className="text-[9px] tracking-[0.4em] uppercase text-[#c9a96e] mb-5">{post.tags[0]}</p>}
                        <h1 className="text-5xl md:text-7xl font-normal uppercase leading-none text-white mb-4"
                            style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.02em' }}>
                            {post.title}
                        </h1>
                    </div>
                )}

                <div className="max-w-2xl">
                    <div className="flex flex-wrap items-center gap-5 mb-10 pb-8" style={{ borderBottom: '1px solid #1a1a1a' }}>
                        {post.author && (
                            <div className="flex items-center gap-2.5">
                                {post.author.avatar_url
                                    ? <img src={post.author.avatar_url} alt={post.author.name} className="w-8 h-8 rounded-full object-cover opacity-80" />
                                    : <div className="w-8 h-8 border border-[#333] flex items-center justify-center text-xs text-[#666]">{post.author.name[0]}</div>
                                }
                                <div>
                                    <p className="text-[10px] tracking-[0.2em] uppercase text-[#888]">{post.author.name}</p>
                                    {post.author.bio && <p className="text-[9px] text-[#444] line-clamp-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{post.author.bio}</p>}
                                </div>
                            </div>
                        )}
                        {date && <span className="text-[10px] tracking-[0.2em] uppercase text-[#444] flex items-center gap-1.5"><Calendar className="w-3 h-3" />{date}</span>}
                        {post.reading_time_minutes && <span className="text-[10px] tracking-[0.2em] uppercase text-[#444] flex items-center gap-1.5"><Clock className="w-3 h-3" />{post.reading_time_minutes} min read</span>}
                    </div>

                    {post.excerpt && (
                        <p className="text-xl font-light leading-relaxed mb-10 italic text-[#888]"
                            style={{ fontFamily: "'Cormorant Garamond', serif", borderLeft: '2px solid #c9a96e', paddingLeft: '1.25rem' }}>
                            {post.excerpt}
                        </p>
                    )}

                    <div
                        className="
                            [&_h2]:text-3xl [&_h2]:md:text-4xl [&_h2]:font-normal [&_h2]:uppercase [&_h2]:mt-12 [&_h2]:mb-5 [&_h2]:text-white
                            [&_h3]:text-xl [&_h3]:font-light [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-[#e8e2d9]
                            [&_p]:text-[#888] [&_p]:font-light [&_p]:leading-relaxed [&_p]:mb-6
                            [&_ul]:mb-6 [&_ul]:space-y-2
                            [&_li]:flex [&_li]:items-start [&_li]:gap-3 [&_li]:text-base [&_li]:font-light [&_li]:text-[#777] [&_li]:leading-relaxed
                            [&_blockquote]:my-8 [&_blockquote]:pl-5 [&_blockquote]:text-xl [&_blockquote]:font-light [&_blockquote]:italic [&_blockquote]:text-[#666] [&_blockquote]:border-l-2 [&_blockquote]:border-[#c9a96e]
                            [&_hr]:my-12 [&_hr]:border-[#1a1a1a]
                            [&_img]:w-full [&_img]:object-cover [&_img]:opacity-90 [&_img]:my-10
                            [&_a]:text-[#c9a96e] [&_a]:underline
                            [&_code]:bg-[#111] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono [&_code]:text-[#c9a96e]
                        "
                        style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem' }}
                        dangerouslySetInnerHTML={{ __html: contentHtml }}
                    />

                    {post.tags.length > 0 && (
                        <div className="mt-10 pt-8 flex flex-wrap gap-2" style={{ borderTop: '1px solid #1a1a1a' }}>
                            {post.tags.map(t => (
                                <span key={t} className="text-[9px] tracking-[0.2em] uppercase text-[#444] border border-[#1e1e1e] px-2.5 py-1">{t}</span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {relatedPosts.length > 0 && (
                <div className="px-8 md:px-16 lg:px-24 pb-20" style={{ borderTop: '1px solid #111' }}>
                    <div className="flex items-center gap-6 mb-12 pt-16">
                        <div className="h-px flex-1 bg-[#1a1a1a]" />
                        <p className="text-[9px] tracking-[0.4em] uppercase text-[#c9a96e]">More Pieces</p>
                        <div className="h-px flex-1 bg-[#1a1a1a]" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                        {relatedPosts.map(r => (
                            <Link key={r.id} href={`/store/${storeSlug}/blog/${r.slug}`} className="group block">
                                {r.cover_image && (
                                    <div className="aspect-[16/10] bg-[#0e0e0e] overflow-hidden mb-3">
                                        <img src={r.cover_image} alt={r.title} className="w-full h-full object-cover opacity-75 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105" />
                                    </div>
                                )}
                                <h4 className="text-base font-light text-[#e8e2d9] group-hover:text-white transition-colors leading-snug" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{r.title}</h4>
                                {r.author && <p className="text-[9px] tracking-[0.2em] uppercase text-[#444] mt-1">{r.author.name}</p>}
                                <span className="inline-flex items-center gap-2 mt-2 text-[9px] tracking-[0.3em] uppercase text-[#c9a96e] group-hover:gap-4 transition-all">
                                    Read <ArrowRight className="w-2.5 h-2.5" />
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}