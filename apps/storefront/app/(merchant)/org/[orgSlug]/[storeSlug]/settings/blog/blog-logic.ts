// Form rules for the Blog screen (blog-client.tsx). Pure, tested in blog-logic.test.ts.

export interface PostForm {
    id: string | null // null = new post
    title: string
    slug: string
    excerpt: string
    content: string
    cover_image: string
    author_id: string
    tags: string // comma-separated in the form, split on save
    is_published: boolean
    featured: boolean
    reading_time_minutes: number
}

type PostLike = {
    id: string
    title: string
    slug: string
    excerpt: string | null
    content: string
    cover_image: string | null
    author_id: string | null
    tags: string[] | null
    is_published: boolean
    reading_time_minutes: number | null
    metadata?: unknown
}

export function emptyForm(): PostForm {
    return {
        id: null,
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        cover_image: '',
        author_id: '',
        tags: '',
        is_published: false,
        featured: false,
        reading_time_minutes: 1,
    }
}

export function formFromPost(post: PostLike): PostForm {
    const metadata = post.metadata && typeof post.metadata === 'object' ? (post.metadata as Record<string, unknown>) : {}
    return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt ?? '',
        content: post.content,
        cover_image: post.cover_image ?? '',
        author_id: post.author_id ?? '',
        tags: (post.tags ?? []).join(', '),
        is_published: post.is_published,
        featured: metadata.featured === true,
        reading_time_minutes: post.reading_time_minutes ?? 1,
    }
}

/** URL-safe slug from a title: lowercase, hyphens for spaces, no punctuation. */
export function slugify(s: string): string {
    return s
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

/** Minutes at 200 words a minute, at least 1. */
export function estimateReadingTime(content: string): number {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0
    return Math.max(1, Math.round(words / 200))
}

export function splitTags(tags: string): string[] {
    return [...new Set(tags.split(',').map((t) => t.trim()).filter(Boolean))]
}

/**
 * The slug to keep when the title changes: follow the title while the slug still matches it (or
 * the post is new), so a slug the merchant edited by hand, or a published URL, is not rewritten.
 */
export function nextSlug(form: Pick<PostForm, 'id' | 'title' | 'slug'>, title: string): string {
    return form.id === null || form.slug === slugify(form.title) ? slugify(title) : form.slug
}

/** Whether the editor holds changes the last save does not have. Tag order and spacing do not count. */
export function formChanged(saved: PostForm, draft: PostForm): boolean {
    const norm = (f: PostForm) => ({ ...f, tags: splitTags(f.tags).join(','), reading_time_minutes: 0 })
    const a = norm(saved)
    const b = norm(draft)
    return (Object.keys(a) as (keyof PostForm)[]).some((k) => a[k] !== b[k])
}
