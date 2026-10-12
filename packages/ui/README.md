# @mcloud/ui

shadcn-style UI primitives (Radix + class-variance-authority + Tailwind) shared by both
apps: button, dialog, dropdown-menu, select, sidebar, sonner, and so on, imported as
`@mcloud/ui/<name>`. This package owns the Radix, `cva`, `clsx`, `tailwind-merge` and
`sonner` dependencies; apps should not re-declare them.

Styling tokens still live in each app's `globals.css` (a duplicated copy; see
[docs/CLEANUP.md](../../docs/CLEANUP.md) §2.7).
