"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"

export default function SecurityPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const [passwordData, setPasswordData] = useState({
        new: "",
        confirm: "",
    })

    const [sessions, setSessions] = useState<any[]>([])

    useEffect(() => {
        loadSessions()
    }, [])

    const loadSessions = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/auth/login')
                return
            }

            const { data: sessionsData } = await supabase
                .from('user_sessions')
                .select('*')
                .eq('user_id', user.id)
                .order('last_active', { ascending: false })

            setSessions(sessionsData || [])
        } catch (err: any) {
            console.error('Error loading sessions:', err.message)
        } finally {
            setLoading(false)
        }
    }

    const handlePasswordUpdate = async () => {
        setError(null)
        setSuccess(null)

        if (passwordData.new !== passwordData.confirm) {
            setError("New passwords don't match")
            return
        }

        if (passwordData.new.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }

        setUpdating(true)

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: passwordData.new
            })

            if (updateError) throw updateError

            setSuccess("Password updated successfully")
            setPasswordData({ new: "", confirm: "" })

            setTimeout(() => setSuccess(null), 3000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setUpdating(false)
        }
    }

    const handleRevokeSession = async (sessionId: string) => {
        try {
            const { error: deleteError } = await supabase
                .from('user_sessions')
                .delete()
                .eq('id', sessionId)

            if (deleteError) throw deleteError

            setSessions(prev => prev.filter(s => s.id !== sessionId))
            setSuccess("Session revoked successfully")
            setTimeout(() => setSuccess(null), 3000)
        } catch (err: any) {
            setError(err.message)
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
                title="Security"
                description="Manage your password and authentication settings"
            />

            {error && (
                <div className="p-4 rounded-lg bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
            )}

            {success && (
                <div className="p-4 rounded-lg bg-green-100 dark:bg-green-950 border border-green-300 dark:border-green-800">
                    <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
                </div>
            )}

            <Card className="border-outline">
                <CardHeader>
                    <CardTitle className="text-headline-small text-on-surface">
                        Change Password
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="new" className="text-on-surface">
                            New Password
                        </Label>
                        <Input
                            id="new"
                            type="password"
                            value={passwordData.new}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                            placeholder="Enter new password"
                            className="bg-surface border-outline"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirm" className="text-on-surface">
                            Confirm New Password
                        </Label>
                        <Input
                            id="confirm"
                            type="password"
                            value={passwordData.confirm}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                            placeholder="Confirm new password"
                            className="bg-surface border-outline"
                        />
                    </div>

                    <button
                        type="button"
                        className="google-button-primary py-2 px-4 text-body-medium disabled:opacity-50"
                        onClick={handlePasswordUpdate}
                        disabled={updating || !passwordData.new || !passwordData.confirm}
                    >
                        {updating ? 'Updating...' : 'Update Password'}
                    </button>
                </CardContent>
            </Card>

            <Card className="border-outline">
                <CardHeader>
                    <CardTitle className="text-headline-small text-on-surface">
                        Two-Factor Authentication
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-on-surface">Enable 2FA</Label>
                            <p className="text-sm text-on-surface-variant">
                                Add an extra layer of security to your account
                            </p>
                        </div>
                        <Switch disabled />
                    </div>

                    <p className="text-xs text-on-surface-variant italic">
                        Two-factor authentication coming soon
                    </p>
                </CardContent>
            </Card>

            <Card className="border-outline">
                <CardHeader>
                    <CardTitle className="text-headline-small text-on-surface">
                        Active Sessions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {sessions.length === 0 ? (
                        <p className="text-sm text-on-surface-variant">No active sessions found</p>
                    ) : (
                        <div className="space-y-3">
                            {sessions.map((session) => (
                                <div
                                    key={session.id}
                                    className="flex items-center justify-between p-4 rounded-lg border border-outline"
                                >
                                    <div>
                                        <p className="font-medium text-on-surface">
                                            {session.device_name || `${session.browser} on ${session.os}`}
                                        </p>
                                        <p className="text-sm text-on-surface-variant">
                                            {session.location || session.ip_address || 'Unknown location'}
                                            {session.is_current && " • Current session"}
                                        </p>
                                        <p className="text-xs text-on-surface-variant mt-1">
                                            Last active: {new Date(session.last_active).toLocaleString()}
                                        </p>
                                    </div>
                                    {!session.is_current && (
                                        <button
                                            type="button"
                                            className="google-button-secondary py-2 px-4 text-sm"
                                            onClick={() => handleRevokeSession(session.id)}
                                        >
                                            Revoke
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
