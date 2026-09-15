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
            className="font-mono text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            title="Click to copy"
        >
            {copied ? 'Copied!' : ip}
        </button>
    )
}