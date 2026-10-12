// Picks the logo variant with CSS (`.dark` on <html>) instead of JS state, so the
// right one is visible on first paint. Both are in the HTML; one is display:none.
export function ThemedLogo({ className, alt = 'Menengai Cloud' }: { className?: string; alt?: string }) {
    return (
        <>
            <img src="/logo-dark.svg" alt={alt} className={`${className ?? ''} dark:hidden`} />
            <img src="/logo-light.svg" alt={alt} className={`${className ?? ''} hidden dark:block`} />
        </>
    )
}
