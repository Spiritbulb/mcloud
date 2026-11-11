# WhatsApp merchant bot

Merchants message the platform's WhatsApp Business number to **see orders** and **create a store**.
User-initiated only: replies stay inside WhatsApp's 24 hour window, so no message templates.
Design and decisions: [the spec](superpowers/specs/2026-11-09-whatsapp-merchant-bot-design.md).

## How it fits together

| Piece | Where |
|---|---|
| Webhook (`GET` handshake, `POST` messages) | `apps/web/app/api/webhooks/whatsapp/route.ts`, `@route-kind: webhook` |
| Orchestration of one message (dedupe, linking, rate limit, errors) | `apps/web/lib/whatsapp/handle.ts` (ports in, tested with fakes) |
| Real database access | `apps/web/lib/whatsapp/whatsapp-store.ts` |
| Real bot dependencies (as the linked user) | `apps/web/lib/whatsapp/deps.ts` |
| Pure core: signature, parser, payload limits, state machine | `packages/whatsapp` |
| "Which stores / orgs can this userId reach" | `packages/merchant/src/user-stores.ts` |
| Connect and disconnect UI | Org settings, `settings/whatsapp-panel.tsx` + `whatsapp-actions.ts` |
| Tables and the redeem function | `migrations/20261109_whatsapp_merchant_bot.sql` |

## Identity

A number is linked to a **person**, not an org. In org settings the merchant generates a one time
8 digit code (10 minutes, hashed in the database) and sends `LINK <code>` from WhatsApp.
Redemption is one database function (`whatsapp_redeem_link_code`), so two attempts cannot both win.
Five wrong codes per number per hour block further attempts.

The bot then acts **as that user**. Orders go through `listOrders` (`requireStoreAccess`), store
creation through `createStoreForUser` (owner or admin), and the org is re-checked in `deps.ts`
because the id arrives as a tapped list row. A message can never name a user, store or price.

## Conversation

`menu`, `orders`, `new`, `help` work from any step. Orders: pick a store (typing filters when there are
more than 10), then an order for its detail (read only). New store: pick an org if there are several,
send the name, the slug is generated from it (`slug-candidates.ts`: `-2`, `-3`, ... on collision).
The state machine is `packages/whatsapp/src/bot-logic.ts`: pure, every step covered in `bot.test.ts`.
Copy avoids dashes (house rule).

To add a feature, add a `Need` and its result type, handle it in `advance`/`resolve`, implement it
in `deps.ts`, and add tests. `handle.ts` does not change.

## Setup (one time)

1. Meta app with the WhatsApp product, a registered number, and a permanent **system user** token.
2. Set the `WHATSAPP_*` variables on `apps/web` (names in [environment.md](environment.md)).
3. Apply `migrations/20261109_whatsapp_merchant_bot.sql` with `npm run db:migrate`, then regenerate types
   (`npm run sb-typegen -w @mcloud/web`) and delete the untyped `db()` seam in `whatsapp-store.ts`.
4. In Meta, set the webhook callback to `https://mcloud.co.ke/api/webhooks/whatsapp`, the verify token
   to `WHATSAPP_VERIFY_TOKEN`, and subscribe to the `messages` field.

Unset variables: the webhook answers 503 and the settings panel says WhatsApp is not set up.

## Known limits

- Idempotency records the message id before processing. If the process dies in between, Meta's retry is
  skipped and the merchant just resends.
- `whatsapp_messages` and `whatsapp_link_attempts` grow without bound. Add a cron prune (a few days) when
  volume justifies it.
- Orders are the newest 10 and detail is looked up in the newest 100, matching the mobile API.
- Outbound sends outside the 24 hour window fail and are dropped (logged). Pushing notifications needs templates.
