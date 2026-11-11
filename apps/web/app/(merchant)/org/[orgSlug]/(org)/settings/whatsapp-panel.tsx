'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@mcloud/ui/kit/button'
import { Notice } from '@mcloud/ui/kit/notice'
import { Panel } from '@mcloud/ui/kit/panel'
import { disconnectWhatsApp, startWhatsAppLink, type StartLinkResult } from './whatsapp-actions'

type Issued = Extract<StartLinkResult, { error: null }>

export default function WhatsAppPanel({ configured, linkedAs }: {
    configured: boolean
    /** Masked number when this user already has a link, else null. */
    linkedAs: string | null
}) {
    const router = useRouter()
    const [issued, setIssued] = useState<Issued | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [pending, start] = useTransition()

    const generate = () => {
        setError(null)
        start(async () => {
            const res = await startWhatsAppLink()
            if (res.error !== null) { setError(res.error); return }
            setIssued(res)
        })
    }
    const disconnect = () => {
        setError(null)
        start(async () => {
            const res = await disconnectWhatsApp()
            if (res.error) { setError(res.error); return }
            setIssued(null)
            router.refresh()
        })
    }

    return (
        <Panel
            title="WhatsApp"
            description="Check orders and create a store by messaging us on WhatsApp. This connects your own number, and it works across every organization and store you belong to."
        >
            <div className="space-y-4">
                {!configured ? (
                    <Notice>WhatsApp is not set up on this platform yet.</Notice>
                ) : linkedAs ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[14px]">Connected: <span className="font-medium">{linkedAs}</span></p>
                        <Button variant="danger" onClick={disconnect} disabled={pending}>Disconnect</Button>
                    </div>
                ) : issued ? (
                    <div className="space-y-3">
                        <p className="text-[14px]">
                            Send this message to {issued.number ?? 'our WhatsApp number'} from the phone you want to connect:
                        </p>
                        <p className="rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 font-mono text-[16px] tracking-wide">LINK {issued.code}</p>
                        <p className="text-[13px] text-muted-foreground">The code works once and expires in 10 minutes.</p>
                        <div className="flex flex-wrap gap-2">
                            {issued.deepLink && (
                                <a href={issued.deepLink} target="_blank" rel="noreferrer"
                                   className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-[14px] font-medium text-primary-foreground hover:bg-primary/90">
                                    Open WhatsApp
                                </a>
                            )}
                            <Button onClick={() => router.refresh()}>I have sent it</Button>
                            <Button variant="ghost" onClick={generate} disabled={pending}>New code</Button>
                        </div>
                    </div>
                ) : (
                    <Button variant="primary" onClick={generate} disabled={pending}>Connect WhatsApp</Button>
                )}
                {error && <Notice tone="error">{error}</Notice>}
            </div>
        </Panel>
    )
}
