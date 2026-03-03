'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function DomainSettings({ storeId, currentDomain }: { storeId: string; currentDomain: string | null }) {
    const [domain, setDomain] = useState(currentDomain ?? '')
    const [saving, setSaving] = useState(false)
    const [checking, setChecking] = useState(false)
    const [status, setStatus] = useState<{ verified: boolean; misconfigured: boolean } | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        const res = await fetch('/api/store/domain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ storeId, domain }),
        })
        const json = await res.json()
        if (!res.ok) setError(json.error)
        setSaving(false)
        checkVerification()
    }

    const checkVerification = async () => {
        setChecking(true)
        const res = await fetch(`/api/store/domain?storeId=${storeId}`)
        const json = await res.json()
        setStatus(json)
        setChecking(false)
    }

    useEffect(() => { if (currentDomain) checkVerification() }, [])

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-base font-semibold mb-1">Custom Domain</h2>
                <p className="text-sm text-muted-foreground">Connect your own domain to your store</p>
            </div>

            <div className="space-y-4 max-w-sm">
                <div className="grid gap-1.5">
                    <Label className="text-sm">Domain</Label>
                    <Input
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        placeholder="shop.yourdomain.com"
                        className="h-9 rounded-none"
                    />
                    <p className="text-xs text-muted-foreground">Enter without https://</p>
                </div>

                {error && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2">{error}</p>}

                <Button onClick={handleSave} disabled={saving} className="google-button-primary rounded-none h-9 text-sm w-full">
                    {saving ? 'Connecting...' : 'Connect domain'}
                </Button>
            </div>

            {/* DNS Instructions */}
            {domain && (
                <div className="border p-4 space-y-3 max-w-sm">
                    <p className="text-sm font-medium">DNS Configuration</p>
                    <p className="text-xs text-muted-foreground">
                        Add this CNAME record at your domain registrar:
                    </p>
                    <div className="bg-muted px-3 py-2 font-mono text-xs space-y-1">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Type</span>
                            <span>CNAME</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Name</span>
                            <span>{domain.split('.')[0]}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Value</span>
                            <span>cname.vercel-dns.com</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                        {status ? (
                            <span className={`text-xs flex items-center gap-1.5 ${status.verified ? 'text-green-600' : 'text-amber-500'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${status.verified ? 'bg-green-500' : 'bg-amber-400'}`} />
                                {status.verified ? 'Domain verified ✓' : 'Awaiting DNS propagation'}
                            </span>
                        ) : <span />}
                        <button onClick={checkVerification} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                            {checking ? 'Checking...' : 'Check status'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
