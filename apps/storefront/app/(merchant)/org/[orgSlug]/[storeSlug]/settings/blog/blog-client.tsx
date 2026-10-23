'use client'

// Blog management: the post list, and an editor with write/preview and the post's settings beside it.

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Plan } from '@mcloud/merchant/plans'
import { storefrontDisplayUrl } from '@mcloud/merchant/storefront-url'
import type { BlogAuthor, BlogPost } from '@mcloud/themes/types'
import { Badge } from '@mcloud/ui/kit/badge'
import { Button } from '@mcloud/ui/kit/button'
import { ConfirmDialog } from '@mcloud/ui/kit/confirm-dialog'
import { EmptyState } from '@mcloud/ui/kit/empty-state'
import { Field, Select, Switch, TextArea, TextInput } from '@mcloud/ui/kit/form'
import { Icon } from '@mcloud/ui/kit/icon'
import { Notice } from '@mcloud/ui/kit/notice'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { SaveStatus } from '@mcloud/ui/kit/save-bar'
import { Spinner } from '@mcloud/ui/kit/skeleton'
import { Tabs } from '@mcloud/ui/kit/tabs'
import { ProGateInline } from '@/components/pro'
// The Markdown editor lives in its own module and loads lazily (it fixed Turbopack fetch errors).
import { MarkdownEditor } from '@/components/store/blog/editor'
import { createBlogAuthor, deleteBlogPost, saveBlogPost } from '@/lib/admin/blog-actions'
import { emptyForm, estimateReadingTime, formChanged, formFromPost, nextSlug, splitTags, type PostForm } from './blog-logic'

interface Props {
    storeId: string
    storeSlug: string
    posts: BlogPost[]
    authors: BlogAuthor[]
    plan: Plan
}

function formatDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Author dialog ────────────────────────────────────────────────────────────

function AuthorDialog({ open, onClose, onSaved, storeId }: {
    open: boolean
    onClose: () => void
    onSaved: (author: BlogAuthor) => void
    storeId: string
}) {
    const [name, setName] = useState('')
    const [bio, setBio] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const close = () => {
        setError('')
        onClose()
    }

    const handleSave = async () => {
        if (!name.trim()) {
            setError('Enter a name.')
            return
        }
        setSaving(true)
        setError('')
        const res = await createBlogAuthor(storeId, { name: name.trim(), bio: bio.trim() || null, avatar_url: avatarUrl.trim() || null })
        setSaving(false)
        if (!res.ok) {
            setError(res.error)
            return
        }
        onSaved(res.author as BlogAuthor)
        setName('')
        setBio('')
        setAvatarUrl('')
        onClose()
    }

    return (
        <ConfirmDialog
            open={open}
            title="New author"
            description="Shown on the posts you assign them to."
            confirmLabel="Create author"
            tone="primary"
            busy={saving}
            onConfirm={handleSave}
            onCancel={close}
        >
            <div className="space-y-3">
                <Field label="Name" error={error || undefined}>
                    <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" invalid={!!error} />
                </Field>
                <Field label="Short bio">
                    <TextArea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Editor and stylist based in Nairobi" rows={2} />
                </Field>
                <Field label="Photo URL">
                    <TextInput value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" spellCheck={false} />
                </Field>
            </div>
        </ConfirmDialog>
    )
}

// ─── Markdown preview ─────────────────────────────────────────────────────────

