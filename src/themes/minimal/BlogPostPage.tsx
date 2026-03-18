'use client'

import Link from 'next/link'
import { ArrowLeft, Clock, Calendar, ArrowRight } from 'lucide-react'
import type { BlogPostPageProps } from '../types'

function formatDate(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function MinimalBlogPostPage({ storeSlug, post, relatedPosts, contentHtml }: BlogPostPageProps) {
    const date = formatDate(post.published_at)

    return (
        <div className="min-h-screen bg-[#f7f4f0] text-[#1a1714]" style={{ fontFamily: "'DM Sans', sans-serif" }}>

            {post.cover_image && (
                <div className="relative h-[45vh] max-h-[500px] overflow-hidden bg-[#ede9e3]">
                    <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 50%, #f7f4f0 100%)' }} />
                </div>
            )}

            <div className="max-w-2xl mx-auto px-6 md:px-8 pt-16 pb-20">
                <Link href={`/store/${storeSlug}/blog`}
                    className="inline-flex items-center gap-1.5 text-xs tracking-wider uppercase text-[#9a9189] hover:text-[#5c5650] transition-colors mb-10 group">
                    <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                    Journal
                </Link>

                {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-5">
                        {post.tags.map(t => (
                            <span key={t} className="text-[9px] tracking-[0.15em] uppercase bg-[#1a1714] text-[#f7f4f0] px-1.5 py-0.5">{t}</span>
                        ))}
                    </div>
                )}

                <h1 className="text-4xl md:text-5xl font-normal leading-tight mb-6" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    {post.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 py-5 mb-8 text-xs text-[#9a9189]"
                    style={{ borderTop: '1px solid #e5e0d9', borderBottom: '1px solid #e5e0d9' }}>
                    {post.author && (
                        <div className="flex items-center gap-2">
                            {post.author.avatar_url
                                ? <img src={post.author.avatar_url} alt={post.author.name} className="w-7 h-7 rounded-full object-cover" />
                                : <div className="w-7 h-7 rounded-full bg-[#ede9e3] flex items-center justify-center text-[10px] text-[#9a9189]">{post.author.name[0]}</div>
                            }
                            <div>
                                <p className="text-xs text-[#5c5650]">{post.author.name}</p>
                                {post.author.bio && <p className="text-[10px] text-[#c8c0b6] line-clamp-1">{post.author.bio}</p>}
                            </div>
                        </div>
                    )}
                    {date && <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />{date}</span>}
                    {post.reading_time_minutes && <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{post.reading_time_minutes} min read</span>}
                </div>

                {post.excerpt && (
                    <p className="text-lg text-[#5c5650] font-light leading-relaxed mb-8"
                        style={{ borderLeft: '2px solid #e5e0d9', paddingLeft: '1.25rem' }}>
                        {post.excerpt}
                    </p>
                )}

                <div
                    className="
                        [&_h2]:text-2xl [&_h2]:md:text-3xl [&_h2]:font-normal [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-[#1a1714]
                        [&_h3]:text-xl [&_h3]:font-normal [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-[#1a1714]
                        [&_p]:text-[15px] [&_p]:text-[#5c5650] [&_p]:font-light [&_p]:leading-[1.85] [&_p]:mb-6
                        [&_ul]:mb-6 [&_ul]:space-y-2
                        [&_ol]:mb-6 [&_ol]:ml-4 [&_ol]:list-decimal
                        [&_li]:text-[15px] [&_li]:font-light [&_li]:text-[#5c5650] [&_li]:leading-relaxed
                        [&_blockquote]:my-8 [&_blockquote]:pl-5 [&_blockquote]:text-lg [&_blockquote]:font-light [&_blockquote]:text-[#9a9189] [&_blockquote]:leading-relaxed [&_blockquote]:border-l-2 [&_blockquote]:border-[#e5e0d9]
                        [&_hr]:my-10 [&_hr]:border-[#e5e0d9]
                        [&_img]:w-full [&_img]:object-cover [&_img]:my-8
                        [&_a]:text-[#5c5650] [&_a]:underline [&_a]:underline-offset-2
                        [&_code]:bg-[#ede9e3] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono
                        [&_strong]:font-semibold [&_strong]:text-[#1a1714]
                    "
                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                />

                {post.tags.length > 0 && (
                    <div className="mt-10 pt-6 flex flex-wrap gap-2" style={{ borderTop: '1px solid #e5e0d9' }}>
                        {post.tags.map(t => (
                            <span key={t} className="text-[10px] uppercase tracking-widest text-[#9a9189] border border-[#e5e0d9] px-3 py-1">{t}</span>
                        ))}
                    </div>
                )}
            </div>

            {relatedPosts.length > 0 && (
                <div className="px-6 md:px-12 lg:px-20 pb-20" style={{ borderTop: '1px solid #e5e0d9' }}>
                    <div className="max-w-5xl mx-auto pt-14">
                        <h3 className="text-2xl font-normal text-[#1a1714] mb-3" style={{ fontFamily: "'DM Serif Display', serif" }}>More articles</h3>
                        <div className="h-px bg-[#e5e0d9] mb-8" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                            {relatedPosts.map(r => (
                                <Link key={r.id} href={`/store/${storeSlug}/blog/${r.slug}`} className="group block">
                                    {r.cover_image && (
                                        <div className="aspect-[3/2] overflow-hidden bg-[#ede9e3] mb-3">
                                            <img src={r.cover_image} alt={r.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                                        </div>
                                    )}
                                    <h4 className="text-sm text-[#1a1714] leading-snug mb-1 group-hover:text-[#5c5650] transition-colors">{r.title}</h4>
                                    {r.author && <p className="text-[10px] text-[#c8c0b6] mb-1">{r.author.name}</p>}
                                    {r.excerpt && <p className="text-xs text-[#9a9189] line-clamp-2 leading-relaxed">{r.excerpt}</p>}
                                    <span className="inline-flex items-center gap-1.5 mt-2 text-[10px] uppercase tracking-widest text-[#5c5650] group-hover:gap-3 transition-all">
                                        Read <ArrowRight className="w-2.5 h-2.5" />
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}