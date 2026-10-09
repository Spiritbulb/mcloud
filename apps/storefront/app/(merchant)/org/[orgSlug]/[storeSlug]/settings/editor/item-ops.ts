export type ItemOp =
  | { op: 'move'; index: number; to: number }
  | { op: 'delete'; index: number }
  | { op: 'duplicate'; index: number }
  | { op: 'add'; index: number; list: string }

const inBounds = (i: number, len: number) => Number.isInteger(i) && i >= 0 && i < len

/**
 * Apply a structural op to a repeated-record list (programs, campaigns,
 * impactStats, heroSlides). Pure. `arr` is the CURRENT list, already resolved
 * by listFor(); returns a NEW array, or the input unchanged if the op is out
 * of bounds.
 *
 * For `add`, the caller supplies `seed` (a function list -> new record) rather
 * than this module importing seedRecord itself. seedRecord (section-seeds.ts)
 * has no registry dependency, so importing it directly here IS safe for the
 * bare `node --experimental-strip-types` runner used by item-ops.test.ts — but
 * doing so requires an explicit `.ts` extension on the import, which tsc then
 * rejects in production code (TS5097: 'allowImportingTsExtensions' not set in
 * the shared base tsconfig). Injecting the seeder avoids the conflict and
 * matches the established pattern in section-ops.ts/applySectionOp.
 */
export function applyItemOp(
  arr: unknown[],
  op: ItemOp,
  seed: (list: string) => unknown,
): unknown[] {
  const next = [...arr]
  switch (op.op) {
    case 'move': {
      if (!inBounds(op.index, next.length) || !inBounds(op.to, next.length)) return arr
      const [m] = next.splice(op.index, 1); next.splice(op.to, 0, m); return next
    }
    case 'delete': {
      if (!inBounds(op.index, next.length)) return arr
      next.splice(op.index, 1); return next
    }
    case 'duplicate': {
      if (!inBounds(op.index, next.length)) return arr
      next.splice(op.index + 1, 0, structuredClone(next[op.index])); return next
    }
    case 'add': {
      const at = Number.isInteger(op.index) ? Math.max(0, Math.min(op.index, next.length)) : next.length
      next.splice(at, 0, seed(op.list)); return next
    }
    default: return arr
  }
}
