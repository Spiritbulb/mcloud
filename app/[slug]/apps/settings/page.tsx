"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/client"
import { useRouter, useParams } from "next/navigation"
import { AlertCircle, CheckCircle } from "lucide-react"

export default function AppSettingsPage() {
    const router = useRouter()
    const params = useParams()
    const slug = params.slug as string
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const [settings, setSettings] = useState({
        orgName: "",
        supportEmail: "",
        autoDeploy: false,
        maintenanceMode: false,
        emailNotifications: true,
    })

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/auth/login')
                return
            }

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single()

            if (!profile?.organization_id) {
                throw new Error('No organization found')
            }

            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .select('name, settings')
                .eq('id', profile.organization_id)
                .single()

            if (orgError) throw orgError

            const { data: userProfile } = await supabase
                .from('user_profiles')
                .select('email_notifications')
                .eq('id', user.id)
                .single()

            // Get organization settings from JSONB field
            const orgSettings = org.settings || {}

            setSettings({
                orgName: org.name || '',
                supportEmail: orgSettings.support_email || '',
                autoDeploy: orgSettings.auto_deploy || false,
                maintenanceMode: orgSettings.maintenance_mode || false,
                emailNotifications: userProfile?.email_notifications ?? true,
            })
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        setSuccess(false)

        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                throw new Error('Not authenticated')
            }

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single()

            if (!profile?.organization_id) {
                throw new Error('No organization found')
            }

            // Update organization
            const { error: orgError } = await supabase
                .from('organizations')
                .update({
                    name: settings.orgName,
                    settings: {
                        support_email: settings.supportEmail,
                        auto_deploy: settings.autoDeploy,
                        maintenance_mode: settings.maintenanceMode,
                    },
                    updated_at: new Date().toISOString(),
                })
                .eq('id', profile.organization_id)

            if (orgError) throw orgError

            // Update user email notification preference
            const { error: profileError } = await supabase
                .from('user_profiles')
                .update({
                    email_notifications: settings.emailNotifications,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id)

            if (profileError) throw profileError

            setSuccess(true)
            setTimeout(() => setSuccess(false), 3000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="App Settings"
                description="Configure global settings for your applications"
            />

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-variant border border-outline">
                    <AlertCircle className="h-5 w-5 text-on-surface-variant flex-shrink-0" />
                    <p className="text-sm text-on-surface">{error}</p>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-variant border border-outline">
                    <CheckCircle className="h-5 w-5 text-on-surface-variant flex-shrink-0" />
                    <p className="text-sm text-on-surface">Settings saved successfully!</p>
                </div>
            )}

            <Card className="google-card border-outline bg-surface">
                <CardHeader>
                    <CardTitle className="text-headline-small text-on-surface">
                        General Settings
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="org-name" className="text-on-surface">
                            Organization Name
                        </Label>
                        <Input
                            id="org-name"
                            value={settings.orgName}
                            onChange={(e) => setSettings(prev => ({ ...prev, orgName: e.target.value }))}
                            placeholder="Spiritbulb LTD"
                            className="bg-surface border-outline"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="support-email" className="text-on-surface">
                            Support Email
                        </Label>
                        <Input
                            id="support-email"
                            type="email"
                            value={settings.supportEmail}
                            onChange={(e) => setSettings(prev => ({ ...prev, supportEmail: e.target.value }))}
                            placeholder="support@spiritbulb.com"
                            className="bg-surface border-outline"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-on-surface">Auto-deploy updates</Label>
                            <p className="text-sm text-on-surface-variant">
                                Automatically deploy updates when approved
                            </p>
                        </div>
                        <Switch
                            checked={settings.autoDeploy}
                            onCheckedChange={(checked) =>
                                setSettings(prev => ({ ...prev, autoDeploy: checked }))
                            }
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-on-surface">Maintenance mode</Label>
                            <p className="text-sm text-on-surface-variant">
                                Enable maintenance mode for all apps
                            </p>
                        </div>
                        <Switch
                            checked={settings.maintenanceMode}
                            onCheckedChange={(checked) =>
                                setSettings(prev => ({ ...prev, maintenanceMode: checked }))
                            }
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-on-surface">Email notifications</Label>
                            <p className="text-sm text-on-surface-variant">
                                Receive email alerts for critical events
                            </p>
                        </div>
                        <Switch
                            checked={settings.emailNotifications}
                            onCheckedChange={(checked) =>
                                setSettings(prev => ({ ...prev, emailNotifications: checked }))
                            }
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    className="google-button-secondary py-2 px-4 text-body-medium"
                    onClick={() => router.back()}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="google-button-primary py-2 px-4 text-body-medium disabled:opacity-50"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    )
}
