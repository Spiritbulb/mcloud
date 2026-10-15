# Documentation

| Read this | When |
|---|---|
| [architecture.md](architecture.md) | You are new, or changing how apps, hosts, auth or data fit together. |
| [api.md](api.md) | You are adding or changing an API route. |
| [payments.md](payments.md) | You are touching checkout, M-PESA, PayPal or wallet top-ups. |
| [reach.md](reach.md) | You are touching the Reach marketplace: store listing, store keys, the mobile vendor API. |
| [caching.md](caching.md) | You are touching public store pages, or adding a write that visitors should see. |
| [environment.md](environment.md) | You are setting up a machine or a Vercel project. |
| [storefront-domain-move.md](storefront-domain-move.md) | You are changing storefront sign-in, hosts or cookies, or planning the move to its own domain. |
| [CLEANUP.md](CLEANUP.md) | You want the known debt, or are about to refactor something. |
| [ROADMAP.md](ROADMAP.md) | You are choosing what to build next (Now / Next / Later). |
| [../FEATURES.md](../FEATURES.md) | You want to know what exists, what is partial, and what is wanted, across all apps. |
| [../AGENTS.md](../AGENTS.md) | You are an AI agent, or want the working rules in one page. |

`docs/superpowers/**` holds historical design specs and plans. They describe the system
as it was when written (before store settings moved from `apps/web` to `apps/storefront`),
so paths in them may be stale. `docs/code-reviews` and `docs/test-runs` are dated records.

Documentation rules: describe what is true now, link to code instead of copying it, and
update the doc in the same change as the behaviour.
