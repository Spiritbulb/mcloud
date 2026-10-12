# @mcloud/db

Supabase clients and generated types.

| Import | Use |
|---|---|
| `@mcloud/db/server` | `createClient()`: **service-role**, server only, **bypasses RLS**. Also `getStore(slug)` (per-request cached). |
| `@mcloud/db/client` | Browser client with the public anon key (RLS applies). |
| `@mcloud/db/customer-server`, `customer-client` | The shopper's Supabase Auth session (storefront accounts). |
| `@mcloud/db/types` | `Database` types, generated: `npm run sb-typegen -w @mcloud/web`. |

Because the server client ignores RLS, every route using it must authorize the caller
itself. See [docs/api.md](../../docs/api.md).
