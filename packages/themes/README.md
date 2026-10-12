# @mcloud/themes

React storefront themes (currently `classic`). The Liquid pipeline renders public store
pages; these React pages are the **fallback** if a Liquid render throws, and still render
some routes (cart, checkout, product and service detail, blog).

`resolveTheme(themeId)` (`./resolver`) picks the theme components.

**Layering problem:** `src/classic/*` imports `apps/storefront` (`MdxContent`,
`WishlistButton`, `CopyButton`, `CartContext`, `CustomerAuthContext`, `lib/currency`) by
relative path. A package should not depend on an app; see
[docs/CLEANUP.md](../../docs/CLEANUP.md) §2.9. Until that is fixed, do not move or delete
those storefront files without checking this package.
