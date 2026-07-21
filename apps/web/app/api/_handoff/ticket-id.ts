// Pure ticket-id generator, split out so it can be unit-tested under bare
// `node --test`. Imports ONLY node builtins — no relative imports — because
// Node's ESM loader needs `.ts` extensions on relative paths while the Next
// build (moduleResolution: bundler) forbids them, and a file imported by both
// cannot satisfy both. Keeping this leaf import-free sidesteps that entirely.
import { randomBytes } from 'node:crypto'

export function newTicketId(): string {
  return randomBytes(32).toString('base64url')
}
