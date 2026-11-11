# WhatsApp merchant bot (v1, user-initiated)

Status: implemented on `feat/whatsapp-merchant-bot`, pending review. The migration is written but **not applied**
to any database, and no Meta credentials were available, so nothing has talked to WhatsApp yet. See "Verification" below.

## Goal

A merchant messages the platform's WhatsApp Business number and, through a menu, can:

1. **See orders** for any store they can access.
2. **Create a new store** by giving only a name (the slug is generated).

Editing the store afterwards happens in the mobile app or on the web. v1 is
**user-initiated only**: the bot replies inside WhatsApp's 24 hour customer-service window,
so no message templates and no Meta template approval are needed.

Out of scope for v1 (all can be added to the same state machine later): order status changes,
product management, pushed notifications (needs templates), shoppers messaging a store,
free-text or LLM understanding, creating an organisation.

## Decisions (agreed in review)

| Question | Decision |
|---|---|
| Who is the "user"? | The merchant texting the platform number, not a shopper. |
| Identity | Explicit link: the merchant gets a one-time code in the web org settings and sends `LINK <code>` from WhatsApp. This proves they control the number. |
| Link scope | **One link per user** (not per org). The bot acts *as that user*, so existing roles apply. Orgs and stores are chosen inside the conversation. |
| Interaction | Menu-driven (WhatsApp interactive lists) with `menu`, `orders`, `new` keyword shortcuts into the same flow. |
| Store creation | Ask for the **name only**. The slug is generated from it. |
| Where the code runs | Webhook in `apps/web`. Pure logic in a new `packages/whatsapp`. |

## Architecture

```
Meta ──POST──> apps/web /api/webhooks/whatsapp   (verify signature, ack 200, process in after())
                    │
                    ▼
         apps/web/lib/whatsapp/handle.ts          (dedupe, link check, LINK command, run turn, send)
            │            │                │
            ▼            ▼                ▼
   whatsapp-store.ts   deps.ts        @mcloud/whatsapp
   (Supabase tables)  (merchant fns   (graph client, payloads, signature,
                       as the user)    inbound parser, bot state machine)
```

### `packages/whatsapp` (no database, no Next)

- `signature.ts`: `verifySignature(rawBody, header, secret)`, HMAC-SHA256, constant time.
- `inbound.ts`: `parseInbound(payload)` turns Meta's nested webhook JSON into a flat list of
  `{ id, from, kind: 'text' | 'reply' | 'unsupported', ... }`. Status callbacks are ignored.
- `payloads.ts`: pure builders for the Graph API bodies (`text`, interactive `list`) that enforce
  WhatsApp's length limits (row title 24, row description 72, button 20, body 1024, max 10 rows).
- `graph.ts`: `createGraphClient({ token, phoneNumberId })` with `send(to, reply)`. It never
  throws: failures are logged and returned as `{ ok: false }` (same contract as `sendEmail`).
- `link-code.ts`: code generation, hashing, and `parseLinkCommand("LINK 1234 5678")`.
- `bot-logic.ts`: the state machine. `advance(state, input)` and `resolve(state, need, result)`
  are pure. They return `{ state, replies, need? }`. A `need` is a request for data
  (`stores`, `orders`, `order`, `orgs`, `create_store`) that the driver fulfils.
- `bot.ts`: `runTurn(deps, session, input)` drives `advance`/`resolve`, calling an injected
  `BotDeps` for each `need`. Because `BotDeps` is an interface the whole conversation is testable
  with fakes.

### `apps/web`

- `app/api/webhooks/whatsapp/route.ts` (`@route-kind: webhook`)
  - `GET`: Meta's verification handshake (`hub.verify_token`, echo `hub.challenge`).
  - `POST`: read the raw body, verify `X-Hub-Signature-256` (401 on failure), return 200
    immediately, and process messages in `after()`. After the signature is verified the route
    always returns 200 so Meta does not retry-loop on bad input.
- `lib/whatsapp/handle.ts`: orchestrates one inbound message through injected ports (store, deps,
  sender) so it can be tested end to end with fakes.
- `lib/whatsapp/whatsapp-store.ts`: all database access for the tables below.
- `lib/whatsapp/deps.ts`: the real `BotDeps` for a `userId`, built on `@mcloud/merchant`.
- `lib/whatsapp/slug-candidates.ts`: pure slug candidate generation and free-slug choice.
- Org settings page gets a **WhatsApp** panel (status, generate code, deep link, disconnect) backed
  by server actions in `settings/whatsapp-actions.ts`.

### `packages/merchant`

- `user-stores.ts`: `listAccessibleStores(userId)` (store membership **and** org membership, so
  people with store-level access but no org membership are covered) and
  `listCreatableOrgs(userId)` (orgs where the user is owner or admin). The cookie-based
  `getPickerData()` cannot be used from a webhook, so these take a `userId`.

