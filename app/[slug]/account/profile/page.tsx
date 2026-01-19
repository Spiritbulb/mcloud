"use client"

import { useEffect, useState } from "react"
import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const [profile, setProfile] = useState({
        full_name: "",
        email: "",
        phone: "",
        bio: "",
        avatar_url: "",
        company: "",
    })

    useEffect(() => {
        loadProfile()
    }, [])

    const loadProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/auth/login')
                return
            }

            const { data: profileData, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (profileError && profileError.code !== 'PGRST116') {
                throw profileError
            }

            setProfile({
                full_name: profileData?.full_name || '',
                email: user.email || '',
                phone: profileData?.phone || '',
                bio: profileData?.bio || '',
                avatar_url: profileData?.avatar_url || '',
                company: profileData?.company || '',
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

            const { error: updateError } = await supabase
                .from('user_profiles')
                .upsert({
                    id: user.id,
                    full_name: profile.full_name,
                    phone: profile.phone,
                    bio: profile.bio,
                    company: profile.company,
                    avatar_url: profile.avatar_url,
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

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        setError(null)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}-${Math.random()}.${fileExt}`
            const filePath = `avatars/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('profiles')
                .upload(filePath, file, { upsert: true })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('profiles')
                .getPublicUrl(filePath)

            setProfile(prev => ({ ...prev, avatar_url: publicUrl }))

            const { error: updateError } = await supabase
                .from('user_profiles')
                .upsert({
                    id: user.id,
                    avatar_url: publicUrl,
                    updated_at: new Date().toISOString(),
                })

            if (updateError) throw updateError
        } catch (err: any) {
            setError(err.message)
        } finally {
            setUploading(false)
        }
    }

    const handleRemoveAvatar = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            setProfile(prev => ({ ...prev, avatar_url: '' }))

            const { error: updateError } = await supabase
                .from('user_profiles')
                .upsert({
                    id: user.id,
                    avatar_url: null,
                    updated_at: new Date().toISOString(),
                })

            if (updateError) throw updateError
        } catch (err: any) {
            setError(err.message)
        }
    }

    const getInitials = () => {
        const name = profile.full_name || profile.email
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'U'
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
                title="Profile"
                description="Manage your personal information"
            />

            {error && (
                <div className="p-4 rounded-lg bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
            )}

            {success && (
                <div className="p-4 rounded-lg bg-green-100 dark:bg-green-950 border border-green-300 dark:border-green-800">
                    <p className="text-sm text-green-700 dark:text-green-400">Profile updated successfully!</p>
                </div>
            )}

            <Card className="border-none shadow-none">
                <CardHeader>
                    <CardTitle className="text-headline-small text-on-surface">
                        Personal Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={profile.avatar_url} />
                            <AvatarFallback className="bg-primary text-white text-2xl">
                                {getInitials()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <input
                                type="file"
                                id="avatar-upload"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarUpload}
                                disabled={uploading}
                            />
                            <label htmlFor="avatar-upload">
                                <button
                                    type="button"
                                    className="google-button-primary py-2 px-4 text-sm mr-2"
                                    disabled={uploading}
                                    onClick={() => document.getElementById('avatar-upload')?.click()}
                                >
                                    {uploading ? 'Uploading...' : 'Upload Photo'}
                                </button>
                            </label>
                            <button
                                type="button"
                                className="google-button-secondary py-2 px-4 text-sm"
                                onClick={handleRemoveAvatar}
                                disabled={!profile.avatar_url}
                            >
                                Remove
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="full_name" className="text-on-surface">
                            Full Name
                        </Label>
                        <Input
                            id="full_name"
                            value={profile.full_name}
                            onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                            placeholder="Your full name"
                            className="bg-surface border-outline"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-on-surface">
                            Email
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={profile.email}
                            disabled
                            className="bg-surface-variant border-outline opacity-60 cursor-not-allowed"
                        />
                        <p className="text-xs text-on-surface-variant">
                            Email cannot be changed here. Contact support to update.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-on-surface">
                            Phone Number
                        </Label>
                        <Input
                            id="phone"
                            value={profile.phone}
                            onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="+254 712 345 678"
                            className="bg-surface border-outline"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="company" className="text-on-surface">
                            Company
                        </Label>
                        <Input
                            id="company"
                            value={profile.company}
                            onChange={(e) => setProfile(prev => ({ ...prev, company: e.target.value }))}
                            placeholder="Spiritbulb LTD"
                            className="bg-surface border-outline"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="bio" className="text-on-surface">
                            Bio
                        </Label>
                        <Input
                            id="bio"
                            value={profile.bio}
                            onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                            placeholder="Tell us about yourself"
                            className="bg-surface border-outline"
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
