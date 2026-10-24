'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Plan } from '@mcloud/merchant/plans'
import { Status } from '@mcloud/ui/kit/badge'
import { Button } from '@mcloud/ui/kit/button'
import { Field, TextInput } from '@mcloud/ui/kit/form'
import { Icon } from '@mcloud/ui/kit/icon'
import { Notice } from '@mcloud/ui/kit/notice'
import { PageHeader } from '@mcloud/ui/kit/page-header'
import { Panel } from '@mcloud/ui/kit/panel'
import { Spinner } from '@mcloud/ui/kit/skeleton'
import { ProGateInline } from '../pro'
import { dnsRecordFor, isValidDomain, normalizeDomain } from '@mcloud/merchant/custom-domain'

type Status = {
    domain: string | null
    verified: boolean
    misconfigured?: boolean
    verification?: { type: string; domain: string; value: string }[]
}

function CopyValue({ value }: { value: string }) {
    const [copied, setCopied] = useState(false)
    return (
        <span className="flex min-w-0 items-center gap-2">
            <code className="truncate font-mono text-[12px] text-foreground">{value}</code>
            <Button
                size="sm"
                variant="ghost"
                aria-label={`Copy ${value}`}
                onClick={() => {
                    navigator.clipboard.writeText(value).then(() => {
                        setCopied(true)
                        setTimeout(() => setCopied(false), 1500)
                    }, () => {})
                }}
            >
                <Icon name={copied ? 'check' : 'content_copy'} size={14} />
            </Button>
        </span>
    )
}

function RecordTable({ rows }: { rows: { type: string; name: string; value: string }[] }) {
    return (
        <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-left text-[12px]">
                <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                        <th className="px-3 py-2 font-medium">Type</th>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Value</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={`${r.type}-${r.name}-${r.value}`} className="border-t border-border">
                            <td className="px-3 py-2 font-mono">{r.type}</td>
                            <td className="px-3 py-2"><CopyValue value={r.name} /></td>
                            <td className="px-3 py-2"><CopyValue value={r.value} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default function DomainSettings({
    storeId,
    currentDomain,
    plan,
}: {
    storeId: string
    currentDomain: string | null
    plan: Plan
}) {
    const [connected, setConnected] = useState(currentDomain)
    const [domain, setDomain] = useState(currentDomain ?? '')
    const [saving, setSaving] = useState(false)
    const [checking, setChecking] = useState(!!currentDomain)
    const [status, setStatus] = useState<Status | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [checkFailed, setCheckFailed] = useState(false)

    const clean = normalizeDomain(domain)
    const valid = isValidDomain(clean)
    const changed = clean !== (connected ?? '')

    // Sets state only once the request settles, so the mount effect below does not render twice.
    const fetchStatus = useCallback(
        () =>
            fetch(`/api/store/domain?storeId=${encodeURIComponent(storeId)}`, { credentials: 'include' })
                .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
                .then((next: Status) => {
                    setStatus(next)
                    setCheckFailed(false)
                })
                .catch(() => setCheckFailed(true))
                .finally(() => setChecking(false)),
        [storeId],
    )

    const checkVerification = () => {
        setChecking(true)
        return fetchStatus()
    }

    useEffect(() => {
        if (!currentDomain) return
        fetchStatus()
    }, [currentDomain, fetchStatus])

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        try {
            const res = await fetch('/api/store/domain', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId, domain: clean }),
            })
            const json = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(json.error || 'Could not connect the domain. Try again.')
            setConnected(json.domain ?? clean)
            setDomain(json.domain ?? clean)
            await checkVerification()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not connect the domain. Try again.')
        } finally {
            setSaving(false)
        }
    }

    const record = connected ? dnsRecordFor(connected) : null
    const verified = !!status?.verified && status.domain === connected

    return (
        <div className="space-y-6">
            <PageHeader title="Domain" description="Serve your store from your own domain." />

            <ProGateInline
                plan={plan}
                requires="hobby"
                feature="Custom domains"
                description="Connect your own domain on the Hobby plan and higher."
            >
                <div className="space-y-6">
                    {error && <Notice tone="error">{error}</Notice>}

                    <Panel
                        title="Custom domain"
                        description="Use a domain you own, like shop.yourbrand.com."
                        footer={
                            <Button variant="primary" onClick={handleSave} disabled={saving || !valid || !changed}>
                                {saving && <Spinner size={13} />}
                                {saving ? 'Connecting…' : connected ? 'Change domain' : 'Connect domain'}
                            </Button>
                        }
                    >
                        <Field
                            label="Domain"
                            error={domain.trim() && !valid ? 'Enter a domain like shop.example.com, without https://.' : undefined}
                            hint="Without https:// or a path."
                        >
                            <TextInput
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                                placeholder="shop.yourdomain.com"
                                invalid={!!domain.trim() && !valid}
                                autoCapitalize="none"
                                spellCheck={false}
                            />
                        </Field>
                    </Panel>

                    {connected && record && (
                        <Panel
                            title={connected}
                            description={verified ? 'Visitors can reach your store at this domain.' : 'Add this record where you bought the domain, then check again.'}
                            action={
                                checking ? (
                                    <Status tone="neutral">Checking…</Status>
                                ) : verified ? (
                                    <Status tone="success">Connected</Status>
                                ) : status ? (
                                    <Status tone="warning">Waiting for DNS</Status>
                                ) : null
                            }
                            footer={
                                <Button size="sm" onClick={() => void checkVerification()} disabled={checking}>
                                    {checking ? <Spinner size={12} /> : <Icon name="refresh" size={14} />}
                                    Check again
                                </Button>
                            }
                        >
                            <div className="space-y-4">
                                {checkFailed && <Notice tone="error">Couldn&apos;t check the domain&apos;s status. Try again in a moment.</Notice>}
                                {!verified && (
                                    <>
                                        <RecordTable rows={[record]} />
                                        {status?.verification && status.verification.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-[12px] text-muted-foreground">
                                                    This domain is also in use on another Vercel account. Add this record too, to prove it is yours:
                                                </p>
                                                <RecordTable rows={status.verification.map((v) => ({ type: v.type, name: v.domain, value: v.value }))} />
                                            </div>
                                        )}
                                        <p className="text-[12px] text-muted-foreground">
                                            DNS changes can take up to a few hours to reach everyone.
                                        </p>
                                    </>
                                )}
                            </div>
                        </Panel>
                    )}
                </div>
            </ProGateInline>
        </div>
    )
}
