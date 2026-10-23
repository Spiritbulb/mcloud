// Dev-only gallery of the shared UI kit (@mcloud/ui/kit): every piece and its loading, error and
// empty states, so the kit can be checked and screenshotted without signing in. 404s in production.
import { notFound } from "next/navigation"
import AdminShell from "@/components/admin/admin-shell"
import KitGallery from "./kit-gallery"

export const dynamic = "force-dynamic"

export default function DevKitPage() {
    if (process.env.NODE_ENV === "production") notFound()
    return (
        <AdminShell user={{ name: "Preview Admin", email: "preview@example.com" }}>
            <div className="overflow-y-auto flex-1 px-6 md:px-10 py-8">
                <KitGallery />
            </div>
        </AdminShell>
    )
}
