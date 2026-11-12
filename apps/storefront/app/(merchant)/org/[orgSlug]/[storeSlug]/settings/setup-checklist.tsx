'use client'

// "Get your store ready" on the Overview: what is left to set up, each step linking to its settings
// page and to the doc that explains it. Steps and copy come from setup-checklist-logic.ts.

import { useState } from 'react'
import Link from 'next/link'
import { openExternal } from '@mcloud/merchant/storefront-url'
import { Button, buttonClass } from '@mcloud/ui/kit/button'
import { Icon } from '@mcloud/ui/kit/icon'
import { Illustration } from '@mcloud/ui/kit/illustrations'
import { Panel } from '@mcloud/ui/kit/panel'
import { docUrl } from '@/lib/help-links'
import { updateSetupChecklist } from '@/lib/admin/setup-checklist-actions'
import { checklistProgress, type ChecklistStep } from './setup-checklist-logic'

function ProgressRing({ done, total }: { done: number; total: number }) {
    const r = 15
    const c = 2 * Math.PI * r
    const share = total ? done / total : 0
    return (
        <svg viewBox="0 0 36 36" className="h-9 w-9 -rotate-90" role="img" aria-label={`${done} of ${total} done`}>
            <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" className="stroke-muted" />
            <circle
                cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" strokeLinecap="round"
                className="stroke-primary transition-[stroke-dashoffset] duration-500"
                strokeDasharray={c} strokeDashoffset={c * (1 - share)}
            />
        </svg>
    )
}

function LearnHow({ path }: { path: string }) {
    const href = docUrl(path)
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            // Docs live on web; leave the TWA shell for the browser.
            onClick={(e) => { e.preventDefault(); openExternal(href) }}
            className="whitespace-nowrap text-[13px] text-muted-foreground hover:text-foreground hover:underline"
        >
            Learn how →
        </a>
    )
}

function StepRow({ step, settingsHref, onShare }: { step: ChecklistStep; settingsHref: (tab: string) => string; onShare: () => void }) {
    const action = step.tab === null
        ? <Button size="sm" variant={step.done ? 'ghost' : 'secondary'} onClick={onShare}>Copy link</Button>
        : !step.done && <Link href={settingsHref(step.tab)} className={buttonClass('secondary', 'sm')}>Start</Link>
    return (
        <li className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 py-3">
            <span
                className={step.done
                    ? 'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'
                    : 'mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-border'}
            >
                {step.done && <Icon name="check" size={13} />}
            </span>
            <span className="min-w-0 flex-1">
                <span className={step.done ? 'block text-[14px] text-muted-foreground line-through decoration-muted-foreground/50' : 'block text-[14px] font-medium text-foreground'}>
                    {step.title}
                    {step.optional && <span className="ml-1.5 text-[12px] font-normal text-muted-foreground no-underline">Optional</span>}
                </span>
                {!step.done && <span className="mt-0.5 block text-[13px] text-muted-foreground">{step.description}</span>}
            </span>
            {/* Under the text on phones (indented past the tick), beside it from sm up. */}
            <span className="flex w-full shrink-0 items-center gap-3 pl-8 sm:w-auto sm:justify-end sm:pl-0">
                {!step.done && <LearnHow path={step.docPath} />}
                {action}
            </span>
        </li>
    )
}

export function SetupChecklist({ storeId, steps, commerce, settingsHref, onCopyLink }: {
    storeId: string
    steps: ChecklistStep[]
    commerce: boolean
    settingsHref: (tab: string) => string
    /** Copies the store link; the checklist records it so the share step ticks. */
    onCopyLink: () => void
}) {
    const [hidden, setHidden] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { done, total, complete } = checklistProgress(steps)

    if (hidden) return null

    const hide = async () => {
        setHidden(true)
        setError(null)
        const res = await updateSetupChecklist(storeId, { hidden: true })
        // Put it back if the save failed (e.g. a staff member who cannot change the store).
        if (!res.ok) {
            setHidden(false)
            setError(res.error)
        }
    }

    const hideButton = <Button size="sm" variant="ghost" onClick={hide}>Hide</Button>

    if (complete) {
        return (
            <Panel>
                <div className="flex flex-wrap items-center gap-4">
                    <Illustration name="all-done" className="h-16" />
                    <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-foreground">You&apos;re all set</p>
                        <p className="text-[14px] text-muted-foreground">
                            {commerce ? 'Your store is ready for customers.' : 'Your site is ready for supporters.'}
                        </p>
                        {error && <p className="mt-1 text-[13px] text-destructive">{error}</p>}
                    </div>
                    {hideButton}
                </div>
            </Panel>
        )
    }

    return (
        <Panel flush>
            <div className="flex items-center gap-4 border-b border-border px-4 py-4">
                <Illustration name="setup" className="hidden h-16 sm:block" />
                <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-foreground">
                        {commerce ? 'Get your store ready' : 'Get your site ready'}
                    </p>
                    <p className="text-[13px] text-muted-foreground">{done} of {total} done</p>
                    {error && <p className="mt-1 text-[13px] text-destructive">{error}</p>}
                </div>
                <ProgressRing done={done} total={total} />
                {hideButton}
            </div>
            <ul className="divide-y divide-border">
                {steps.map((step) => (
                    <StepRow key={step.id} step={step} settingsHref={settingsHref} onShare={onCopyLink} />
                ))}
            </ul>
        </Panel>
    )
}
