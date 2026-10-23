"use client"

import { useState, useTransition } from "react"
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
        <div className="max-w-4xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">Handoff recovery</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    People who signed in on spiritb.uk but have no Menengai Cloud account row, so the handoff
                    probably failed for them. Anyone who gets through drops off this list on their own.
                </p>
            </div>

            {!resendConfigured && (
                <p className="rounded-lg border border-[var(--md-sys-color-error)] px-4 py-3 text-[13px] text-destructive">
                    RESEND_API_KEY is not set in this environment, so sending is disabled.
                </p>
            )}

            {people.length === 0 ? (
                <p className="rounded-lg border border-border bg-card px-5 py-4 text-[13px] text-muted-foreground">
                    Nobody is stranded. Every signed-in person has an account row.
                </p>
            ) : (
                <>
                    <ul className="rounded-lg border border-border bg-card divide-y divide-border">
                        {people.map((p) => (
                            <li key={p.email}>
                                <label className="flex items-center gap-3 px-4 py-3 text-[13px] cursor-pointer hover:bg-muted/40">
                                    <input
                                        type="checkbox"
                                        checked={picked.has(p.email)}
                                        onChange={() => toggle(p.email)}
                                        disabled={pending}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="font-medium text-foreground">{p.name ?? p.email}</span>
                                        {p.name && <span className="text-muted-foreground"> · {p.email}</span>}
                                    </span>
                                    <span className="text-[12px] text-muted-foreground shrink-0">
                                        signed in {new Date(p.lastSignInAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                                        {p.recent ? "" : " · older"}
                                    </span>
                                </label>
                            </li>
                        ))}
                    </ul>

                    <button
                        onClick={send}
                        disabled={pending || !resendConfigured || picked.size === 0}
                        className="rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground disabled:opacity-50"
                    >
                        {pending ? "Sending…" : `Send email to ${picked.size}`}
                    </button>
                </>
            )}

            {result && (
                <div className="rounded-lg border border-border bg-card px-4 py-3 text-[13px] space-y-1" role="status">
                    {result.error && <p className="text-destructive">{result.error}</p>}
                    {result.sent.length > 0 && <p>Sent to {result.sent.length}.</p>}
                    {result.skipped.length > 0 && (
                        <p className="text-muted-foreground">
                            Skipped {result.skipped.length} who are no longer stranded.
                        </p>
                    )}
                    {result.failed.map((f) => (
                        <p key={f.email} className="text-destructive">
                            {f.email}: {f.error}
                        </p>
                    ))}
                </div>
            )}
        </div>
    )
}