function MarkdownPreview({ content }: { content: string }) {
    if (!content.trim()) {
        return <p className="py-16 text-center text-[13px] text-muted-foreground">Nothing to preview yet.</p>
    }
    return (
        <div className="max-w-none px-1 py-2 text-[14px] text-foreground/90">
            <ReactMarkdown
                components={{
                    h1: ({ children }) => <h1 className="mb-3 mt-6 text-2xl font-semibold text-foreground">{children}</h1>,
                    h2: ({ children }) => <h2 className="mb-3 mt-6 text-xl font-semibold text-foreground">{children}</h2>,
                    h3: ({ children }) => <h3 className="mb-2 mt-5 text-lg font-semibold text-foreground">{children}</h3>,
                    p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                    a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">{children}</a>,
                    ul: ({ children }) => <ul className="mb-4 ml-5 list-disc space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-4 ml-5 list-decimal space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    blockquote: ({ children }) => <blockquote className="my-4 border-l-2 border-border pl-4 italic text-muted-foreground">{children}</blockquote>,
                    code: ({ children, className }) =>
                        className?.includes('language-')
                            ? <code className="block overflow-x-auto rounded-md bg-muted p-3 font-mono text-[12px]">{children}</code>
                            : <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">{children}</code>,
                    img: ({ src, alt }) => (
                        <figure className="my-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={typeof src === 'string' ? src : undefined} alt={alt ?? ''} className="w-full rounded-md object-cover" />
                            {alt && <figcaption className="mt-1 text-center text-[12px] text-muted-foreground">{alt}</figcaption>}
                        </figure>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}

// ─── Post settings (beside the editor; under it on small screens) ─────────────

function PostSettings({ form, set, authors, onNewAuthor, onDelete }: {
    form: PostForm
    set: (patch: Partial<PostForm>) => void
    authors: BlogAuthor[]
    onNewAuthor: () => void
    onDelete?: () => void
}) {
    const tags = splitTags(form.tags)
    return (
        <Panel
            title="Post settings"
            action={<Badge tone={form.is_published ? 'success' : 'neutral'}>{form.is_published ? 'Published' : 'Draft'}</Badge>}
            footer={onDelete && (
                <Button variant="danger" size="sm" onClick={onDelete} className="mr-auto">
                    <Icon name="delete" size={14} />
                    Delete post
                </Button>
            )}
        >
            <div className="space-y-4">
                <Field label="Author" as="div">
                    <div className="flex items-center gap-2">
                        <Select aria-label="Author" value={form.author_id} onChange={(e) => set({ author_id: e.target.value })}>
                            <option value="">No author</option>
                            {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </Select>
                        <Button size="sm" variant="ghost" onClick={onNewAuthor} aria-label="New author" title="New author">
                            <Icon name="person_add" size={16} />
                        </Button>
                    </div>
                </Field>
                <Field label="Excerpt" hint="A short summary for the blog list.">
                    <TextArea value={form.excerpt} onChange={(e) => set({ excerpt: e.target.value })} rows={3} />
                </Field>
                <Field label="Cover image URL">
                    <TextInput value={form.cover_image} onChange={(e) => set({ cover_image: e.target.value })} placeholder="https://…" spellCheck={false} />
                </Field>
                {form.cover_image.trim() && (
                    <div className="aspect-video overflow-hidden rounded-md border border-border bg-muted">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={form.cover_image} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </div>
                )}
                <Field label="Tags" hint="Separate with commas.">
                    <TextInput value={form.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="style, hair care, tips" />
                </Field>
                {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {tags.map((t) => <Badge key={t}>{t}</Badge>)}
                    </div>
                )}
                <Switch label="Featured" description="Shown first on your blog page." checked={form.featured} onChange={(featured) => set({ featured })} />
            </div>
        </Panel>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function BlogSettingsClient({ storeId, storeSlug, posts: initialPosts, authors: initialAuthors, plan }: Props) {
    const [view, setView] = useState<'list' | 'editor'>('list')
    const [posts, setPosts] = useState<BlogPost[]>(initialPosts)
    const [authors, setAuthors] = useState<BlogAuthor[]>(initialAuthors)
    const [saved, setSaved] = useState<PostForm>(emptyForm)
    const [form, setForm] = useState<PostForm>(emptyForm)
    const [tab, setTab] = useState<'write' | 'preview'>('write')
    const [saving, setSaving] = useState(false)
    const [justSaved, setJustSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [authorDialog, setAuthorDialog] = useState(false)
    const [leaving, setLeaving] = useState(false)

    const dirty = view === 'editor' && formChanged(saved, form)
    const set = (patch: Partial<PostForm>) => setForm((f) => ({ ...f, ...patch }))

    const openEditor = (next: PostForm) => {
        setSaved(next)
        setForm(next)
        setTab('write')
        setError(null)
        setView('editor')
    }

    const backToList = () => {
        setLeaving(false)
        setError(null)
        setView('list')
    }

    const handleSave = async (publish?: boolean) => {
        if (!form.title.trim()) return setError('Give the post a title.')
        if (!form.slug.trim()) return setError('Give the post a URL.')

        setSaving(true)
        setError(null)
        const is_published = publish ?? form.is_published
        const res = await saveBlogPost(storeId, form.id, {
            title: form.title.trim(),
            slug: form.slug.trim(),
            excerpt: form.excerpt.trim() || null,
            content: form.content,
            cover_image: form.cover_image.trim() || null,
            author_id: form.author_id || null,
            tags: splitTags(form.tags),
            is_published,
            reading_time_minutes: estimateReadingTime(form.content),
            featured: form.featured,
        })
        setSaving(false)
        if (!res.ok) return setError(res.error)

        const post = res.post as unknown as BlogPost
        setPosts((ps) => (form.id ? ps.map((p) => (p.id === post.id ? post : p)) : [post, ...ps]))
        const next = formFromPost(post)
        setSaved(next)
        setForm(next)
        setJustSaved(true)
        setTimeout(() => setJustSaved(false), 2500)
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        const res = await deleteBlogPost(storeId, deleteTarget.id)
        setDeleting(false)
        const target = deleteTarget
        setDeleteTarget(null)
        if (!res.ok) return setError(res.error)
        setPosts((ps) => ps.filter((p) => p.id !== target.id))
        if (form.id === target.id) backToList()
    }

    const handleAuthorSaved = (author: BlogAuthor) => {
        setAuthors((a) => [...a, author].sort((x, y) => x.name.localeCompare(y.name)))
        if (view === 'editor') set({ author_id: author.id })
    }

    const published = posts.filter((p) => p.is_published).length

    return (
        <ProGateInline
            plan={plan}
            requires="hobby"
            feature="Blog"
            description="Publish blog posts on your store on the Hobby plan and higher."
        >
            <div className="space-y-6">
                {view === 'list' ? (
                    <>
                        <PageHeader
                            title="Blog"
                            description={`${posts.length} post${posts.length === 1 ? '' : 's'}, ${published} published.`}
                            actions={
                                <>
                                    <Button onClick={() => setAuthorDialog(true)}>
                                        <Icon name="person_add" size={15} />
                                        New author
                                    </Button>
                                    <Button variant="primary" onClick={() => openEditor(emptyForm())}>
                                        <Icon name="add" size={15} />
                                        New post
                                    </Button>
                                </>
                            }
                        />
                        {error && <Notice tone="error">{error}</Notice>}
                        <Panel flush>
                            {posts.length === 0 ? (
                                <EmptyState
                                    icon="article"
                                    title="No posts yet"
                                    description="Write about what you sell, news, or tips for your customers."
                                    action={<Button variant="primary" onClick={() => openEditor(emptyForm())}>New post</Button>}
                                />
                            ) : (
                                <ul className="divide-y divide-border">
                                    {posts.map((post) => (
                                        <li key={post.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                                            <button type="button" onClick={() => openEditor(formFromPost(post))} className="min-w-0 flex-1 text-left">
                                                <span className="flex items-center gap-2">
                                                    <span className="truncate text-[13px] font-medium text-foreground">{post.title || 'Untitled'}</span>
                                                    {post.metadata?.featured && <Badge tone="info">Featured</Badge>}
                                                </span>
                                                <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                                                    {formatDate(post.published_at ?? post.created_at)}
                                                    {post.reading_time_minutes ? ` · ${post.reading_time_minutes} min read` : ''}
                                                    {post.tags?.length ? ` · ${post.tags.slice(0, 3).join(', ')}` : ''}
                                                </span>
                                            </button>
                                            <Badge tone={post.is_published ? 'success' : 'neutral'}>{post.is_published ? 'Published' : 'Draft'}</Badge>
                                            <Button size="sm" variant="ghost" aria-label={`Delete ${post.title || 'post'}`} onClick={() => setDeleteTarget(post)}>
                                                <Icon name="delete" size={15} />
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Panel>
                    </>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => (dirty ? setLeaving(true) : backToList())}
                                className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
                            >
                                <Icon name="arrow_back" size={15} />
                                All posts
                            </button>
                            <div className="flex items-center gap-2">
                                <SaveStatus saving={saving} saved={justSaved} />
                                {form.is_published ? (
                                    <>
                                        <Button onClick={() => handleSave(false)} disabled={saving}>Unpublish</Button>
                                        <Button variant="primary" onClick={() => handleSave()} disabled={saving || !dirty}>
                                            {saving ? <Spinner size={13} /> : <Icon name="check" size={15} />}
                                            Save
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button onClick={() => handleSave(false)} disabled={saving}>Save draft</Button>
                                        <Button variant="primary" onClick={() => handleSave(true)} disabled={saving}>
                                            {saving ? <Spinner size={13} /> : <Icon name="public" size={15} />}
                                            Publish
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {error && <Notice tone="error">{error}</Notice>}

                        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
                            <Panel>
                                <div className="space-y-4">
                                    <input
                                        aria-label="Title"
                                        value={form.title}
                                        onChange={(e) => set({ title: e.target.value, slug: nextSlug(form, e.target.value) })}
                                        placeholder="Post title"
                                        className="w-full bg-transparent text-xl font-semibold text-foreground outline-none placeholder:text-muted-foreground/50"
                                    />
                                    <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-[12px] text-muted-foreground">
                                        <span className="truncate">{storefrontDisplayUrl(storeSlug)}/blog/</span>
                                        <TextInput
                                            aria-label="Post URL"
                                            value={form.slug}
                                            onChange={(e) => set({ slug: e.target.value })}
                                            placeholder="post-url"
                                            className="h-7 w-auto min-w-0 flex-1 font-mono text-[12px] sm:max-w-xs"
                                            spellCheck={false}
                                        />
                                        <span className="ml-auto">{estimateReadingTime(form.content)} min read</span>
                                    </div>
                                    <Tabs
                                        label="Editor"
                                        value={tab}
                                        onChange={(id) => setTab(id as 'write' | 'preview')}
                                        items={[{ id: 'write', label: 'Write' }, { id: 'preview', label: 'Preview' }]}
                                    />
                                    <div className="min-h-[28rem]">
                                        {tab === 'write'
                                            ? <MarkdownEditor value={form.content} onChange={(content) => set({ content })} minHeight="28rem" />
                                            : <MarkdownPreview content={form.content} />}
                                    </div>
                                </div>
                            </Panel>
                            <PostSettings
                                form={form}
                                set={set}
                                authors={authors}
                                onNewAuthor={() => setAuthorDialog(true)}
                                onDelete={form.id ? () => setDeleteTarget(posts.find((p) => p.id === form.id) ?? null) : undefined}
                            />
                        </div>
                    </>
                )}

                <AuthorDialog open={authorDialog} onClose={() => setAuthorDialog(false)} onSaved={handleAuthorSaved} storeId={storeId} />

                <ConfirmDialog
                    open={!!deleteTarget}
                    title="Delete this post?"
                    description={`"${deleteTarget?.title || 'This post'}" is deleted for good, and its link stops working.`}
                    confirmLabel="Delete post"
                    busy={deleting}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                />

                <ConfirmDialog
                    open={leaving}
                    title="Leave without saving?"
                    description="Your changes to this post will be lost."
                    confirmLabel="Discard changes"
                    onConfirm={backToList}
                    onCancel={() => setLeaving(false)}
                />
            </div>
        </ProGateInline>
    )
}
