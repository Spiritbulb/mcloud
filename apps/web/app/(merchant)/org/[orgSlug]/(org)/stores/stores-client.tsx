'use client'

import { storefrontDisplayUrl } from '@mcloud/merchant/storefront-url'
import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@mcloud/ui/kit/avatar'
import { Button, buttonClass } from '@mcloud/ui/kit/button'
import { ConfirmDialog } from '@mcloud/ui/kit/confirm-dialog'
import { EmptyState } from '@mcloud/ui/kit/empty-state'
import { Field, TextInput } from '@mcloud/ui/kit/form'
import { Icon } from '@mcloud/ui/kit/icon'
import { Notice } from '@mcloud/ui/kit/notice'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { Table, Td, Th, Tr } from '@mcloud/ui/kit/table'
import { PlanBadge } from '../plan-badge'
import { createStore, deleteStore } from './actions'

type Store = {
    id: string
    name: string
    slug: string
    logo_url: string | null
    is_pro: boolean
    plan?: string
    created_at: string
}

interface Props {
    orgId: string
    orgSlug: string
    stores: Store[]
    role: string | null
}

/** "My Awesome Store" -> "my-awesome-store". */
function slugify(v: string) {
    return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function CreateStoreDialog({ orgId, orgSlug, onClose }: { orgId: string; orgSlug: string; onClose: () => void }) {
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isPending, start] = useTransition()
    const router = useRouter()

    const submit = () => {
        if (!name || !slug || isPending) return
        setError(null)
        const fd = new FormData()
        fd.append('orgId', orgId)
        fd.append('orgSlug', orgSlug)
        fd.append('name', name)
        fd.append('slug', slug)
        start(async () => {
            const res = await createStore(fd)
            if (res.error) { setError(res.error); return }
            router.push(`/org/${orgSlug}/${res.slug}/settings`)
        })
    }

    return (
        <ConfirmDialog
            open
            tone="primary"
            title="Create store"
            confirmLabel="Create store"
            busy={isPending}
            onConfirm={submit}
            onCancel={onClose}
        >
            <form onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-4">
                <Field label="Store name">
                    <TextInput autoFocus value={name} required placeholder="My Awesome Store" onChange={(e) => { setName(e.target.value); setSlug(slugify(e.target.value)) }} />
                </Field>
                <Field label="Address" hint={storefrontDisplayUrl(slug || '…')}>
                    <TextInput value={slug} required placeholder="my-awesome-store" onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
                </Field>
                {error && <Notice tone="error">{error}</Notice>}
                {/* Enter submits; the dialog's own button does the same. */}
                <button type="submit" hidden />
            </form>
        </ConfirmDialog>
    )
}

function DeleteStoreDialog({ store, orgSlug, onDeleted, onClose }: { store: Store; orgSlug: string; onDeleted: (id: string) => void; onClose: () => void }) {
    const [isPending, start] = useTransition()
    const [error, setError] = useState<string | null>(null)

    const confirm = () => {
        start(async () => {
            const res = await deleteStore(store.id, orgSlug)
            if (res.error) { setError(res.error); return }
            onDeleted(store.id)
            onClose()
        })
    }

    return (
        <ConfirmDialog
            open
            title={`Delete ${store.name}?`}
            description="This permanently deletes the store and all its data. It cannot be undone."
            confirmLabel="Delete store"
            busy={isPending}
            onConfirm={confirm}
            onCancel={onClose}
        >
            {error && <Notice tone="error">{error}</Notice>}
        </ConfirmDialog>
    )
}

export default function StoresClient({ orgId, orgSlug, stores: initial, role }: Props) {
    const canManage = role === 'owner' || role === 'admin'
    const canDelete = role === 'owner'

    // The org overview's "New store" deep-links straight into the create flow (?new=1).
    const searchParams = useSearchParams()
    const [stores, setStores] = useState<Store[]>(initial)
    const [createOpen, setCreateOpen] = useState(() => canManage && searchParams.get('new') === '1')
    const [deleteTarget, setDeleteTarget] = useState<Store | null>(null)

    const newStore = canManage && (
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Icon name="add" size={16} />
            New store
        </Button>
    )

    return (
        <div className="space-y-6">
            <PageHeader
                title="Stores"
                description={`${stores.length} ${stores.length === 1 ? 'store' : 'stores'} in this organization`}
                actions={newStore}
            />

            <Panel flush>
                {stores.length === 0 ? (
                    <EmptyState
                        icon="storefront"
                        title="No stores yet"
                        description="A store is a site with its own products, orders and domain."
                        action={canManage && <Button variant="primary" onClick={() => setCreateOpen(true)}>Create your first store</Button>}
                    />
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>Store</Th>
                                <Th>Plan</Th>
                                <Th align="right"><span className="sr-only">Actions</span></Th>
                            </tr>
                        </thead>
                        <tbody>
                            {stores.map((store) => (
                                <Tr key={store.id}>
                                    <Td>
                                        <div className="flex items-center gap-3">
                                            <Avatar name={store.name} src={store.logo_url} />
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">{store.name}</p>
                                                <p className="truncate text-[12px] text-muted-foreground">{storefrontDisplayUrl(store.slug)}</p>
                                            </div>
                                        </div>
                                    </Td>
                                    <Td label="Plan">
                                        <PlanBadge plan={store.plan ?? (store.is_pro ? 'pro' : 'free')} />
                                    </Td>
                                    <Td align="right" label="Actions">
                                        <div className="inline-flex items-center gap-1.5">
                                            <Link href={`/org/${orgSlug}/${store.slug}/settings`} className={buttonClass('secondary', 'sm')}>
                                                <Icon name="settings" size={14} />
                                                Manage
                                            </Link>
                                            {canDelete && (
                                                <Button variant="ghost" size="sm" aria-label={`Delete ${store.name}`} onClick={() => setDeleteTarget(store)}>
                                                    <Icon name="delete" size={15} />
                                                </Button>
                                            )}
                                        </div>
                                    </Td>
                                </Tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Panel>

            {createOpen && <CreateStoreDialog orgId={orgId} orgSlug={orgSlug} onClose={() => setCreateOpen(false)} />}

            {deleteTarget && (
                <DeleteStoreDialog
                    store={deleteTarget}
                    orgSlug={orgSlug}
                    onDeleted={(id) => setStores((prev) => prev.filter((s) => s.id !== id))}
                    onClose={() => setDeleteTarget(null)}
                />
            )}
        </div>
    )
}
