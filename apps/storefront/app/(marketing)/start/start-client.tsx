'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { Check, HeartHandshake, Loader2, ShoppingBag } from 'lucide-react'
import { storefrontDisplayUrl, storefrontUrl } from '@mcloud/merchant/storefront-url'
import { cn } from '@mcloud/ui/utils'
import { checkSlug, launchStore } from './actions'
import { launchProblem, nextSlug, type SiteType } from './onboarding-logic'

const TYPES: { id: SiteType; title: string; body: string; icon: typeof ShoppingBag }[] = [
    { id: 'shop', title: 'A shop', body: 'Sell products or services and take orders with M-PESA.', icon: ShoppingBag },
    { id: 'ngo', title: 'An NGO or cause', body: 'Share your mission, programs and impact, and take donations.', icon: HeartHandshake },
]

type Availability = 'idle' | 'checking' | 'ok' | { reason: string }
type Checked = { slug: string; result: 'ok' | { reason: string } }

export default function StartClient({ firstName }: { firstName: string | null }) {
    const [type, setType] = useState<SiteType | null>(null)
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [touched, setTouched] = useState(false)
    const [checked, setChecked] = useState<Checked | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState<{ orgSlug: string; storeSlug: string } | null>(null)
    const [pending, start] = useTransition()

    const problem = launchProblem({ type: type ?? '', name, slug })

    // Availability is derived: nothing typed is idle, and an address with no result yet is
    // still being checked.
    const availability: Availability = !slug ? 'idle' : checked?.slug === slug ? checked.result : 'checking'

    // Check the address once the person stops typing. The cleanup cancels the stale one.
    useEffect(() => {
        if (!slug) return
        let cancelled = false
        const t = setTimeout(async () => {
            const res = await checkSlug(slug).catch(() => ({ ok: false as const, reason: 'Could not check that address' }))
            if (!cancelled) setChecked({ slug, result: res.ok ? 'ok' : { reason: res.reason } })
        }, 350)
        return () => { cancelled = true; clearTimeout(t) }
    }, [slug])

    const canSubmit = !problem && availability === 'ok' && !pending

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSubmit || !type) return
        setError(null)
        start(async () => {
            try {
                const res = await launchStore({ type, name, slug })
                if (!res.ok) setError(res.error)
                else setDone({ orgSlug: res.orgSlug, storeSlug: res.storeSlug })
            } catch {
                setError('Something went wrong. Please try again.')
            }
        })
    }

    if (done) {
        const base = `/org/${done.orgSlug}/${done.storeSlug}/settings`
        return (
            <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
                <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-5" aria-hidden />
                </div>
                <h1 className="text-3xl font-semibold tracking-tight">Your site is live</h1>
                <p className="mt-2 text-muted-foreground">
                    Share it now, or make it yours first. It is at{' '}
                    <a className="font-medium text-foreground underline underline-offset-4" href={storefrontUrl(done.storeSlug)}>
                        {storefrontDisplayUrl(done.storeSlug)}
                    </a>
                    .
                </p>
                <ol className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
                    <NextStep href={`${base}/editor`} title="Design your site" body="Set your brand and arrange your sections with a live preview." />
                    <NextStep
                        href={`${base}/${type === 'ngo' ? 'content' : 'products'}`}
                        title={type === 'ngo' ? 'Add your programs and campaigns' : 'Add your first products'}
                        body={type === 'ngo' ? 'Tell visitors what you do and how to give.' : 'List what you sell so customers can order.'}
                    />
                    <NextStep href={`${base}/integrations/payments`} title="Connect M-PESA" body="Be ready to get paid the moment someone orders or donates." />
                </ol>
                <Link href={base} className="mt-6 inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
                    Skip to my dashboard
                </Link>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
            <h1 className="text-3xl font-semibold tracking-tight">
                {firstName ? `Welcome, ${firstName}.` : 'Welcome.'} Let&rsquo;s create your site.
            </h1>
            <p className="mt-2 text-muted-foreground">Two quick questions. You can change everything later.</p>

            <form onSubmit={submit} className="mt-8 space-y-8">
                <fieldset>
                    <legend className="mb-3 text-sm font-medium">What are you building?</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {TYPES.map(({ id, title, body, icon: Icon }) => (
                            <button
                                key={id}
                                type="button"
                                aria-pressed={type === id}
                                onClick={() => setType(id)}
                                className={cn(
                                    'rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-muted',
                                    type === id ? 'border-primary ring-2 ring-primary/20' : 'border-border',
                                )}
                            >
                                <Icon className="mb-2 size-5 text-primary" aria-hidden />
                                <span className="block font-medium">{title}</span>
                                <span className="mt-1 block text-sm text-muted-foreground">{body}</span>
                            </button>
                        ))}
                    </div>
                </fieldset>

                <div className="space-y-5">
                    <div>
                        <label htmlFor="site-name" className="mb-1.5 block text-sm font-medium">Site name</label>
                        <input
                            id="site-name"
                            value={name}
                            maxLength={60}
                            placeholder={type === 'ngo' ? 'e.g. Hope Community Trust' : 'e.g. Wanjiru Crafts'}
                            onChange={(e) => {
                                setName(e.target.value)
                                setSlug((s) => nextSlug(e.target.value, s, touched))
                            }}
                            className="h-11 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <div>
                        <label htmlFor="site-slug" className="mb-1.5 block text-sm font-medium">Site address</label>
                        <div className="flex items-center rounded-md border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                            <span className="pl-3 text-sm text-muted-foreground">{storefrontDisplayUrl('').replace(/\/$/, '')}/</span>
                            <input
                                id="site-slug"
                                value={slug}
                                maxLength={40}
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                onChange={(e) => {
                                    setTouched(true)
                                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                                }}
                                className="h-11 min-w-0 flex-1 bg-transparent px-1 outline-none"
                            />
                        </div>
                        <p className="mt-1.5 min-h-5 text-sm" aria-live="polite">
                            {availability === 'checking' && (
                                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                    <Loader2 className="size-3.5 animate-spin" aria-hidden /> Checking&hellip;
                                </span>
                            )}
                            {availability === 'ok' && <span className="text-primary">That address is available</span>}
                            {typeof availability === 'object' && <span className="text-destructive">{availability.reason}</span>}
                        </p>
                    </div>
                </div>

                {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                    {pending ? 'Creating your site…' : 'Create my site'}
                </button>
            </form>
        </div>
    )
}

function NextStep({ href, title, body }: { href: string; title: string; body: string }) {
    return (
        <li>
            <Link href={href} className="block p-4 hover:bg-muted">
                <span className="block font-medium">{title}</span>
                <span className="block text-sm text-muted-foreground">{body}</span>
            </Link>
        </li>
    )
}
