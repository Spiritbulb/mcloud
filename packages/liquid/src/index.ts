// @mcloud/liquid — shared Liquid rendering for storefront + web.
import { engine } from './engine'
import { themeFiles } from './themes-manifest'

export { engine }
export { themeFiles } from './themes-manifest'

/**
 * Render a bundled Liquid template to an HTML string.
 * @param templateKey manifest key, e.g. 'classic/templates/index' (no extension)
 * @param context     plain objects the template interpolates (store, products, …)
 */
export function renderTemplate(templateKey: string, context: Record<string, unknown>): Promise<string> {
    return engine.renderFile(templateKey, context)
}

/** Is there a bundled template at this manifest key (no extension)? */
export function hasTemplate(key: string): boolean {
    return key in themeFiles
}

/**
 * The theme folders that ship a home page: every `<id>/sections/hero`, sorted,
 * with `classic` first because it is the fallback every other theme leans on.
 */
export function themeIds(): string[] {
    const ids = Object.keys(themeFiles)
        .filter((k) => k.endsWith('/sections/hero'))
        .map((k) => k.slice(0, -'/sections/hero'.length))
        .sort()
    return ['classic', ...ids.filter((id) => id !== 'classic')]
}
