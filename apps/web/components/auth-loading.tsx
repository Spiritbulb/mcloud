// Dark branded loading screen shown during auth redirects (Auth0 round-trip).
// Kills the white flash between menengai.cloud and auth.menengai.cloud.
export function AuthLoading({ label = 'Signing you in…' }: { label?: string }) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#0a0a0a] text-white">
            <img
                src="/icons/icon-192.png"
                alt="Menengai Cloud"
                className="h-16 w-16 rounded-2xl animate-pulse"
            />
            <div className="flex flex-col items-center gap-3">
                <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-[#3fa9f5] animate-spin" />
                <p className="text-[13px] text-white/55">{label}</p>
            </div>
        </div>
    )
}
