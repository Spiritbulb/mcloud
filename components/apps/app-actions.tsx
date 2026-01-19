// /components/apps/app-actions.tsx
"use client"

import { useState } from "react"
import { Trash2, MoreVertical, Archive, Play } from "lucide-react"
import { createClient } from "@/lib/client"
import { useRouter } from "next/navigation"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AppActionsProps {
    app: any
    slug: string
}

export function AppActions({ app, slug }: AppActionsProps) {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this app? This action cannot be undone.')) {
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase
                .from('apps')
                .delete()
                .eq('id', app.id)

            if (error) throw error

            router.push(`/${slug}/apps`)
        } catch (error) {
            console.error('Error deleting app:', error)
            alert('Failed to delete app')
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = async (status: string) => {
        setLoading(true)
        try {
            const { error } = await supabase
                .from('apps')
                .update({ status })
                .eq('id', app.id)

            if (error) throw error

            router.refresh()
        } catch (error) {
            console.error('Error updating status:', error)
            alert('Failed to update status')
        } finally {
            setLoading(false)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className="google-button-secondary py-2 px-3 text-body-medium"
                    disabled={loading}
                >
                    <MoreVertical className="h-4 w-4" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                {app.status === 'archived' ? (
                    <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                        <Play className="h-4 w-4 mr-2" />
                        Activate
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem onClick={() => handleStatusChange('archived')}>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-red-600 dark:text-red-400"
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete App
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
