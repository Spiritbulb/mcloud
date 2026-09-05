// apps/web/app/org/[orgSlug]/servers/servers-table.tsx
'use client'

import { useEffect, useState } from 'react'
import { cn } from '@mcloud/ui/utils'

type ServerRow = { uuid: string; title: string; zone: string; plan: string; state: string }
type ServerDetail = ServerRow & {
    hostname: string
    ip_addresses?: { ip_address: { address: string; family: string; access: string }[] }
}

const STATE_STYLES: Record<string, string> = {
    started: 'bg-green-100 text-green-700',
    stopped: 'bg-neutral-200 text-neutral-600',
    maintenance: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
}

function MSO({ icon, className }: { icon: string; className?: string }) {
    return (
        <span className={cn('material-symbols-outlined select-none leading-none', className)}>
            {icon}
        </span>
    )
}

function publicIp(server: ServerDetail | null) {
    return server?.ip_addresses?.ip_address.find((ip) => ip.access === 'public' && ip.family === 'IPv4')?.address
}

export default function ServersTable({
    orgSlug,
    servers,
    canManage,
}: {
    orgSlug: string
    servers: ServerRow[]
    canManage: boolean
}) {
    const [openUuid, setOpenUuid] = useState<string | null>(null)
    const [detail, setDetail] = useState<ServerDetail | null>(null)
    const [loadingDetail, setLoadingDetail] = useState(false)
    const [detailError, setDetailError] = useState('')
    const [actionPending, setActionPending] = useState(false)
    const [actionError, setActionError] = useState('')
    const [renaming, setRenaming] = useState(false)
    const [renameValue, setRenameValue] = useState('')
    const [confirmingDelete, setConfirmingDelete] = useState(false)

    const openRow = servers.find((s) => s.uuid === openUuid) ?? null

    useEffect(() => {
        if (!openUuid) return
        setDetail(null)
        setDetailError('')
        setActionError('')
        setLoadingDetail(true)
        fetch(`/api/org/${orgSlug}/servers/${openUuid}`)
            .then(async (res) => {
                const data = await res.json()
                if (!res.ok) throw new Error(data.error ?? 'Failed to load server')
                setDetail(data.server)
                setRenameValue(data.server.title)
            })
            .catch((e) => setDetailError(e instanceof Error ? e.message : 'Failed to load server'))
            .finally(() => setLoadingDetail(false))
    }, [openUuid, orgSlug])

    function closeDrawer() {
        setOpenUuid(null)
        setDetail(null)
        setRenaming(false)
        setConfirmingDelete(false)
    }

    async function runAction(action: 'start' | 'stop' | 'restart', hard = false) {
        if (!openUuid) return
        setActionPending(true)
        setActionError('')
        try {
            const res = await fetch(`/api/org/${orgSlug}/servers/${openUuid}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, hard }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Action failed')
            setDetail((prev) => (prev ? { ...prev, state: data.server.state } : prev))
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Action failed')
        } finally {
            setActionPending(false)
        }
    }

    async function submitRename() {
        if (!openUuid || !renameValue.trim()) return
        setActionPending(true)
        setActionError('')
        try {
            const res = await fetch(`/api/org/${orgSlug}/servers/${openUuid}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: renameValue.trim() }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Rename failed')
            setDetail((prev) => (prev ? { ...prev, title: data.server.title } : prev))
            setRenaming(false)
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Rename failed')
        } finally {
            setActionPending(false)
        }
    }

    async function submitDelete() {
        if (!openUuid) return
        setActionPending(true)
        setActionError('')
        try {
            const res = await fetch(`/api/org/${orgSlug}/servers/${openUuid}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Delete failed')
            closeDrawer()
            window.location.reload() // simplest way to refresh the server-rendered list
        } catch (e) {
            setActionError(e instanceof Error ? e.message : 'Delete failed')
            setActionPending(false)
        }
    }

    return (
        <>
            <div className="overflow-hidden rounded-xl border border-[var(--md-sys-color-outline-variant)]">
                <table className="w-full text-sm">
                    <thead className="bg-[var(--md-sys-color-surface-variant)] text-left text-xs uppercase text-[var(--md-sys-color-on-surface-variant)]">
                        <tr>
                            <th className="px-4 py-2 font-medium">Title</th>
                            <th className="px-4 py-2 font-medium">Zone</th>
                            <th className="px-4 py-2 font-medium">Plan</th>
                            <th className="px-4 py-2 font-medium">State</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--md-sys-color-outline-variant)]/50">
                        {servers.map((s) => (
                            <tr
                                key={s.uuid}
                                onClick={() => setOpenUuid(s.uuid)}
                                className="cursor-pointer hover:bg-[var(--md-sys-color-surface-variant)] transition-colors"
                            >
                                <td className="px-4 py-3 font-medium text-[var(--md-sys-color-on-surface)]">{s.title}</td>
                                <td className="px-4 py-3 text-[var(--md-sys-color-on-surface-variant)]">{s.zone}</td>
                                <td className="px-4 py-3 text-[var(--md-sys-color-on-surface-variant)]">{s.plan}</td>
                                <td className="px-4 py-3">
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATE_STYLES[s.state] ?? 'bg-neutral-100 text-neutral-600'}`}>
                                        {s.state}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Drawer */}
            {openUuid && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
                    <div className="relative w-full max-w-md h-full bg-[var(--md-sys-color-surface)] shadow-xl overflow-y-auto p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-[var(--md-sys-color-on-surface)]">
                                {openRow?.title}
                            </h2>
                            <button onClick={closeDrawer} className="text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]">
                                <MSO icon="close" className="text-[20px]" />
                            </button>
                        </div>

                        {loadingDetail && (
                            <p className="text-[13px] text-[var(--md-sys-color-on-surface-variant)]">Loading…</p>
                        )}
                        {detailError && <p className="text-[13px] text-red-600">{detailError}</p>}

                        {detail && (
                            <>
                                <div className="space-y-3 text-[13px]">
                                    <div className="flex justify-between">
                                        <span className="text-[var(--md-sys-color-on-surface-variant)]">State</span>
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATE_STYLES[detail.state] ?? 'bg-neutral-100 text-neutral-600'}`}>
                                            {detail.state}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--md-sys-color-on-surface-variant)]">Zone</span>
                                        <span className="text-[var(--md-sys-color-on-surface)]">{detail.zone}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--md-sys-color-on-surface-variant)]">Plan</span>
                                        <span className="text-[var(--md-sys-color-on-surface)]">{detail.plan}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--md-sys-color-on-surface-variant)]">Hostname</span>
                                        <span className="text-[var(--md-sys-color-on-surface)]">{detail.hostname}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--md-sys-color-on-surface-variant)]">Public IPv4</span>
                                        <span className="text-[var(--md-sys-color-on-surface)] font-mono">{publicIp(detail) ?? '—'}</span>
                                    </div>
                                </div>

                                {canManage && (
                                    <div className="space-y-4 border-t border-[var(--md-sys-color-outline-variant)] pt-4">
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => runAction('start')}
                                                disabled={actionPending || detail.state === 'started'}
                                                className="flex items-center gap-1.5 h-8 px-3 rounded-full border border-[var(--md-sys-color-outline-variant)] text-[12px] disabled:opacity-40 hover:bg-[var(--md-sys-color-surface-variant)] transition-colors"
                                            >
                                                <MSO icon="play_arrow" className="text-[14px]" /> Start
                                            </button>
                                            <button
                                                onClick={() => runAction('stop')}
                                                disabled={actionPending || detail.state === 'stopped'}
                                                className="flex items-center gap-1.5 h-8 px-3 rounded-full border border-[var(--md-sys-color-outline-variant)] text-[12px] disabled:opacity-40 hover:bg-[var(--md-sys-color-surface-variant)] transition-colors"
                                            >
                                                <MSO icon="stop" className="text-[14px]" /> Stop
                                            </button>
                                            <button
                                                onClick={() => runAction('restart')}
                                                disabled={actionPending || detail.state !== 'started'}
                                                className="flex items-center gap-1.5 h-8 px-3 rounded-full border border-[var(--md-sys-color-outline-variant)] text-[12px] disabled:opacity-40 hover:bg-[var(--md-sys-color-surface-variant)] transition-colors"
                                            >
                                                <MSO icon="restart_alt" className="text-[14px]" /> Restart
                                            </button>
                                        </div>

                                        {!renaming ? (
                                            <button
                                                onClick={() => setRenaming(true)}
                                                className="flex items-center gap-1.5 text-[12px] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]"
                                            >
                                                <MSO icon="edit" className="text-[14px]" /> Rename
                                            </button>
                                        ) : (
                                            <div className="flex gap-2">
                                                <input
                                                    value={renameValue}
                                                    onChange={(e) => setRenameValue(e.target.value)}
                                                    className="flex-1 rounded-md border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--md-sys-color-primary)]"
                                                />
                                                <button
                                                    onClick={submitRename}
                                                    disabled={actionPending}
                                                    className="rounded-md bg-[var(--md-sys-color-primary)] px-3 text-[12px] font-medium text-[var(--md-sys-color-on-primary)] disabled:opacity-40"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => { setRenaming(false); setRenameValue(detail.title) }}
                                                    className="text-[12px] text-[var(--md-sys-color-on-surface-variant)]"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}

                                        <div className="border-t border-[var(--md-sys-color-outline-variant)] pt-4">
                                            {!confirmingDelete ? (
                                                <button
                                                    onClick={() => setConfirmingDelete(true)}
                                                    className="flex items-center gap-1.5 text-[12px] text-red-600 hover:text-red-700"
                                                >
                                                    <MSO icon="delete" className="text-[14px]" /> Delete server
                                                </button>
                                            ) : (
                                                <div className="space-y-2 rounded-lg bg-red-50 p-3">
                                                    <p className="text-[12px] text-red-700">
                                                        This deletes the server and its storage permanently.
                                                        {detail.state !== 'stopped' && ' It must be stopped first.'}
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={submitDelete}
                                                            disabled={actionPending || detail.state !== 'stopped'}
                                                            className="rounded-md bg-red-600 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-40"
                                                        >
                                                            Confirm delete
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmingDelete(false)}
                                                            className="text-[12px] text-[var(--md-sys-color-on-surface-variant)]"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {actionError && <p className="text-[12px] text-red-600">{actionError}</p>}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}