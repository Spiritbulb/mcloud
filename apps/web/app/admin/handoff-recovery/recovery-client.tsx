"use client"

import { useState, useTransition } from "react"
import { PageHeader } from "@mcloud/ui/kit/page-header"
import { Panel } from "@mcloud/ui/kit/panel"
import { Badge } from "@mcloud/ui/kit/badge"
import { Button } from "@mcloud/ui/kit/button"
import { EmptyState } from "@mcloud/ui/kit/empty-state"
import { Notice } from "@mcloud/ui/kit/notice"
import { sendRecoveryEmails, type SendResult } from "./actions"
import type { Stranded } from "./recovery-logic"

export default function RecoveryClient({
    people,
    resendConfigured,
}: {
    people: Stranded[]
    resendConfigured: boolean
}) {
    // Recent sign-ins are preselected; older ones are opt-in.
    const [picked, setPicked] = useState<Set<string>>(() => new Set(people.filter((p) => p.recent).map((p) => p.email)))
    const [result, setResult] = useState<SendResult | null>(null)
    const [pending, start] = useTransition()

    const toggle = (email: string) =>
        setPicked((prev) => {
            const next = new Set(prev)
            if (next.has(email)) next.delete(email)
            else next.add(email)
            return next
        })

    const send = () => {
        const list = [...picked]
        if (list.length === 0) return
        if (!window.confirm(`Send the recovery email to ${list.length} ${list.length === 1 ? "person" : "people"}?`)) return
        start(async () => setResult(await sendRecoveryEmails(list)))
    }

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <PageHeader
                title="Handoff recovery"
                description="People who signed in on spiritb.uk but have no Menengai Cloud account row, so the handoff probably failed for them. Anyone who gets through drops off this list on their own."
            />

            {!resendConfigured && <Notice tone="error">RESEND_API_KEY is not set in this environment, so sending is disabled.</Notice>}

            {people.length === 0 ? (
                <Panel>
                    <EmptyState icon="mark_email_read" title="Nobody is stranded" description="Every signed-in person has an account row." />
                </Panel>
            ) : (
                <Panel
                    title={`${people.length} ${people.length === 1 ? "person" : "people"}`}
                    description={`${picked.size} selected`}
                    flush
                    action={
                        <Button variant="primary" size="sm" onClick={send} disabled={pending || !resendConfigured || picked.size === 0}>
                            {pending ? "Sending…" : `Send email to ${picked.size}`}
                        </Button>
                    }
                >
                    <ul className="divide-y divide-border">
                        {people.map((p) => (
                            <li key={p.email}>
                                <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-[13px] transition-colors hover:bg-muted/40">
                                    <input type="checkbox" checked={picked.has(p.email)} onChange={() => toggle(p.email)} disabled={pending} className="h-4 w-4 accent-[rgb(var(--brand))]" />
                                    <span className="min-w-0 flex-1">
                                        <span className="font-medium text-foreground">{p.name ?? p.email}</span>
                                        {p.name && <span className="text-muted-foreground"> · {p.email}</span>}
                                    </span>
                                    {!p.recent && <Badge>older</Badge>}
                                    <span className="shrink-0 text-[12px] text-muted-foreground tabular-nums">
                                        {new Date(p.lastSignInAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                                    </span>
                                </label>
                            </li>
                        ))}
                    </ul>
                </Panel>
            )}

            {result && (
                <div className="space-y-2" role="status">
                    {result.error && <Notice tone="error">{result.error}</Notice>}
                    {result.sent.length > 0 && <Notice>Sent to {result.sent.length}.</Notice>}
                    {result.skipped.length > 0 && <Notice>Skipped {result.skipped.length} who are no longer stranded.</Notice>}
                    {result.failed.map((f) => (
                        <Notice key={f.email} tone="error">{f.email}: {f.error}</Notice>
                    ))}
                </div>
            )}
        </div>
    )
}
