# Reach marketplace

Reach is the mobile marketplace (the `reach` Expo app, in its own repo). Its backend is `apps/web`
(`/api/mobile/reach/*`, `lib/reach`) and its vendor controls are in the **store dashboard**
(`apps/storefront`, Settings → Reach marketplace). A Reach vendor *is* an mcloud store.

## How a store becomes a vendor

1. **List.** The owner/admin turns on "List my store" (`lib/admin/reach-actions.ts`
   `setReachListed`). That creates the store's `reach_vendors` row (`store_id`, unique) and sets
   `listed`. Only commerce stores that are active can list (`canListOnReach`).
2. **Marketplace.** `GET /reach/products` returns every active product of every listed store
   (plus the legacy products below), with `vendorName`, `storeSlug`, `storeUrl`. Unlisting hides the
   products; keys keep working so orders already placed can be finished.
3. **Keys.** The dashboard issues store keys (`RCH-XXXX-XXXX-XXXX`, `generateStoreKey` in
   `@mcloud/merchant/reach`, max 10 active). A person enters one in the app
   (`POST /reach/confirm-vendor` → `reach_confirm_vendor`), which records them in
   `reach_vendor_members`. One vendor per user.
4. **Revoke.** `vendorFor()` (`apps/web/lib/reach/vendor.ts`) requires the member's key *and* the
   vendor to be active, so revoking a key ends that person's access on their next request. The app
   calls `GET /reach/vendor/me` on the dashboard and returns to the key screen on 403.

## Money

Unchanged: `docs/payments.md` rules apply. Every Reach order is created in the marketplace store
(`REACH_STORE_ID`, `lib/reach/store-config.ts`), priced with its markup and fee, paid through
PalPluss into `reach_payments`, with one `reach_vendor_payouts` row per vendor (their base prices),
`held` until the vendor marks their part delivered. Products from different stores can share an
order. The vendor sees only their own lines (`ownedProductIds`).

A store's own dashboard Orders tab does **not** show Reach orders (they belong to the marketplace
store). Vendors see them in the app.

## Legacy vendors

Vendors made by hand before this (`store_id` null, e.g. Munch Hub) keep working: their products live
in the marketplace store and are assigned in `reach_product_vendors`. `vendorForProduct`
(`lib/reach/catalog-logic.ts`) holds the one rule for who sells a product. To move one onto a real
store, set its `store_id` and move the products; nothing does that automatically.

## Rebrand

Not done yet, on purpose. Storefront URLs come from `storefrontUrl()` (`@mcloud/merchant/storefront-url`)
and the app's API origin is one constant in `src/lib/api.ts`, so the move off mcloud hosts is a
config change in those two places plus the storefront theme.

Migration: `migrations/20261015_reach_store_link.sql` (apply before deploying).
