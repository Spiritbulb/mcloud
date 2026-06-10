'use client'

import Link from 'next/link'
import { ArrowLeft, Clock, Calendar, ArrowRight } from 'lucide-react'
import type { BlogPostPageProps } from '../types'

function formatDate(iso: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function ClassicBlogPostPage({ storeSlug, post, relatedPosts, contentHtml }: BlogPostPageProps) {
    const date = formatDate(post.published_at)

    return (
        <div className="min-h-screen">

            {post.cover_image && (
                <div className="relative h-[50vh] max-h-[560px] overflow-hidden sf-bg-muted">
                    <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.6) 100%)' }} />
                    <div className="absolute bottom-0 left-0 right-0 max-w-3xl mx-auto px-6 md:px-8 pb-10">
                        {post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {post.tags.map(t => (
                                    <span key={t} className="text-xs text-white/80 bg-white/20 backdrop-blur-sm px-2.5 py-0.5 border border-white/20">{t}</span>
                                ))}
                            </div>
                        )}
                        <h1 className="sf-heading text-3xl md:text-5xl font-light text-white leading-tight">{post.title}</h1>
                    </div>
                </div>
            )}

            <div className="max-w-3xl mx-auto px-6 md:px-8 py-12">
                <Link href={`/store/${storeSlug}/blog`} className="inline-flex items-center gap-1.5 text-sm mb-8 group" style={{ color: 'var(--sf-foreground-subtle)' }}>
                    <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                    Back to Journal
                </Link>

                {!post.cover_image && (
                    <>
                        {post.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {post.tags.map(t => <span key={t} className="sf-pill sf-pill-inactive border px-3 py-1 text-xs">{t}</span>)}
                            </div>
                        )}
                        <h1 className="sf-heading text-4xl md:text-5xl font-light leading-tight mb-6" style={{ color: 'var(--sf-foreground)' }}>
                            {post.title}
                        </h1>
                    </>
                )}

                <div className="flex flex-wrap items-center gap-4 py-5 mb-8 text-sm"
                    style={{ borderTop: '1px solid var(--sf-border)', borderBottom: '1px solid var(--sf-border)', color: 'var(--sf-foreground-subtle)' }}>
                    {post.author && (
                        <div className="flex items-center gap-2">
                            {post.author.avatar_url
                                ? <img src={post.author.avatar_url} alt={post.author.name} className="w-7 h-7 rounded-full object-cover" />
                                : <div className="w-7 h-7 rounded-full sf-bg-muted flex items-center justify-center text-xs font-medium" style={{ color: 'var(--sf-foreground)' }}>{post.author.name[0]}</div>
                            }
                            <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--sf-foreground)' }}>{post.author.name}</p>
                                {post.author.bio && <p className="text-xs line-clamp-1">{post.author.bio}</p>}
                            </div>
                        </div>
                    )}
                    {date && <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{date}</span>}
                    {post.reading_time_minutes && <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{post.reading_time_minutes} min read</span>}
                </div>

                {post.excerpt && (
                    <p className="text-lg font-light leading-relaxed mb-8 italic"
                        style={{ color: 'var(--sf-foreground-subtle)', borderLeft: '3px solid var(--sf-accent, #c9a96e)', paddingLeft: '1.25rem' }}>
                        {post.excerpt}
                    </p>
                )}

                <div
                    className="prose prose-neutral max-w-none prose-headings:sf-heading prose-headings:font-normal prose-a:underline prose-img:rounded"
                    style={{ color: 'var(--sf-foreground)' }}
                    dangerouslySetInnerHTML={{ __html: contentHtml }}
                />

                {post.tags.length > 0 && (
                    <div className="mt-10 pt-6 flex flex-wrap gap-2" style={{ borderTop: '1px solid var(--sf-border)' }}>
                        {post.tags.map(t => <span key={t} className="sf-pill sf-pill-inactive border px-3 py-1 text-xs">{t}</span>)}
                    </div>
                )}
            </div>

            {relatedPosts.length > 0 && (
                <div className="max-w-7xl mx-auto px-6 md:px-8 py-16" style={{ borderTop: '1px solid var(--sf-border)' }}>
                    <div className="flex items-center gap-4 mb-10">
                        <div className="h-px flex-1" style={{ backgroundColor: 'var(--sf-border)' }} />
                        <span className="sf-badge-outline inline-flex items-center border px-2.5 py-0.5 text-xs font-medium">More Articles</span>
                        <div className="h-px flex-1" style={{ backgroundColor: 'var(--sf-border)' }} />
                    </div>
                    <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {relatedPosts.map(r => (
                            <Link key={r.id} href={`/store/${storeSlug}/blog/${r.slug}`} className="group block">
                                <div className="sf-card overflow-hidden hover:shadow-lg transition-shadow">
                                    {r.cover_image && (
                                        <div className="aspect-[16/9] overflow-hidden sf-bg-muted">
                                            <img src={r.cover_image} alt={r.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                        </div>
                                    )}
                                    <div className="p-5 space-y-2">
                                        <h3 className="sf-heading text-lg font-normal leading-snug group-hover:underline" style={{ color: 'var(--sf-foreground)' }}>{r.title}</h3>
                                        {r.excerpt && <p className="text-sm line-clamp-2 font-light" style={{ color: 'var(--sf-foreground-subtle)' }}>{r.excerpt}</p>}
                                        <span className="inline-flex items-center gap-1 text-xs sf-text-accent group-hover:gap-2 transition-all pt-1">
                                            Read more <ArrowRight className="w-3 h-3" />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}