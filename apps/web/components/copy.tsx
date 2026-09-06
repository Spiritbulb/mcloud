'use client'
import { useState } from 'react'

export function CopyableIp({ ip }: { ip: string }) {
    const [copied, setCopied] = useState(false)

    return (
        <button
            onClick={() => {
                navigator.clipboard.writeText(ip)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
            }}
            className="font-mono text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-primary)] transition-colors cursor-pointer"
            title="Click to copy"
        >
            {copied ? 'Copied!' : ip}
        </button>
    )
}