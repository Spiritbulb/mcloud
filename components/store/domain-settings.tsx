'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Check, CheckCircle, Loader2 } from 'lucide-react'

export default function DomainSettings({
    storeId,
    currentDomain,
}: {
    storeId: string
    currentDomain: string | null
}) {
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

    useEffect(() => {
        if (currentDomain) checkVerification()
    }, [])

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-base font-semibold text-foreground">Custom Domain</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Connect your own domain to your store</p>
            </div>

            <div className="space-y-4 max-w-sm">
                <div className="space-y-1.5">
                    <Label htmlFor="domain">Domain</Label>
                    <Input
                        id="domain"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        placeholder="shop.yourdomain.com"
                    />
                    <p className="text-xs text-muted-foreground">Enter without https://</p>
                </div>

                {error && (
                    <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2 border border-destructive/20">
                        {error}
                    </p>
                )}

                <Button
                    onClick={handleSave}
                    disabled={saving || !domain.trim() || status?.verified}
                    className={`w-full h-9 text-sm ${status?.verified ? 'bg-green-100' : 'bg-primary hover:bg-primary/90'}`}
                >
                    {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    {saving ? 'Connecting...' : status?.verified ? <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Connected</span> : 'Connect domain'}
                </Button>
            </div>

            {domain && !status?.verified && (
                <Card className="max-w-vw">
                    <CardContent className="pt-4 pb-4 space-y-4">
                        <p className="text-sm font-medium text-foreground">DNS Configuration for <span className="text-foreground">{domain}</span></p>
                        <p className="text-xs text-muted-foreground">
                            Add this CNAME record at your domain registrar:
                        </p>

                        <div className="rounded bg-muted px-3 py-2.5 font-mono text-xs space-y-1.5">
                            {[
                                { k: 'Type', v: 'CNAME' },
                                { k: 'Name', v: domain.split('.')[0] },
                                { k: 'Value', v: 'cname.vercel-dns.com' },
                            ].map(({ k, v }) => (
                                <div key={k} className="flex flex-row justify-between">
                                    <span className="text-foreground">{v}</span>
                                    <Button
                                        onClick={() => navigator.clipboard.writeText(v)}
                                        className="w-12 h-6 text-sm"
                                    >
                                        Copy
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between">
                            {status ? (
                                <span className={`text-xs flex items-center gap-1.5 ${status.verified ? 'text-green-600' : 'text-amber-500'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${status.verified ? 'bg-green-500' : 'bg-amber-400'}`} />
                                    {status.verified ? 'Domain verified' : 'Awaiting DNS propagation'}
                                </span>
                            ) : (
                                <span />
                            )}
                            <button
                                onClick={checkVerification}
                                disabled={checking}
                                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors disabled:opacity-50"
                            >
                                {checking ? 'Checking...' : 'Check status'}
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}