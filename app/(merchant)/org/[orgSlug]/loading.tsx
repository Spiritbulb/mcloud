// Instant skeleton for the org dashboard while the server resolves
// session + org + stores. Mirrors the real layout so navigation feels immediate.
function Sk({ className }: { className?: string }) {
    return <span className={`block animate-pulse rounded-lg bg-[var(--md-sys-color-surface-variant)] ${className ?? ''}`} />
}

export default function Loading() {
    return (
        <div className="min-h-[100dvh] bg-[var(--md-sys-color-surface)] px-6 md:px-10 py-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <Sk className="h-40 rounded-2xl" />
                <div className="flex gap-3">
                    {Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="h-32 w-40 rounded-xl shrink-0" />)}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="h-20 rounded-xl" />)}
                </div>
                <Sk className="h-48 rounded-2xl" />
            </div>
        </div>
    )
}
