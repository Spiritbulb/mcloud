export type Section = { type: string; settings?: Record<string, unknown> }
export type SectionOp =
  | { op: 'move'; index: number; to: number }
  | { op: 'delete'; index: number }
  | { op: 'duplicate'; index: number }
  | { op: 'add'; index: number; sectionType: string }

const inBounds = (i: number, len: number) => Number.isInteger(i) && i >= 0 && i < len

/**
 * Apply a structural op to the sections array. Pure. For `add`, the caller
 * supplies `seed` (a function type -> a new section) so this module never has to
 * import SECTION_REGISTRY — which would break the bare node test runner. Returns
 * a NEW array; returns the input unchanged if the op is out of bounds.
 */
export function applySectionOp(
  sections: Section[],
  op: SectionOp,
  seed: (type: string) => Section,
): Section[] {
  const next = [...sections]
  switch (op.op) {
    case 'move': {
      if (!inBounds(op.index, next.length) || !inBounds(op.to, next.length)) return sections
      const [m] = next.splice(op.index, 1); next.splice(op.to, 0, m); return next
    }
    case 'delete': {
      if (!inBounds(op.index, next.length)) return sections
      next.splice(op.index, 1); return next
    }
    case 'duplicate': {
      if (!inBounds(op.index, next.length)) return sections
      next.splice(op.index + 1, 0, structuredClone(next[op.index])); return next
    }
    case 'add': {
      const at = Number.isInteger(op.index) ? Math.max(0, Math.min(op.index, next.length)) : next.length
      next.splice(at, 0, seed(op.sectionType)); return next
    }
    default: return sections
  }
}
