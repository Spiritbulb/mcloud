// app/docs-editor/page.tsx
// Server component — checks Auth0 session + admin role before rendering.
// Non-authed users get redirected to login.
// Authed non-admins get a 403 page rather than the editor.

import { auth0 } from "@/lib/auth0"
import { createClient } from "@/lib/client"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import DocsEditorClient from "@/components/docs-editor-client"
import type { EditablePage } from "@/components/docs-editor-client"

export const metadata: Metadata = {
    title: "Docs Editor — Menengai Cloud",
    robots: { index: false, follow: false },
}

async function getRole(auth0Sub: string): Promise<string | null> {
    const supabase = createClient()
    const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", auth0Sub)
        .single()
    return data?.role ?? null
}

async function getDocs(): Promise<EditablePage[]> {
    const supabase = createClient()
    const { data } = await supabase
        .from("docs_pages")
        .select("data")
        .order("position", { ascending: true })
    return (data ?? []).map((row) => row.data as EditablePage)
}

export default async function DocsEditorPage() {
    const session = await auth0.getSession()

    // Not logged in → send to Auth0 login, return here after
    if (!session?.user) {
        redirect("/api/auth/login?returnTo=/docs-editor")
    }

    const role = await getRole(session.user.sub)

    // Logged in but not an admin → show a clear rejection
    if (role !== "admin") {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-4">
                <div className="text-center space-y-3 max-w-sm">
                    <p className="text-4xl">🔒</p>
                    <h1 className="text-xl font-semibold text-foreground">Access denied</h1>
                    <p className="text-sm text-muted-foreground">
                        You need admin access to use the Docs Editor.
                        You&apos;re signed in as <span className="font-mono text-xs">{session.user.email}</span>.
                    </p>
                    <a
                        href="/api/auth/logout"
                        className="inline-block text-sm text-primary hover:underline mt-2"
                    >
                        Sign in with a different account
                    </a>
                </div>
            </div>
        )
    }

    // Admin — fetch docs and render editor
    const initialDocs = await getDocs()
    return <DocsEditorClient initialDocs={initialDocs} />
}