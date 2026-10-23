# Payments

Rails: **M-PESA** (Daraja STK push per merchant, or a manually entered M-PESA code),
**PayPal** (platform account, USD), **PalPluss** (platform wallet top-ups and Reach orders).

Shared decision logic is in [`packages/merchant/src/payments.ts`](../packages/merchant/src/payments.ts)
(with tests); the routes do the I/O.

## Checkout (all rails)

`POST /api/store/[slug]/checkout` creates the order. It **recomputes every price on the
server** from `products`/`product_variants` (client prices are ignored), adds the
delivery rate, stores `order_items`, and returns the `orderNumber` (`ORD-…`) and `total`.
It is idempotent per `idempotencyKey`. Everything after this keys on the **order number**,
scoped to the store.

## M-PESA Daraja (STK push)

1. Client → `POST /payments/mpesa/stk-push` with `{ storeSlug, phone, orderId: <orderNumber> }`.
   Any `amount` in the body is ignored.
2. Server loads the order **by store and order number**, requires it to be pending, the
   phone to equal the phone the order was placed with, and no prompt in the last 60 s.
   It charges `ceil(order.total)`, then stores `daraja_checkout_request_id` and
   `daraja_pushed_at` on the order.
3. Safaricom posts the result to `/api/payments/mpesa/callback` (the URL is hard-coded
   to the **web** app and registered with Safaricom; do not move it casually).
4. The callback matches the order by `CheckoutRequestID` and ignores orders already `paid`.
   Its body is only a **hint**: the callback is unsigned and the `CheckoutRequestID` is also
   returned to the buyer's browser, so a forged "success" is possible. The order is marked
   `paid` only when the paid amount covers the total **and** Safaricom's STK Query
   (`confirmDarajaPayment`, `packages/merchant/src/daraja.ts`) confirms the transaction with the
   store's own credentials. A short amount records `payment_status: 'underpaid'` for a human;
   an unconfirmed success leaves the order pending.
5. The buyer's browser polls `GET /payments/mpesa/status?orderId=<orderNumber>`. While the order is
   still pending, the poll runs the same STK Query (at most every 8 s per order, after the prompt is
   10 s old) and settles it, so a callback that never arrived, or arrived before Safaricom could
   confirm, cannot strand a paid order. Callback and poll share `settleDarajaOrder`, which only
   reports success to the call that flipped the order, so the merchant is notified once.

Only web has a callback route (the storefront's copy was removed; Safaricom is registered against
web, and an unsigned callback endpoint on a second origin was only extra attack surface). The STK
Query response carries no receipt number, so an order settled by the poll alone has no
`mpesa_transaction_code`.

The manual path (`/api/store/[slug]/checkout/mpesa-code`) attaches a code the buyer typed;
the merchant confirms it by hand.

### Where a store's M-PESA details come from

`GET /api/store/[slug]/integrations` (used by checkout, the donate box and the Payments screen)
starts from the **org's** row in `org_integrations` and lets the store's own `store_integrations`
row override it. So a store that never saved its own M-PESA details shows its organization's
till or paybill at checkout. This is intentional (Spiritbulb's stores share one paybill), but:

- Nothing in the app edits `org_integrations`; rows are added in the database. Choosing which
  stores use them is SPI-70 (`store_integrations.inherited_from_org` exists but nothing sets it).
- Only the **manual** details travel this way. STK push, its confirmation and the credential
  test read `store_integrations` only, so org-level Daraja keys would show as on but never work.
- The Payments screen says when it is showing the org's details. The first save creates the
  store's own row, with the manual details always included so a Daraja-only save cannot drop them.

The Daraja credential test (`/api/store/[slug]/payments/mpesa/test-credentials`) asks Safaricom for a
token against the same environment as real payments (`DARAJA_ENV`), with typed keys or the saved ones.

Merchants set an order's payment status by hand only to `pending`, `paid`, `refunded` or `cancelled`
(`PAYMENT_STATUSES` in `components/store/order-logic.ts`, which `order-actions` validates against).
The list must stay inside `orders_status_check`; a test pins it.

## PayPal

1. `POST /payments/paypal/create-order` with `{ orderId: <orderNumber> }`. The PayPal order
   is **priced from the stored order lines and shipping**, converted to USD at a fixed rate
   (`KES_TO_USD`). Client-sent `items`/`totalKES` are ignored.
2. PayPal redirects the buyer to `GET /payments/paypal/capture-order?token=…`. (It is a
   GET because PayPal's redirect is; capture only succeeds for an order the payer approved.)
3. The route captures, loads the order, and marks it `paid` only if the captured USD
   amount equals what the order is priced at; otherwise `payment_status: 'underpaid'`.

## Wallet top-ups and Reach (PalPluss)

`POST /api/webhooks/palpluss` (wallet) and `/api/webhooks/palpluss/reach` treat the body
as a hint about *which* transaction changed. Status and amount are re-fetched from
PalPluss (`getTransaction`) before any credit or settlement, and a resolved top-up is
never processed twice.

## Invariants (do not break)

- An order becomes `paid` only from a provider-confirmed amount that covers its total.
- The amount charged always comes from the stored order, never the request.
- A provider callback never changes an order it did not initiate (match on a stored id).
- Settled orders are never re-processed.
- Webhook handlers acknowledge quickly and are safe to run twice.

## Known gaps

- The Daraja callback is unsigned (Safaricom does not sign it). The defence is confirming each
  success with STK Query before settling (step 4). A forged callback can still record a bogus
  receipt number if it arrives after a genuine payment and before the genuine callback.
  **Verify with a live STK payment**: the STK Query path has unit tests with a stubbed Daraja only.
- Web and storefront both carry copies of the other payment routes (kept identical). Moving the
  Daraja callback URL and PayPal return URL would let one app own them; see
  [CLEANUP.md](CLEANUP.md) §2.5.
- Orders were previously looked up by `id` while the client sent the order *number*, so
  the callback may never have matched in production. Verify a live STK payment end to end
  after deploying this change.
- The checkout page still references `pesapal` and `intasend` endpoints that do not exist.