## Data (`migrations/20261109_whatsapp_merchant_bot.sql`)

All tables have RLS enabled and **no policies**: only the service role touches them.

| Table | Purpose |
|---|---|
| `whatsapp_links` | `wa_id` (unique), `user_id`, `linked_at`, `revoked_at`. One active link per user and per number. |
| `whatsapp_link_codes` | `code_hash` (unique), `user_id`, `expires_at` (10 min), `used_at`. |
| `whatsapp_link_attempts` | `wa_id`, `created_at`. One row per failed `LINK`; 5 failures per hour blocks further attempts. |
| `whatsapp_sessions` | `wa_id` (pk), `state` jsonb, `updated_at`. Idle for 30 minutes means back to the menu. |
| `whatsapp_inbound_ids` | Meta message `id` (pk), `created_at`. Insert-or-skip makes retries idempotent. |

## Conversation

Any message from a linked number that is not mid-flow shows the **main menu** (list: Orders,
New store, Help). Keywords `orders`, `new`, `menu`, `help` jump straight in; `menu` resets from
anywhere.

**Unlinked sender:** one reply explaining how to link. `LINK <code>` links if the code is valid,
unexpired and unused. Wrong codes count as attempts.

**Orders**
1. Stores the user can access, as a list `Store · Org`. One store skips the picker. The list shows
   at most 10 rows; with more, the bot says so and typing part of a name filters the list.
2. The 10 newest orders: `#number · KES total · status`.
3. Tapping an order shows items, customer phone, total, payment and fulfilment status. Read-only.
4. Data comes from the existing `listOrders(slug, userId)`, which runs `requireStoreAccess`.

**New store**
1. Orgs where the user is owner or admin. One org skips the picker. None: link to the web hub.
2. Ask for the store name (2 to 60 characters).
3. Generate the slug from the name: `slugFromName`, then `-2`, `-3`, ... on collision, with a
   fallback for names that are too short, reserved or have no usable characters.
4. `createStoreForUser()` (owner/admin check, slug rules, default page seed).
5. Reply with the storefront URL and "edit it in the app or on the web".

Note: there is **no org-level store count limit** in the codebase today (plan limits cover
products, members and monthly orders per store), so v1 relays none.

## Errors and safety

- Signature failure: 401, nothing processed. Everything after: 200.
- Processing errors are logged and answered with "Something went wrong. Send `menu` to start again."
- Unsupported message types (images, voice, ...): "I can only read text and taps for now."
- Dedupe on Meta message id. Trade-off: if processing crashes after the id is recorded the retry is
  skipped and the merchant just resends.
- Link codes: 8 digits, hashed, single use, 10 minute expiry, durable attempt limit per number.
- The bot never accepts a user id, store id or price from message text. Identity comes only from
  the verified link; store and org choices are re-validated through the normal access gates on
  every action, so a forged list-reply id cannot reach a store the user cannot access.
- Outbound sends are plain text and interactive lists inside the 24 hour window. A failed send
  is logged and dropped.

## Configuration (names only, `apps/web`)

`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`,
`WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_BUSINESS_NUMBER`. All are read at runtime in route handlers,
not during `next build`, so `turbo.json` is unchanged. Unset: the webhook returns 503 and the
settings panel says WhatsApp is not configured.

Meta setup (not code): a Meta app with the WhatsApp product, a registered number, a permanent
system-user token, and a webhook pointing at `https://mcloud.co.ke/api/webhooks/whatsapp`
subscribed to the `messages` field.

## Testing

- `packages/whatsapp`: signature, inbound parsing, payload limits, link-code parsing, and the
  state machine (every step, bad input, search, `menu` reset), plus `runTurn` with fake deps.
- `apps/web`: slug candidates, `handle.ts` end to end with in-memory ports (link, create store,
  list orders, dedupe, rate limit, expiry), and the route-kind test for the new webhook.
- `packages/merchant`: the pure merge and sort helper behind `listAccessibleStores`.

## Verification (what was and was not run)

Run: `npx turbo run typecheck lint test` (0 errors), `npx turbo run build --filter=@mcloud/web`, and the
built app answering the webhook over HTTP: handshake 200 and 403, unsigned or wrongly signed POST 401,
validly signed delivery 200.

Not run, because they need things only the owner has: the migration against Postgres (no local Postgres,
and nothing is applied to the live database without review), a real Meta webhook delivery, a real send
through the Graph API, and the settings panel in a browser. The first real end to end pass should be:
apply the migration, set the variables, register the webhook, link a number, then `orders` and `new`.

## Differences from the design discussion

- Store list beyond 10: typing part of a name filters the list (instead of a "More..." row).
- No store-count limit message: the codebase has no org-level store limit, so there is none to relay.
- Link UI lives on the org **settings** page (owner and admin only) and links the signed-in *person*.
- Link tables cascade on user delete so `delete_user_account` keeps working.
