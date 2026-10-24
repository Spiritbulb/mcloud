'use client'

import { useState } from 'react'
import { Badge, Status } from '@mcloud/ui/kit/badge'
import { Button } from '@mcloud/ui/kit/button'
import { ConfirmDialog } from '@mcloud/ui/kit/confirm-dialog'
import { EmptyState } from '@mcloud/ui/kit/empty-state'
import { FeatureGate } from '@mcloud/ui/kit/feature-gate'
import { Field, FormGrid, Select, Switch, TextArea, TextInput } from '@mcloud/ui/kit/form'
import { LoadError } from '@mcloud/ui/kit/load-error'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { SaveBar, SaveStatus } from '@mcloud/ui/kit/save-bar'
import { SkeletonLines, SkeletonRows, Spinner } from '@mcloud/ui/kit/skeleton'
import { Stat, StatStrip } from '@mcloud/ui/kit/stat-strip'
import { Table, Td, Th, Tr } from '@mcloud/ui/kit/table'
import { Tabs } from '@mcloud/ui/kit/tabs'
import { isDirty } from '@mcloud/ui/kit/ui-logic'

const SAVED = { name: 'Reach', description: '', currency: 'KES', active: true }

export default function KitGallery() {
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState('all')
    const [draft, setDraft] = useState(SAVED)
    const [saved, setSaved] = useState(SAVED)
    const [saving, setSaving] = useState(false)
    const [justSaved, setJustSaved] = useState(false)
    const [confirm, setConfirm] = useState(false)

    const save = () => {
        setSaving(true)
        setTimeout(() => {
            setSaved(draft)
            setSaving(false)
            setJustSaved(true)
            setTimeout(() => setJustSaved(false), 1500)
        }, 800)
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <PageHeader
                title="UI kit"
                description="@mcloud/ui/kit: shared by the admin, the org hub and store settings."
                actions={<Button onClick={() => setLoading((l) => !l)}>{loading ? 'Show data' : 'Show loading'}</Button>}
            />

            <StatStrip className="grid-cols-2 md:grid-cols-4">
                <Stat label="Total orders" value="4" loading={loading} />
                <Stat label="Pending" value="2" loading={loading} />
                <Stat label="Paid" value="2" loading={loading} />
                <Stat label="Revenue" value="KES 521" current={521} previous={400} loading={loading} />
            </StatStrip>

            <Tabs
                label="Order status"
                value={tab}
                onChange={setTab}
                items={[
                    { id: 'all', label: 'All', count: 4 },
                    { id: 'pending', label: 'Pending', count: 2 },
                    { id: 'paid', label: 'Paid', count: 2 },
                    { id: 'cancelled', label: 'Cancelled' },
                ]}
            />

            <Panel title="Orders" description="Table with built-in loading rows" flush>
                <Table busy={loading}>
                    <thead>
                        <tr>
                            <Th>Order</Th>
                            <Th>Status</Th>
                            <Th>Placed</Th>
                            <Th align="right">Total</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <SkeletonRows columns={4} rows={3} />
                        ) : (
                            <>
                                <Tr><Td>#RCH-MVAOKAQO</Td><Td label="Status"><Status tone="warning">Pending</Status></Td><Td label="Placed" muted>16 Oct</Td><Td label="Total" align="right">KES 4</Td></Tr>
                                <Tr><Td>#RCH-MUNQ325D <Badge tone="info">Featured</Badge></Td><Td label="Status"><Status tone="success">Paid</Status></Td><Td label="Placed" muted>30 Sept</Td><Td label="Total" align="right">KES 141</Td></Tr>
                            </>
                        )}
                    </tbody>
                </Table>
            </Panel>

            <div className="grid gap-6 md:grid-cols-3">
                <Panel title="Loading"><SkeletonLines lines={4} /></Panel>
                <Panel title="Error" flush><LoadError message="The server took too long to respond." onRetry={() => setLoading(true)} /></Panel>
                <Panel title="Empty" flush><EmptyState icon="receipt_long" title="No orders yet" description="Orders appear here as soon as a customer checks out." /></Panel>
            </div>

            <Panel title="Store identity" description="Basic information shown to your customers">
                <div className="space-y-4">
                    <FormGrid>
                        <Field label="Site name">
                            <TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                        </Field>
                        <Field label="Site URL" hint="Set when the store was created.">
                            <TextInput value="app.mcloud.co.ke/reach" disabled readOnly />
                        </Field>
                        <Field label="Description" className="sm:col-span-2" error={draft.description.length > 160 ? 'Keep it under 160 characters.' : undefined}>
                            <TextArea value={draft.description} placeholder="Tell customers what you sell…" invalid={draft.description.length > 160} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                        </Field>
                        <Field label="Currency">
                            <Select value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })}>
                                <option value="KES">KES: Kenyan shilling</option>
                                <option value="USD">USD: US dollar</option>
                            </Select>
                        </Field>
                    </FormGrid>
                    <Switch label="Site active" description="When off, visitors see a coming soon page." checked={draft.active} onChange={(active) => setDraft({ ...draft, active })} />
                </div>
                <SaveBar dirty={isDirty(saved, draft)} saving={saving} onSave={save} onDiscard={() => setDraft(saved)} />
            </Panel>

            <div className="grid gap-6 md:grid-cols-2">
                <Panel
                    title="Danger zone"
                    footer={<Button variant="danger" onClick={() => setConfirm(true)}>Delete organization</Button>}
                >
                    <p className="text-[13px] text-muted-foreground">Its 7 sites will be moved to Personal.</p>
                </Panel>
                <FeatureGate title="Blog is on its way" description="This feature isn't available yet. Check back soon." icon="schedule" />
            </div>

            <p className="flex items-center gap-2 text-[12px] text-muted-foreground"><Spinner /> Inline spinner</p>

            <ConfirmDialog
                open={confirm}
                title="Delete Spiritbulb?"
                description="Its 7 sites move to Personal. This cannot be undone."
                confirmLabel="Delete organization"
                onCancel={() => setConfirm(false)}
                onConfirm={() => setConfirm(false)}
            />
            <SaveStatus saving={false} saved={justSaved} />
        </div>
    )
}
