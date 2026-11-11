// The dashboard's Preview opens the Editor with ?theme=<id>. The Editor applies it once
// as an unsaved edit and then drops it from the address bar, so a reload never
// re-applies it over whatever the merchant saved meanwhile.
export function withoutThemeParam(href: string): string {
    const url = new URL(href)
    url.searchParams.delete('theme')
    return url.toString()
}
