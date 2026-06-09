// Instant skeleton matching the analytics layout — shows the moment you navigate,
// before the client fetches data, so the tab never feels frozen.
function Sk({ className }: { className?: string }) {
    return <span className={`block animate-pulse rounded-lg bg-[var(--md-sys-color-surface-variant)] ${className ?? ''}`} />
}

export default function Loading() {
    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-16 pt-2">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Sk className="h-5 w-28" />
                    <Sk className="h-3 w-20" />
                </div>
                <Sk className="h-8 w-44 rounded-full" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-28 rounded-2xl" />)}
            </div>
            <Sk className="h-[260px] w-full rounded-2xl" />
            <div className="grid md:grid-cols-2 gap-4">
                <Sk className="h-48 rounded-2xl" />
                <Sk className="h-48 rounded-2xl" />
            </div>
        </div>
    )
}
