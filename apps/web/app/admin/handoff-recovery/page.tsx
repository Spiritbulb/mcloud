import type { Metadata } from "next"
import { getStranded } from "./data"
import RecoveryClient from "./recovery-client"

export const metadata: Metadata = {
    title: "Handoff recovery — Menengai Cloud Admin",
    robots: { index: false, follow: false },
}

// Always live: the list shrinks as people get through.
export const dynamic = "force-dynamic"

export default async function HandoffRecoveryPage() {
    const stranded = await getStranded()
    return (
        <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">
            <RecoveryClient
                people={stranded}
                resendConfigured={Boolean(process.env.RESEND_API_KEY)}
            />
        </div>
    )
}
