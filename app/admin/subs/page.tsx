// app/admin/subscriptions/page.tsx
import { auth0 } from "@/lib/auth0"
import { createClient } from "@/lib/client"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import SubscriptionsClient from "@/components/subscriptions-client"

export const metadata: Metadata = {
    title: "Subscriptions — Menengai Cloud Admin",
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

async function getSubscriptions() {
    const supabase = createClient()
    const { data } = await supabase
        .from("store_subscriptions")
        .select(`
            id,
            status,
            amount,
            currency,
            created_at,
            intasend_invoice_id,
            intasend_tracking_id,
            stores (
                id,
                name,
                slug,
                is_pro
            )
        `)
        .order("created_at", { ascending: false })

    return (data ?? []).map(row => ({
        ...row,
        stores: Array.isArray(row.stores) ? row.stores[0] ?? null : row.stores,
    }))
}

export default async function SubscriptionsPage() {
    const session = await auth0.getSession()

    if (!session?.user) {
        redirect(`${process.env.APP_BASE_URL}/auth/login?returnTo=/admin/subs`)
    }

    const role = await getRole(session.user.sub)

    if (role !== "admin") {
        return (
            <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4">
                <div className="text-center space-y-3 max-w-sm">
                    <p className="text-4xl">🔒</p>
                    <h1 className="text-xl font-semibold text-foreground">Access denied</h1>
                    <p className="text-sm text-muted-foreground">
                        You need admin access to view subscriptions.
                        You&apos;re signed in as <span className="font-mono text-xs">{session.user.email}</span>.
                    </p>
                    <a href="/auth/logout" className="inline-block text-sm text-primary hover:underline mt-2">
                        Sign in with a different account
                    </a>
                </div>
            </div>
        )
    }

    const subscriptions = await getSubscriptions()
    return <SubscriptionsClient subscriptions={subscriptions} />
}