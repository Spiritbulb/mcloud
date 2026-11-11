// The row a brand-new store is inserted with. Pure, so it is unit-tested.

/**
 * The layout new stores start on. Mirrors UPGRADE_TARGET in
 * apps/storefront/lib/store-themes.ts, which this package cannot import (packages
 * never import apps). Its default colours are Classic, which is what the storefront
 * renders with no store_themes row, so no theme row is written here.
 */
export const NEW_STORE_THEME = 'classic-2'

export function newStoreRow(input: { name: string; slug: string; orgId: string; userId: string; type: string }) {
  return {
    name: input.name,
    slug: input.slug,
    org_id: input.orgId,
    owner_id: input.userId,
    type: input.type,
    settings: { themeId: NEW_STORE_THEME },
  }
}
