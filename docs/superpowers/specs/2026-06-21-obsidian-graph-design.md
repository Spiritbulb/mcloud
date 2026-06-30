# Obsidian Knowledge Graph — Design Spec

**Date:** 2026-06-21  
**Status:** Approved

## Goal

Generate a file-level Obsidian vault from this monorepo that serves as a navigable knowledge base for agents and developers. The vault mirrors the repo's structure as interlinked markdown nodes — exports, JSDoc comments, and dependency edges — so agents dropped into a task can orient quickly without reading source files cold.

---

## Vault Location

`C:\Users\busie\obsidian\mcloud\`

This is outside the repo (no versioning of the vault itself). The generator is versioned in the repo and re-run to refresh the vault.

---

## Script Location

- **File:** `scripts/obsidian-graph.js`
- **npm alias:** `npm run obsidian` (wired into root `package.json`)
- **Behavior on re-run:** full overwrite — no merge, no partial updates

---

## Parsing Strategy

Two parsers, determined by workspace member type:

### Apps — TypeDoc JSON

Applies to: `apps/web`, `apps/storefront`, `apps/mobile`

1. Run `typedoc --json typedoc-out.json --skipErrorChecking` in each app directory
2. Parse the JSON output to extract: file paths, exported symbols, JSDoc comments, and import relationships
3. Clean up the temp JSON after extraction

**Note:** `apps/mobile` (Expo/RN) will need a minimal `typedoc.json` added during implementation to give TypeDoc a valid entry point and tsconfig.

### Packages — TypeScript Compiler API

Applies to: `packages/auth`, `packages/config`, `packages/db`, `packages/themes`, `packages/ui`

Use `ts.createSourceFile` (no full type-check) to extract:
- Named exports and their JSDoc comments
- Import statements (internal workspace vs. external)

This avoids TypeDoc overhead for smaller, focused packages.

---

## Output Structure

```
C:\Users\busie\obsidian\mcloud\
  _index.md                        ← entry point: package graph overview
  packages/
    @mcloud-config.md
    @mcloud-db.md
    @mcloud-auth.md
    @mcloud-ui.md
    @mcloud-themes.md
  apps/
    web.md
    storefront.md
    mobile.md
  apps-web/                        ← file nodes for apps/web
    lib/
      auth/
        session.md
        workos-client.md
    ...
  apps-storefront/
    ...
  apps-mobile/
    ...
  packages-auth/
    ...
  (etc.)
```

---

## Node Formats

### Package node (`apps/web.md`, `packages/@mcloud-auth.md`)

```markdown
---
name: "@mcloud/web"
type: package
workspace: apps/web
---

## Dependencies
- [[packages/@mcloud-auth]]
- [[packages/@mcloud-db]]
- [[packages/@mcloud-ui]]
- [[packages/@mcloud-themes]]
- [[packages/@mcloud-config]]

## Files
- [[apps-web/app/layout]]
- [[apps-web/lib/auth/session]]
- ...
```

### File node (`apps-web/lib/auth/session.md`)

```markdown
---
package: "@mcloud/web"
path: "apps/web/lib/auth/session.ts"
type: file
---

## Exports
- `getSession` — Returns the current user session from cookies. _"Call this in any server component to get the authed user."_
- `clearSession` — Deletes session cookie and invalidates token.

## Dependencies
- [[apps-web/lib/auth/workos-client]] (internal)
- [[packages/@mcloud-auth]] (workspace)
- `next/headers` (external)

## Imported by
- [[apps-web/app/layout]]
- [[apps-web/middleware]]
```

### Index node (`_index.md`)

```markdown
# mcloud — Architecture Overview

## Apps
- [[apps/web]] — Next.js main app
- [[apps/storefront]] — Public-facing storefront
- [[apps/mobile]] — Expo merchant app

## Packages
- [[packages/@mcloud-config]] — Shared config (leaf)
- [[packages/@mcloud-db]] — Supabase client → config
- [[packages/@mcloud-auth]] — Auth layer → db, config
- [[packages/@mcloud-ui]] — Component library → config
- [[packages/@mcloud-themes]] — Theme tokens → ui, config

## Dependency Graph (text)
web → auth, db, themes, ui, config
storefront → db, themes, ui, config
mobile → (none)
auth → db, config
db → config
themes → ui, config
ui → config
config → (leaf)
```

---

## Script Design (`scripts/obsidian-graph.js`)

Single Node.js script, no build step required. Dependencies:

- `typescript` (already in repo) — for compiler API parsing of packages
- `typedoc` (already in `apps/web`) — invoked as a CLI subprocess for apps
- Node built-ins: `fs`, `path`, `child_process`

### Flow

```
main()
  ├── cleanVault(vaultDir)           — rm -rf + mkdir vault
  ├── writeIndex(packages, apps)     — emit _index.md
  ├── for each app:
  │     runTypedoc(appDir)           — spawn typedoc --json
  │     nodes = parseTypedocJson()   — extract file nodes
  │     writePackageNode(app, nodes) — emit apps/web.md etc.
  │     writeFileNodes(nodes)        — emit apps-web/**/*.md
  ├── for each package:
  │     nodes = parseTsCompilerApi() — extract exports + imports
  │     writePackageNode(pkg, nodes)
  │     writeFileNodes(nodes)
  └── done
```

### "Imported by" reverse index

Build a `Map<filePath, Set<filePath>>` as file nodes are parsed (forward pass), then annotate each node's "Imported by" section during the write pass.

---

## What This Is Not

- Not a replacement for TypeDoc HTML docs (those remain in `apps/web/docs/`)
- Not auto-updated on save — run `npm run obsidian` manually after significant changes
- Not a linter or type-checker — parsing is best-effort, skips errors

---

## Future Scaling

Once the package/file graph is working, potential additions:

- Supabase schema nodes (one `.md` per table, linked from `@mcloud/db`)
- Route nodes for Next.js pages (one `.md` per `app/` route)
- API endpoint nodes linked to their handler files
- GitHub Actions workflow nodes
