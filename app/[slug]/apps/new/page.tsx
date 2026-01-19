// /app/[slug]/apps/new/page.tsx
"use client"

import { useState } from "react"
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/client"
import { useRouter, useParams } from "next/navigation"
import { AlertCircle, CheckCircle } from "lucide-react"

export default function NewAppPage() {
    const router = useRouter()
    const params = useParams()
    const slug = params.slug as string
    const supabase = createClient()

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        status: "active" as "active" | "beta" | "archived" | "maintenance",
    })

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const appSlug = generateSlug(formData.name)

            // Check if slug already exists for this user
            const { data: existing } = await supabase
                .from('apps')
                .select('slug')
                .eq('user_id', user.id)
                .eq('slug', appSlug)
                .single()

            if (existing) {
                throw new Error('An app with this name already exists. Please choose a different name.')
            }

            const { error: insertError } = await supabase
                .from('apps')
                .insert({
                    name: formData.name,
                    slug: appSlug,
                    description: formData.description,
                    status: formData.status,
                    user_id: user.id,
                })

            if (insertError) throw insertError

            router.push(`/${slug}/apps`)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Create New App"
                description="Add a new application to your account"
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
                        App Details
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-on-surface">
                                App Name *
                            </Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="My Awesome App"
                                required
                                className="bg-surface border-outline"
                            />
                            {formData.name && (
                                <p className="text-xs text-on-surface-variant">
                                    Slug will be: <span className="font-mono">{generateSlug(formData.name)}</span>
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-on-surface">
                                Description
                            </Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Describe your app..."
                                className="bg-surface border-outline min-h-[100px]"
                            />
                            <p className="text-xs text-on-surface-variant">
                                A brief description of what your app does
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status" className="text-on-surface">
                                Status *
                            </Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                            >
                                <SelectTrigger className="bg-surface border-outline">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="beta">Beta</SelectItem>
                                    <SelectItem value="maintenance">Maintenance</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-on-surface-variant">
                                Set the current status of your app
                            </p>
                        </div>

                        <div className="p-4 rounded-lg bg-surface-variant border border-outline">
                            <h4 className="text-sm font-medium text-on-surface mb-2">What's next?</h4>
                            <ul className="text-xs text-on-surface-variant space-y-1">
                                <li>• You'll receive an API key to integrate analytics</li>
                                <li>• Configure domains for your app</li>
                                <li>• Start tracking user activity and events</li>
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
                                {loading ? 'Creating...' : 'Create App'}
                            </button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
