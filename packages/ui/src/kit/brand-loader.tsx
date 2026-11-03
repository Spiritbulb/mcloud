import { cn } from '../utils'

// Branded loading state for route `loading.tsx` files: the PWA icon breathing over a soft ripple,
// with a sweeping bar under it. It fades in after a short delay so a fast navigation never
// flashes it. The icon is served from each app's `public/icons/` (both apps ship a copy).
//
// `fullscreen` covers the viewport (use it above a layout that renders no chrome yet);
// otherwise it fills the content area of a shell that is already on screen.

const css = `
@keyframes mc-loader-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes mc-loader-breathe { 0%, 100% { transform: scale(.94) } 50% { transform: scale(1) } }
@keyframes mc-loader-ripple { 0% { transform: scale(.9); opacity: .45 } 100% { transform: scale(1.9); opacity: 0 } }
@keyframes mc-loader-sweep { 0% { transform: translateX(-100%) } 100% { transform: translateX(250%) } }
.mc-loader { opacity: 0; animation: mc-loader-in .3s ease-out .15s forwards }
.mc-loader-icon { animation: mc-loader-breathe 1.6s ease-in-out infinite }
.mc-loader-ripple { animation: mc-loader-ripple 1.6s cubic-bezier(.2,.6,.3,1) infinite }
.mc-loader-ripple-2 { animation-delay: .8s }
.mc-loader-bar { animation: mc-loader-sweep 1.2s ease-in-out infinite }
@media (prefers-reduced-motion: reduce) {
  .mc-loader { animation-duration: 0s }
  .mc-loader-icon, .mc-loader-ripple, .mc-loader-bar { animation: none }
  .mc-loader-ripple { opacity: 0 }
}
`

export function BrandLoader({
    label = 'Loading…',
    fullscreen = false,
    className,
}: {
    label?: string
    fullscreen?: boolean
    className?: string
}) {
    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                'mc-loader flex flex-col items-center justify-center gap-6',
                fullscreen ? 'fixed inset-0 z-50 bg-background' : 'min-h-[60vh] w-full',
                className,
            )}
        >
            <style>{css}</style>
            <div className="relative h-16 w-16">
                <span aria-hidden className="mc-loader-ripple absolute inset-0 rounded-[22%] bg-[#3fa9f5]" />
                <span aria-hidden className="mc-loader-ripple mc-loader-ripple-2 absolute inset-0 rounded-[22%] bg-[#3fa9f5]" />
                <img
                    src="/icons/icon-192.png"
                    alt=""
                    width={64}
                    height={64}
                    className="mc-loader-icon relative h-16 w-16 rounded-[22%] shadow-lg shadow-[#3fa9f5]/25"
                />
            </div>
            <div aria-hidden className="h-1 w-24 overflow-hidden rounded-full bg-muted">
                <div className="mc-loader-bar h-full w-2/5 rounded-full bg-[#3fa9f5]" />
            </div>
            <span className="sr-only">{label}</span>
        </div>
    )
}
