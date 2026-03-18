'use client'

// app/settings/[slug]/blog/blog-client.tsx
// Full blog management UI: post list sidebar + split markdown editor/preview.
// Dependencies to install:
//   npm install @uiw/react-codemirror @codemirror/lang-markdown

import { useState, useEffect, useTransition } from 'react'
import ReactMarkdown from 'react-markdown'
import { createClient } from '@/lib/client'
// CodeMirror lives in its own isolated module — this is what fixes the
// Turbopack "negative timestamp" / Failed to fetch errors.
import { MarkdownEditor } from '@/components/store/blog/editor'
import {
    Plus, Eye, Edit3, Trash2, Save, Loader2,
    Globe, Lock, User, Clock, Tag, X,
    BookOpen, AlertCircle, CheckCircle2, ArrowLeft, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import type { BlogPost, BlogAuthor } from '@/src/themes/types'

// Radix Select forbids empty-string values (it uses "" internally to mean
// "nothing selected / show placeholder"). Use a sentinel instead.
const NO_AUTHOR = '__none__'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    storeId: string
    storeSlug: string
    posts: BlogPost[]
    authors: BlogAuthor[]
}

type View = 'list' | 'editor'
type EditorTab = 'write' | 'preview'

interface PostForm {
    id: string | null       // null = new post
    title: string
    slug: string
    excerpt: string
    content: string
    cover_image: string
    author_id: string
    tags: string            // comma-separated in the form, split on save
    is_published: boolean
    reading_time_minutes: number
}

function emptyForm(): PostForm {
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
        reading_time_minutes: 1,
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(s: string) {
    return s
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
}

function estimateReadingTime(content: string) {
    return Math.max(1, Math.round(content.trim().split(/\s+/).length / 200))
}

function formatDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    })
}

// ─── Toast (minimal inline) ───────────────────────────────────────────────────

function Toast({ message, type, onDismiss }: {
    message: string
    type: 'success' | 'error'
    onDismiss: () => void
}) {
    useEffect(() => {
        const t = setTimeout(onDismiss, 4000)
        return () => clearTimeout(t)
    }, [onDismiss])

    return (
        <div className={cn(
            'fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-md shadow-lg text-sm font-medium border',
            type === 'success'
                ? 'bg-background border-border text-foreground'
                : 'bg-destructive/10 border-destructive/20 text-destructive'
        )}>
            {type === 'success'
                ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                : <AlertCircle className="w-4 h-4 shrink-0" />
            }
            {message}
            <button onClick={onDismiss} className="ml-1 opacity-50 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
    )
}

// ─── Author dialog ────────────────────────────────────────────────────────────

