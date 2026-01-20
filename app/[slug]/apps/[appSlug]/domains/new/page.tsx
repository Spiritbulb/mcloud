// /app/[slug]/apps/[appSlug]/domains/new/page.tsx
"use client"

import { useState } from "react"
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/client"
import { useRouter, useParams } from "next/navigation"
import { AlertCircle, Globe, CheckCircle, Copy, ExternalLink } from "lucide-react"

export default function NewDomainPage() {
    const router = useRouter()
    const params = useParams()
    const slug = params.slug as string
    const appSlug = params.appSlug as string
    const supabase = createClient()

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [step, setStep] = useState<'input' | 'verify'>('input')
    const [verificationToken, setVerificationToken] = useState('')
    const [domainId, setDomainId] = useState('')

    const [domain, setDomain] = useState('')

    const generateVerificationToken = () => {
        return `nuru-verify-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
    }

    const validateDomain = (domain: string) => {
        // Remove protocol if present
        let cleanDomain = domain.replace(/^https?:\/\//, '')
        // Remove trailing slash
        cleanDomain = cleanDomain.replace(/\/$/, '')
        // Remove www if present
        cleanDomain = cleanDomain.replace(/^www\./, '')

        // Basic domain validation
        const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i
        return domainRegex.test(cleanDomain) ? cleanDomain : null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Get app
            const { data: app } = await supabase
                .from('apps')
                .select('id')
                .eq('slug', appSlug)
                .eq('user_id', user.id)
                .single()

            if (!app) throw new Error('App not found')

            const cleanDomain = validateDomain(domain)
            if (!cleanDomain) {
                throw new Error('Invalid domain format. Please enter a valid domain (e.g., example.com)')
            }

            // Check if domain already exists for this app
            const { data: existing } = await supabase
                .from('domains')
                .select('domain')
                .eq('app_id', app.id)
                .eq('domain', cleanDomain)
                .single()

            if (existing) {
                throw new Error('This domain is already added to your app')
            }

            // Generate verification token
            const token = generateVerificationToken()

            // Insert domain
            const { data: newDomain, error: insertError } = await supabase
                .from('domains')
                .insert({
                    domain: cleanDomain,
                    app_id: app.id,
                    is_verified: false,
                    verification_token: token,
                })
                .select()
                .single()

            if (insertError) throw insertError

            setVerificationToken(token)
            setDomainId(newDomain.id)
            setDomain(cleanDomain)
            setStep('verify')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleVerify = async () => {
        setLoading(true)
        setError(null)

        try {
            // In a real implementation, you would:
            // 1. Check DNS TXT record for the verification token
            // 2. Or check for a specific file at domain/.well-known/nuru-verify.txt
            // For now, we'll simulate the verification

            const response = await fetch(`https://${domain}/.well-known/nuru-verify.txt`)
            const isValid = response.ok && (await response.text()).trim() === verificationToken

            if (!isValid) {
                // Try DNS TXT record verification (would need a backend endpoint)
                throw new Error('Domain verification failed. Please ensure the TXT record or verification file is properly configured.')
            }

            // Update domain as verified
            const { error: updateError } = await supabase
                .from('domains')
                .update({ is_verified: true, verified_at: new Date().toISOString() })
                .eq('id', domainId)

            if (updateError) throw updateError

            router.push(`/${slug}/apps/${appSlug}/domains`)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
    }

    const handleSkipVerification = () => {
        router.push(`/${slug}/apps/${appSlug}/domains`)
    }

    if (step === 'verify') {
        return (
            <div className="space-y-6">
                <PageHeader
                    title="Verify Domain"
                    description={`Verify ownership of ${domain}`}
                />

                {error && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-variant border border-outline">
                        <AlertCircle className="h-5 w-5 text-on-surface-variant flex-shrink-0" />
                        <p className="text-sm text-on-surface">{error}</p>
                    </div>
                )}

                <Card className="google-card border-outline bg-surface max-w-3xl">
                    <CardHeader>
                        <CardTitle className="text-headline-small text-on-surface">
                            Choose Verification Method
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Method 1: DNS TXT Record */}
                        <div className="p-4 rounded-lg border border-outline bg-surface-variant">
                            <h3 className="text-lg font-semibold text-on-surface mb-3 flex items-center gap-2">
                                <Globe className="h-5 w-5 text-primary" />
                                Method 1: DNS TXT Record (Recommended)
                            </h3>
                            <p className="text-sm text-on-surface-variant mb-4">
                                Add a TXT record to your domain's DNS settings
                            </p>

                            <div className="space-y-3">
                                <div>
                                    <Label className="text-sm font-medium text-on-surface mb-2">Record Type</Label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 p-3 rounded-lg bg-surface border border-outline text-sm font-mono text-on-surface">
                                            TXT
                                        </code>
                                        <button
                                            onClick={() => copyToClipboard('TXT')}
                                            className="google-button-secondary py-2 px-3 text-sm"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-sm font-medium text-on-surface mb-2">Host/Name</Label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 p-3 rounded-lg bg-surface border border-outline text-sm font-mono text-on-surface">
                                            _nuru-verification
                                        </code>
                                        <button
                                            onClick={() => copyToClipboard('_nuru-verification')}
                                            className="google-button-secondary py-2 px-3 text-sm"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-sm font-medium text-on-surface mb-2">Value</Label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 p-3 rounded-lg bg-surface border border-outline text-sm font-mono text-on-surface break-all">
                                            {verificationToken}
                                        </code>
                                        <button
                                            onClick={() => copyToClipboard(verificationToken)}
                                            className="google-button-secondary py-2 px-3 text-sm"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 p-3 rounded-lg bg-surface border border-outline">
                                <p className="text-xs text-on-surface-variant">
                                    <strong>Note:</strong> DNS changes can take up to 48 hours to propagate globally.
                                    You can verify immediately after adding the record, but if verification fails,
                                    please wait a few minutes and try again.
                                </p>
                            </div>
                        </div>

                        {/* Method 2: HTML File Upload */}
                        <div className="p-4 rounded-lg border border-outline">
                            <h3 className="text-lg font-semibold text-on-surface mb-3 flex items-center gap-2">
                                <ExternalLink className="h-5 w-5 text-primary" />
                                Method 2: HTML File Upload
                            </h3>
                            <p className="text-sm text-on-surface-variant mb-4">
                                Upload a verification file to your domain
                            </p>

                            <div className="space-y-3">
                                <div>
                                    <Label className="text-sm font-medium text-on-surface mb-2">1. Create a file named:</Label>
                                    <code className="block p-3 rounded-lg bg-surface-variant border border-outline text-sm font-mono text-on-surface">
                                        nuru-verify.txt
                                    </code>
                                </div>

                                <div>
                                    <Label className="text-sm font-medium text-on-surface mb-2">2. Add this content:</Label>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 p-3 rounded-lg bg-surface-variant border border-outline text-sm font-mono text-on-surface break-all">
                                            {verificationToken}
                                        </code>
                                        <button
                                            onClick={() => copyToClipboard(verificationToken)}
                                            className="google-button-secondary py-2 px-3 text-sm"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-sm font-medium text-on-surface mb-2">3. Upload to:</Label>
                                    <code className="block p-3 rounded-lg bg-surface-variant border border-outline text-sm font-mono text-on-surface">
                                        https://{domain}/.well-known/nuru-verify.txt
                                    </code>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4">
                            <button
                                type="button"
                                className="google-button-text py-2 px-4 text-body-medium"
                                onClick={handleSkipVerification}
                            >
                                Skip & Verify Later
                            </button>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className="google-button-secondary py-2 px-4 text-body-medium"
                                    onClick={() => setStep('input')}
                                    disabled={loading}
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    className="google-button-primary py-2 px-4 text-body-medium disabled:opacity-50"
                                    onClick={handleVerify}
                                    disabled={loading}
                                >
                                    {loading ? 'Verifying...' : 'Verify Domain'}
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="google-card border-outline bg-surface-variant max-w-3xl">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-semibold text-on-surface mb-1">
                                    Why verify your domain?
                                </h4>
                                <p className="text-sm text-on-surface-variant">
                                    Domain verification confirms you own the domain and prevents unauthorized tracking.
                                    Once verified, you can start collecting analytics data from your website [web:7][web:9].
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Onboard a domain"
                description="Add a new domain to track analytics"
            />

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-variant border border-outline">
                    <AlertCircle className="h-5 w-5 text-on-surface-variant flex-shrink-0" />
                    <p className="text-sm text-on-surface">{error}</p>
                </div>
            )}

            <Card className="google-card border-outline bg-surface max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-headline-small text-on-surface">
                        Domain Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="domain" className="text-on-surface">
                                Domain *
                            </Label>
                            <Input
                                id="domain"
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                                placeholder="example.com"
                                required
                                className="bg-surface border-outline"
                            />
                            <p className="text-xs text-on-surface-variant">
                                Enter your domain without http:// or https:// (e.g., example.com or subdomain.example.com)
                            </p>
                        </div>

                        <div className="p-4 rounded-lg bg-surface-variant border border-outline">
                            <h4 className="text-sm font-semibold text-on-surface mb-2">What happens next?</h4>
                            <ul className="text-xs text-on-surface-variant space-y-1">
                                <li>• You'll receive a verification token to prove domain ownership [web:9]</li>
                                <li>• Add a DNS TXT record or upload a verification file [web:5][web:10]</li>
                                <li>• Once verified, analytics tracking will be enabled</li>
                                <li>• Install the tracking script on your website</li>
                            </ul>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                className="google-button-secondary py-2 px-4 text-body-medium"
                                onClick={() => router.back()}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="google-button-primary py-2 px-4 text-body-medium disabled:opacity-50"
                                disabled={loading}
                            >
                                {loading ? 'Adding...' : 'Continue'}
                            </button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
