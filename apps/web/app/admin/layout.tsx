import { getSession } from '@mcloud/auth/server'
import { createClient } from "@mcloud/db/client"
import { redirect } from "next/navigation"
import AdminShell from "@/components/admin/admin-shell"

async function getAdminUser(sub: string) {
    const supabase = createClient()
    const { data } = await supabase
        .from("users")
        .select("id, name, email, avatar_url, role")
        .eq("id", sub)
        .single()
    return data
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getSession()

    if (!session?.user) {
        redirect(`/auth/login?returnTo=/admin`)
    }

    const user = await getAdminUser(session.user.id)

    if (user?.role !== "admin") {
        return (
            <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4">
                <div className="text-center space-y-3 max-w-sm">
                    <div className="w-12 h-12 rounded-full bg-[var(--md-sys-color-error-container)] flex items-center justify-center mx-auto">
                        <span className="material-symbols-outlined text-[22px] text-[var(--md-sys-color-on-error-container)]">
                            lock
                        </span>
                    </div>
                    <h1 className="text-xl font-semibold text-foreground">Access denied</h1>
                    <p className="text-sm text-muted-foreground">
                        You need admin access to view this page.
                        Signed in as{' '}
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                            {session.user.email}
                        </span>
                    </p>
                    <a
                        href="/auth/logout"
                        className="inline-block text-sm text-primary hover:underline underline-offset-4"
                    >
                        Sign in with a different account
                    </a>
                </div>
            </div>
        )
    }

    return (
        <AdminShell
            user={{
                name: user.name ?? session.user.name ?? 'Admin',
                email: user.email ?? session.user.email ?? '',
                avatarUrl: user.avatar_url ?? undefined,
            }}
        >
            {children}
        </AdminShell>
    )
}
