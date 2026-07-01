// @mcloud/liquid — shared Liquid rendering for storefront + web.
import { engine } from './engine'

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
