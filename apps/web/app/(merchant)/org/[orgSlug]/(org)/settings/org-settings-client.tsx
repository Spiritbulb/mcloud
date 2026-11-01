'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar } from '@mcloud/ui/kit/avatar'
import { Button } from '@mcloud/ui/kit/button'
import { ConfirmDialog } from '@mcloud/ui/kit/confirm-dialog'
import { Field, FormGrid, TextInput } from '@mcloud/ui/kit/form'
import { Notice } from '@mcloud/ui/kit/notice'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { SaveBar, SaveStatus } from '@mcloud/ui/kit/save-bar'
import { isDirty } from '@mcloud/ui/kit/ui-logic'
import { updateOrg, deleteOrg } from '@/app/(merchant)/org/actions'

interface Org {
    id: string
    name: string
    slug: string
    logo_url: string | null
    icon_url: string | null
}

export default function OrgSettingsClient({ org, isOwner, storeCount }: {
    org: Org
    isOwner: boolean
    storeCount: number
}) {
    const router = useRouter()
    const saved = { name: org.name, slug: org.slug, logoUrl: org.logo_url ?? '', iconUrl: org.icon_url ?? '' }
    const [draft, setDraft] = useState(saved)
    const [error, setError] = useState<string | null>(null)
    const [justSaved, setJustSaved] = useState(false)
    const [saving, startSave] = useTransition()
    const [deleteOpen, setDeleteOpen] = useState(false)

    const dirty = isDirty(saved, draft)
    const sites = `${storeCount} ${storeCount === 1 ? 'site' : 'sites'}`

    const save = () => {
        setError(null); setJustSaved(false)
        startSave(async () => {
            const res = await updateOrg(org.id, { name: draft.name, slug: draft.slug, logo_url: draft.logoUrl.trim() || null, icon_url: draft.iconUrl.trim() || null })
            if (res.error) { setError(res.error); return }
            setJustSaved(true)
            setTimeout(() => setJustSaved(false), 2000)
            if (res.slug && res.slug !== org.slug) router.replace(`/org/${res.slug}/settings`)
            else router.refresh()
        })
    }

    return (
        <div className="space-y-6">
            <PageHeader title="Settings" description="How this organization appears across mcloud." />

            <Panel title="General">
                <div className="space-y-4">
                    <FormGrid>
                        <Field label="Name">
                            <TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                        </Field>
                        <Field label="Slug" hint="Used in the organization URL.">
                            <TextInput value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
                        </Field>
                        <Field label="Logo URL" hint="Your full logo, any shape." className="sm:col-span-2">
                            <TextInput value={draft.logoUrl} placeholder="https://…" onChange={(e) => setDraft({ ...draft, logoUrl: e.target.value })} />
                        </Field>
                        <Field label="Square icon URL" hint="Shown in small square spots like the sidebar. Leave empty to use the logo." className="sm:col-span-2">
                            <div className="flex items-center gap-3">
                                <Avatar name={draft.name} src={draft.iconUrl.trim() || draft.logoUrl.trim() || null} />
                                <TextInput value={draft.iconUrl} placeholder="https://…" onChange={(e) => setDraft({ ...draft, iconUrl: e.target.value })} />
                            </div>
                        </Field>
                    </FormGrid>
                    {error && <Notice tone="error">{error}</Notice>}
                </div>
                <SaveBar dirty={dirty} saving={saving} onSave={save} onDiscard={() => { setDraft(saved); setError(null) }} />
            </Panel>

            {isOwner && (
                <Panel title="Delete organization" footer={<Button variant="danger" onClick={() => setDeleteOpen(true)}>Delete organization</Button>}>
                    <p className="text-[13px] text-muted-foreground">
                        {storeCount > 0
                            ? `Its ${sites} will be moved to Personal, and the organization is deleted permanently.`
                            : 'This organization has no stores. Deleting it is permanent.'}
                    </p>
                </Panel>
            )}

            <DeleteOrgDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} org={org} sites={storeCount > 0 ? sites : null} />
            <SaveStatus saving={false} saved={justSaved && !dirty} />
        </div>
    )
}

function DeleteOrgDialog({ open, onClose, org, sites }: { open: boolean; onClose: () => void; org: Org; sites: string | null }) {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [pending, start] = useTransition()

    const confirm = () => {
        setError(null)
        start(async () => {
            const res = await deleteOrg(org.id)
            if (res.error) { setError(res.error); return }
            router.push(res.next ?? '/org/onboarding')
        })
    }

    return (
        <ConfirmDialog
            open={open}
            title={`Delete ${org.name}?`}
            description={
                sites
                    ? `The ${sites} in this organization will be moved to Personal. The organization itself is deleted permanently.`
                    : "This organization will be deleted permanently. This can't be undone."
            }
            confirmLabel="Delete organization"
            busy={pending}
            onConfirm={confirm}
            onCancel={onClose}
        >
            {error && <Notice tone="error">{error}</Notice>}
        </ConfirmDialog>
    )
}
