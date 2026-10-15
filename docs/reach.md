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

## Areas and approval

- **Areas** (`reach_areas`): a two-level list (town > area) the Reach admin maintains from the app. A store has
  a home area plus optional delivery areas (`reach_vendor_areas`). Coverage is hierarchical
  (`@mcloud/merchant/reach-areas`): serving a town covers its areas, and a buyer who picked a town sees every
  store in it. Siblings do not serve each other. Buyers choose their area in the app; the app can suggest the
  nearest one from GPS (`nearestArea`). `GET /reach/products?area=` and order creation both enforce it.
- **Approval** (`reach_vendors.approval_status`, rules in `@mcloud/merchant/reach-approval`): owner requests
  from the dashboard (needs a home area) -> `pending` -> admin `approve` / `reject` (reason required) ->
  `approved`; `suspend` / `reinstate` later. Buyers only see `isSellable` vendors (active, listed, approved,
  placed). Unapproved stores can still create keys and prepare stock. Moving an approved store's home area
  sends it back to `pending`. Stores that were listed before approvals existed were grandfathered as approved;
  hand-made (legacy) vendors with no area sell everywhere until placed.
- **Delivery details**: an order must carry the buyer's area and an address (`orders.shipping_address`); vendors
  see where to deliver and the buyer's phone only for orders containing their items.

## Reach admin (in the app)

Platform admins (`users.role = 'admin'`, reported as `isAdmin` by `/api/mobile/me`) get admin screens backed by
`/api/mobile/reach/admin/*`, all behind `requireReachAdmin` (`lib/reach/admin.ts`): review and decide listing
requests, manage areas, and see money. Pushes go to admins on a new request, to a store on a decision, a payout
or a paid order (`lib/reach/notify.ts`, over the existing `device_push_tokens` / `sendPushToUsers`).

## Money


Unchanged: `docs/payments.md` rules apply. Every Reach order is created in the marketplace store
(`REACH_STORE_ID`, `lib/reach/store-config.ts`), priced with its markup and fee, paid through
PalPluss into `reach_payments`, with one `reach_vendor_payouts` row per vendor (their base prices),
`held` until the vendor marks their part delivered. Products from different stores can share an
order. The vendor sees only their own lines (`ownedProductIds`).

**Earnings** (`reach_finance_summary`): `gross` is what buyers paid for paid Reach orders, `vendor_share` what
those orders owe stores (their own prices), `reach_earned = gross - vendor_share` (markup and service fees).
Vendor share is `held` until the store marks the order delivered, then `owed` until you pay it, then
`paid_out`. Payouts are manual: send M-Pesa to the store's `payout_phone` (set on the dashboard), then record it
with `POST /admin/payouts` (`reach_mark_vendor_paid`): it settles every delivered order the store was owed for
under your M-Pesa reference, and cannot pay an order twice.

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

Migrations: `20261015_reach_store_link.sql` (applied), `20261016_reach_areas_approvals_finance.sql` (apply before
deploying the area/approval code), `20261015b_munch_hub_store.sql` (one-off; edit `v_area_slug` first).
