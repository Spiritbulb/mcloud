"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle } from "lucide-react"

export default function PreferencesPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const [preferences, setPreferences] = useState({
        theme: 'system' as 'light' | 'dark' | 'system',
        language: 'en',
        timezone: 'Africa/Nairobi',
        email_notifications: true,
        push_notifications: true,
        marketing_emails: false,
    })

    useEffect(() => {
        loadPreferences()
    }, [])

    useEffect(() => {
        applyTheme(preferences.theme)
    }, [preferences.theme])

    const loadPreferences = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/auth/login')
                return
            }

            const { data: profileData, error: profileError } = await supabase
                .from('user_profiles')
                .select('theme, language, timezone, email_notifications, push_notifications, marketing_emails')
                .eq('id', user.id)
                .single()

            if (profileError && profileError.code !== 'PGRST116') {
                throw profileError
            }

            if (profileData) {
                setPreferences({
                    theme: profileData.theme || 'system',
                    language: profileData.language || 'en',
                    timezone: profileData.timezone || 'Africa/Nairobi',
                    email_notifications: profileData.email_notifications ?? true,
                    push_notifications: profileData.push_notifications ?? true,
                    marketing_emails: profileData.marketing_emails ?? false,
                })
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const applyTheme = (theme: 'light' | 'dark' | 'system') => {
        const html = document.documentElement

        // Remove existing class first
        html.classList.remove('dark', 'light')

        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            if (prefersDark) {
                html.classList.add('dark')
            }
        } else if (theme === 'dark') {
            html.classList.add('dark')
        }

        localStorage.setItem('theme', theme)
    }


    const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
        setPreferences(prev => ({ ...prev, theme }))
        applyTheme(theme)
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

            const { error: updateError } = await supabase
                .from('user_profiles')
                .upsert({
                    id: user.id,
                    theme: preferences.theme,
                    language: preferences.language,
                    timezone: preferences.timezone,
                    email_notifications: preferences.email_notifications,
                    push_notifications: preferences.push_notifications,
                    marketing_emails: preferences.marketing_emails,
                    updated_at: new Date().toISOString(),
                })

            if (updateError) throw updateError

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
                title="Preferences"
                description="Customize your experience"
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
                    <p className="text-sm text-on-surface">Preferences saved successfully!</p>
                </div>
            )}

            <Card className="border-outline">
                <CardHeader>
                    <CardTitle className="text-headline-small text-on-surface">
                        Appearance
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-on-surface">Theme</Label>
                        <Select
                            value={preferences.theme}
                            onValueChange={(value: 'light' | 'dark' | 'system') => handleThemeChange(value)}
                        >
                            <SelectTrigger className="bg-surface border-outline">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-surface border-outline">
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                                <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-on-surface-variant">
                            Choose how the app looks. System will use your device's settings.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-on-surface">Language</Label>
                        <Select
                            value={preferences.language}
                            onValueChange={(value) => setPreferences(prev => ({ ...prev, language: value }))}
                        >
                            <SelectTrigger className="bg-surface border-outline">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-surface border-outline">
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="sw">Swahili</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-on-surface">Timezone</Label>
                        <Select
                            value={preferences.timezone}
                            onValueChange={(value) => setPreferences(prev => ({ ...prev, timezone: value }))}
                        >
                            <SelectTrigger className="bg-surface border-outline">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-surface border-outline">
                                <SelectItem value="Africa/Nairobi">East Africa Time (EAT)</SelectItem>
                                <SelectItem value="Africa/Lagos">West Africa Time (WAT)</SelectItem>
                                <SelectItem value="Africa/Cairo">Egypt Standard Time</SelectItem>
                                <SelectItem value="UTC">UTC</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-outline">
                <CardHeader>
                    <CardTitle className="text-headline-small text-on-surface">
                        Notifications
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-on-surface">Email notifications</Label>
                            <p className="text-sm text-on-surface-variant">
                                Receive updates via email
                            </p>
                        </div>
                        <Switch
                            checked={preferences.email_notifications}
                            onCheckedChange={(checked) =>
                                setPreferences(prev => ({ ...prev, email_notifications: checked }))
                            }
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-on-surface">Push notifications</Label>
                            <p className="text-sm text-on-surface-variant">
                                Get real-time updates
                            </p>
                        </div>
                        <Switch
                            checked={preferences.push_notifications}
                            onCheckedChange={(checked) =>
                                setPreferences(prev => ({ ...prev, push_notifications: checked }))
                            }
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-on-surface">Marketing emails</Label>
                            <p className="text-sm text-on-surface-variant">
                                Receive product updates and tips
                            </p>
                        </div>
                        <Switch
                            checked={preferences.marketing_emails}
                            onCheckedChange={(checked) =>
                                setPreferences(prev => ({ ...prev, marketing_emails: checked }))
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