function AuthorDialog({
    open,
    onClose,
    onSaved,
    storeId,
}: {
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

    const handleSave = async () => {
        if (!name.trim()) { setError('Name is required'); return }
        setSaving(true)
        setError('')
        const supabase = createClient()
        const { data, error: err } = await supabase
            .from('blog_authors')
            .insert({ store_id: storeId, name: name.trim(), bio: bio.trim() || null, avatar_url: avatarUrl.trim() || null })
            .select()
            .single()

        if (err) { setError(err.message); setSaving(false); return }
        onSaved(data as BlogAuthor)
        setName(''); setBio(''); setAvatarUrl('')
        onClose()
        setSaving(false)
    }

    return (
        <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>New author</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 pt-1">
                    <div className="space-y-1.5">
                        <Label htmlFor="author-name" className="text-xs">Name *</Label>
                        <Input id="author-name" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Doe" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="author-bio" className="text-xs">Short bio</Label>
                        <Textarea id="author-bio" value={bio} onChange={e => setBio(e.target.value)} placeholder="Editor & stylist based in Nairobi" rows={2} className="resize-none" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="author-avatar" className="text-xs">Avatar URL</Label>
                        <Input id="author-avatar" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://…" />
                    </div>
                    {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                        Create author
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Post list item ───────────────────────────────────────────────────────────

function PostListItem({
    post,
    isActive,
    onSelect,
}: {
    post: BlogPost
    isActive: boolean
    onSelect: () => void
}) {
    return (
        <button
            onClick={onSelect}
            className={cn(
                'w-full text-left px-3 py-3 rounded-md transition-colors group',
                isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50 text-foreground'
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium truncate leading-snug">
                        {post.title || <span className="text-muted-foreground italic">Untitled</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDate(post.published_at ?? post.created_at)}
                        {post.reading_time_minutes ? ` · ${post.reading_time_minutes} min` : ''}
                    </p>
                </div>
                <div className="shrink-0 mt-0.5">
                    {post.is_published
                        ? <Globe className="w-3.5 h-3.5 text-green-600" />
                        : <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    }
                </div>
            </div>
            {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                    {post.tags.slice(0, 3).map(t => (
                        <span key={t} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                            {t}
                        </span>
                    ))}
                </div>
            )}
        </button>
    )
}

// ─── Markdown preview ─────────────────────────────────────────────────────────

function MarkdownPreview({ content }: { content: string }) {
    if (!content.trim()) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center space-y-2">
                    <Eye className="w-8 h-8 mx-auto opacity-20" />
                    <p className="text-sm">Nothing to preview yet</p>
                </div>
            </div>
        )
    }

    return (
        <div className="prose prose-sm max-w-none px-6 py-4 overflow-auto h-full prose-headings:font-semibold prose-a:text-primary prose-code:text-sm">
            <ReactMarkdown
                components={{
                    h2: ({ children }) => <h2 className="text-xl font-semibold mt-6 mb-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-semibold mt-5 mb-2">{children}</h3>,
                    p: ({ children }) => <p className="mb-4 leading-relaxed text-foreground/90">{children}</p>,
                    ul: ({ children }) => <ul className="mb-4 ml-4 space-y-1 list-disc">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-4 ml-4 space-y-1 list-decimal">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-border pl-4 italic text-muted-foreground my-4">
                            {children}
                        </blockquote>
                    ),
                    code: ({ children, className }) => {
                        const isBlock = className?.includes('language-')
                        return isBlock
                            ? <code className="block bg-muted rounded p-3 text-xs font-mono overflow-x-auto">{children}</code>
                            : <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
                    },
                    img: ({ src, alt }) => (
                        <figure className="my-4">
                            <img src={src} alt={alt ?? ''} className="rounded-md w-full object-cover" />
                            {alt && <figcaption className="text-xs text-muted-foreground text-center mt-1">{alt}</figcaption>}
                        </figure>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}

// ─── Main BlogSettingsClient ──────────────────────────────────────────────────

export function BlogSettingsClient({ storeId, storeSlug, posts: initialPosts, authors: initialAuthors }: Props) {
    const supabase = createClient()

    const [view, setView] = useState<View>('list')
    const [posts, setPosts] = useState<BlogPost[]>(initialPosts)
    const [authors, setAuthors] = useState<BlogAuthor[]>(initialAuthors)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [form, setForm] = useState<PostForm>(emptyForm())
    const [editorTab, setEditorTab] = useState<EditorTab>('write')
    const [saving, setSaving] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null)
    const [authorDialog, setAuthorDialog] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [isPending, startTransition] = useTransition()

    const showToast = (message: string, type: 'success' | 'error' = 'success') =>
        setToast({ message, type })

    // ── Open a post in editor ──
    const openPost = (post: BlogPost) => {
        setForm({
            id: post.id,
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt ?? '',
            content: post.content,
            cover_image: post.cover_image ?? '',
            author_id: post.author_id ?? '',
            tags: post.tags.join(', '),
            is_published: post.is_published,
            reading_time_minutes: post.reading_time_minutes ?? 1,
        })
        setActiveId(post.id)
        setView('editor')
        setEditorTab('write')
    }

    const newPost = () => {
        setForm(emptyForm())
        setActiveId(null)
        setView('editor')
        setEditorTab('write')
    }

    // ── Auto-slug from title ──
    const setTitle = (title: string) => {
        setForm(f => ({
            ...f,
            title,
            // Only auto-generate slug if it's a new post or slug is still in sync
            slug: (f.id === null || f.slug === slugify(f.title))
                ? slugify(title)
                : f.slug,
        }))
    }

    // ── Update reading time when content changes ──
    const setContent = (content: string) => {
        setForm(f => ({
            ...f,
            content,
            reading_time_minutes: estimateReadingTime(content),
        }))
    }

    // ── Save ──
    const handleSave = async (publish?: boolean) => {
        if (!form.title.trim()) { showToast('Title is required', 'error'); return }
        if (!form.slug.trim()) { showToast('Slug is required', 'error'); return }

        setSaving(true)
        const tags = form.tags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean)

        const is_published = publish !== undefined ? publish : form.is_published
        const payload = {
            store_id: storeId,
            title: form.title.trim(),
            slug: form.slug.trim(),
            excerpt: form.excerpt.trim() || null,
            content: form.content,
            cover_image: form.cover_image.trim() || null,
            author_id: form.author_id || null,
            tags,
            is_published,
            published_at: is_published && !form.id ? new Date().toISOString() : undefined,
            reading_time_minutes: form.reading_time_minutes,
        }

        let savedPost: BlogPost | null = null

        if (form.id) {
            // Update
            const { data, error } = await supabase
                .from('blog_posts')
                .update(payload)
                .eq('id', form.id)
                .select(`*, author:blog_authors(*)`)
                .single()
            if (error) { showToast(error.message, 'error'); setSaving(false); return }
            savedPost = data as BlogPost
            setPosts(ps => ps.map(p => p.id === savedPost!.id ? savedPost! : p))
        } else {
            // Insert
            const { data, error } = await supabase
                .from('blog_posts')
                .insert(payload)
                .select(`*, author:blog_authors(*)`)
                .single()
            if (error) { showToast(error.message, 'error'); setSaving(false); return }
            savedPost = data as BlogPost
            setPosts(ps => [savedPost!, ...ps])
        }

        setForm(f => ({ ...f, id: savedPost!.id, is_published: savedPost!.is_published }))
        setActiveId(savedPost!.id)
        showToast(is_published ? 'Published!' : 'Draft saved')
        setSaving(false)
    }

    // ── Delete ──
    const handleDelete = async () => {
        if (!deleteTarget) return
        const { error } = await supabase
            .from('blog_posts')
            .delete()
            .eq('id', deleteTarget.id)

        if (error) { showToast(error.message, 'error'); setDeleteTarget(null); return }

        setPosts(ps => ps.filter(p => p.id !== deleteTarget.id))
        if (activeId === deleteTarget.id) {
            setView('list')
            setActiveId(null)
            setForm(emptyForm())
        }
        setDeleteTarget(null)
        showToast('Post deleted')
    }

    // ── Author created ──
    const handleAuthorSaved = (author: BlogAuthor) => {
        setAuthors(a => [...a, author].sort((a, b) => a.name.localeCompare(b.name)))
        setForm(f => ({ ...f, author_id: author.id }))
        showToast(`Author "${author.name}" created`)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="h-full flex flex-col -mx-6 md:-mx-10 -my-8">

            {/* ── View: Post list ── */}
            {view === 'list' && (
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-border">
                        <div>
                            <h2 className="text-[15px] font-semibold">Blog</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {posts.length} post{posts.length !== 1 ? 's' : ''} · {posts.filter(p => p.is_published).length} published
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAuthorDialog(true)}
                                className="gap-1.5 text-xs"
                            >
                                <Users className="w-3.5 h-3.5" />
                                Authors
                            </Button>
                            <Button size="sm" onClick={newPost} className="gap-1.5 text-xs">
                                <Plus className="w-3.5 h-3.5" />
                                New post
                            </Button>
                        </div>
                    </div>

                    {/* Post list */}
                    <div className="flex-1 overflow-y-auto px-3 md:px-6 py-3">
                        {posts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-center space-y-3">
                                <BookOpen className="w-10 h-10 text-muted-foreground/30" />
                                <div>
                                    <p className="text-sm font-medium">No posts yet</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Create your first blog post</p>
                                </div>
                                <Button size="sm" onClick={newPost} className="gap-1.5 text-xs">
                                    <Plus className="w-3.5 h-3.5" />
                                    New post
                                </Button>
                            </div>
                        ) : (
                            <div className="grid gap-1">
                                {posts.map(post => (
                                    <div key={post.id} className="group relative">
                                        <PostListItem
                                            post={post}
                                            isActive={activeId === post.id}
                                            onSelect={() => openPost(post)}
                                        />
                                        {/* Delete button — appears on hover */}
                                        <button
                                            onClick={() => setDeleteTarget(post)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── View: Editor ── */}
            {view === 'editor' && (
                <div className="flex flex-col h-full overflow-hidden">

                    {/* Editor toolbar */}
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-background shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <button
                                onClick={() => setView('list')}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Posts
                            </button>
                            <span className="text-muted-foreground/40">/</span>
                            <span className="text-xs font-medium truncate">
                                {form.title || 'New post'}
                            </span>
                        </div>

                        {/* Write / Preview tabs */}
                        <div className="flex items-center bg-muted rounded-md p-0.5 shrink-0">
                            <button
                                onClick={() => setEditorTab('write')}
                                className={cn(
                                    'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors',
                                    editorTab === 'write'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <Edit3 className="w-3 h-3" />
                                Write
                            </button>
                            <button
                                onClick={() => setEditorTab('preview')}
                                className={cn(
                                    'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors',
                                    editorTab === 'preview'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <Eye className="w-3 h-3" />
                                Preview
                            </button>
                        </div>

                        {/* Save actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            {form.is_published ? (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-7 gap-1"
                                        onClick={() => handleSave(false)}
                                        disabled={saving}
                                    >
                                        <Lock className="w-3 h-3" />
                                        Unpublish
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="text-xs h-7 gap-1"
                                        onClick={() => handleSave()}
                                        disabled={saving}
                                    >
                                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                        Save
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-7 gap-1"
                                        onClick={() => handleSave(false)}
                                        disabled={saving}
                                    >
                                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                        Save draft
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="text-xs h-7 gap-1 bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => handleSave(true)}
                                        disabled={saving}
                                    >
                                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                                        Publish
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Editor body: two columns on large, stacked on small */}
                    <div className="flex flex-1 overflow-hidden">

                        {/* ── Left: content area ── */}
                        <div className="flex-1 flex flex-col min-w-0 overflow-hidden border-r border-border">
                            {/* Title */}
                            <div className="px-6 pt-5 pb-3 border-b border-border/50">
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Post title…"
                                    className="w-full text-2xl font-semibold bg-transparent outline-none placeholder:text-muted-foreground/40 text-foreground"
                                />
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs text-muted-foreground">slug:</span>
                                    <input
                                        type="text"
                                        value={form.slug}
                                        onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                                        className="text-xs text-muted-foreground bg-transparent outline-none border-b border-dashed border-muted-foreground/30 focus:border-muted-foreground px-0 flex-1 max-w-xs font-mono"
                                        placeholder="post-slug"
                                    />
                                    <Clock className="w-3 h-3 text-muted-foreground/50" />
                                    <span className="text-xs text-muted-foreground/50">{form.reading_time_minutes} min read</span>
                                </div>
                            </div>

                            {/* Write / Preview */}
                            <div className="flex-1 overflow-hidden">
                                {editorTab === 'write' ? (
                                    <div className="h-full">
                                        <MarkdownEditor
                                            value={form.content}
                                            onChange={setContent}
                                        />
                                    </div>
                                ) : (
                                    <div className="h-full overflow-auto">
                                        <MarkdownPreview content={form.content} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Right: metadata sidebar ── */}
                        <div className="w-72 xl:w-80 shrink-0 overflow-y-auto border-l border-border hidden md:flex flex-col">
                            <div className="px-4 py-4 space-y-5">

                                {/* Status badge */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</span>
                                    <Badge variant={form.is_published ? 'default' : 'secondary'} className="text-[11px]">
                                        {form.is_published ? 'Published' : 'Draft'}
                                    </Badge>
                                </div>

                                <div className="h-px bg-border" />

                                {/* Author */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <User className="w-3 h-3" />Author
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={form.author_id || NO_AUTHOR}
                                            onValueChange={v => setForm(f => ({ ...f, author_id: v === NO_AUTHOR ? '' : v }))}
                                        >
                                            <SelectTrigger className="h-8 text-xs flex-1">
                                                <SelectValue placeholder="No author" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={NO_AUTHOR} className="text-xs">No author</SelectItem>
                                                {authors.map(a => (
                                                    <SelectItem key={a.id} value={a.id} className="text-xs">
                                                        {a.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <button
                                            onClick={() => setAuthorDialog(true)}
                                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
                                            title="New author"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Excerpt */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Excerpt</Label>
                                    <Textarea
                                        value={form.excerpt}
                                        onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                                        placeholder="Short summary shown in the post list…"
                                        rows={3}
                                        className="text-xs resize-none"
                                    />
                                </div>

                                {/* Cover image */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Cover image URL</Label>
                                    <Input
                                        value={form.cover_image}
                                        onChange={e => setForm(f => ({ ...f, cover_image: e.target.value }))}
                                        placeholder="https://…"
                                        className="text-xs h-8"
                                    />
                                    {form.cover_image && (
                                        <div className="relative aspect-video overflow-hidden rounded-md border border-border mt-1.5">
                                            <img
                                                src={form.cover_image}
                                                alt=""
                                                className="w-full h-full object-cover"
                                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Tags */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <Tag className="w-3 h-3" />Tags
                                    </Label>
                                    <Input
                                        value={form.tags}
                                        onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                                        placeholder="style, hair care, tips"
                                        className="text-xs h-8"
                                    />
                                    <p className="text-[10px] text-muted-foreground">Comma-separated</p>
                                    {form.tags && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                                                <span key={t} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Featured toggle */}
                                <div className="flex items-center justify-between py-1">
                                    <div>
                                        <p className="text-xs font-medium">Featured</p>
                                        <p className="text-[10px] text-muted-foreground">Pin to top of journal</p>
                                    </div>
                                    <button
                                        onClick={() => setForm(f => ({
                                            ...f,
                                            // Store featured in metadata — matches BlogPost.metadata.featured
                                        }))}
                                        className="text-xs text-muted-foreground"
                                    >
                                        {/* Replace with your Switch component if available */}
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 accent-primary cursor-pointer"
                                            checked={!!(form as any).metadata?.featured}
                                            onChange={e => setForm(f => ({
                                                ...f,
                                                metadata: { ...((f as any).metadata ?? {}), featured: e.target.checked },
                                            } as any))}
                                        />
                                    </button>
                                </div>

                                <div className="h-px bg-border" />

                                {/* Danger zone */}
                                {form.id && (
                                    <div>
                                        <button
                                            onClick={() => {
                                                const post = posts.find(p => p.id === form.id)
                                                if (post) setDeleteTarget(post)
                                            }}
                                            className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Delete this post
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Author dialog ── */}
            <AuthorDialog
                open={authorDialog}
                onClose={() => setAuthorDialog(false)}
                onSaved={handleAuthorSaved}
                storeId={storeId}
            />

            {/* ── Delete confirm ── */}
            <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete post?</AlertDialogTitle>
                        <AlertDialogDescription>
                            &ldquo;{deleteTarget?.title || 'This post'}&rdquo; will be permanently deleted. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Toast ── */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onDismiss={() => setToast(null)}
                />
            )}
        </div>
    )
}