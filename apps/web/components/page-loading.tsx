// Lightweight, theme-aware page loading state shown instantly on navigation
// (via route-level loading.tsx) so taps feel responsive while the server fetches.
export function PageLoading() {
    return (
        <div className="min-h-[60vh] w-full flex items-center justify-center bg-[var(--md-sys-color-surface)]">
            <div className="flex flex-col items-center gap-3">
                <div className="h-6 w-6 rounded-full border-2 border-[var(--md-sys-color-outline-variant)] border-t-[var(--md-sys-color-primary)] animate-spin" />
            </div>
        </div>
    )
}
