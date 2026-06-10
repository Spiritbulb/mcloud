// Instant skeleton for the store settings overview while the shell + overview load.
function Sk({ className }: { className?: string }) {
    return <span className={`block animate-pulse rounded-lg bg-[var(--md-sys-color-surface-variant)] ${className ?? ''}`} />
}

export default function Loading() {
    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-16 pt-2">
            <Sk className="h-36 rounded-2xl" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="h-24 rounded-2xl" />)}
            </div>
            <Sk className="h-28 rounded-2xl" />
            <Sk className="h-20 rounded-2xl" />
            <Sk className="h-48 rounded-2xl" />
        </div>
    )
}
