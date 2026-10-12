# @mcloud/merchant

Logic shared by `apps/web` and `apps/storefront`. Put code here instead of copying it
between apps.

- `stores`: store/org roles and access (`requireStoreAccess`, `requireStoreAccessById`, `canManage`), slug rules (`RESERVED_STORE_SLUGS`), store creation
- `store-data`: the settings/overview data loaders
- `plans`, `plans-server`: plan limits and feature gating
- `payments`: pure payment rules (amount checks, phone normalisation, PayPal pricing); see [docs/payments.md](../../docs/payments.md)
- `logistics-data`: delivery zones/options and order tracking
- `seed-pages`: default pages for a new store (from `@mcloud/verticals`)
- `storefront-url`: the only place the storefront host is named
- `org-context`: React context for the org/store switcher

Tests: `npm test -w @mcloud/merchant`.
