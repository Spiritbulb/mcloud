import type { ItemOp } from './item-ops'

/**
 * Which slide index the carousel should show AFTER a heroSlides op, so it FOLLOWS
 * the slide the merchant acted on instead of snapping to 0. `newLen` is the list
 * length AFTER the op. Pure.
 *
 *   move      -> the destination index (the slide stays visible where it landed)
 *   duplicate -> the new copy, inserted right after the original
 *   add       -> the newly inserted slide
 *   delete    -> the slide now at the deleted position (its old neighbour),
 *                clamped so deleting the last slide shows the new last
 */
export function followSlideIndex(op: ItemOp, newLen: number): number {
  if (newLen <= 0) return 0
  let i: number
  switch (op.op) {
    case 'move':
      i = op.to
      break
    case 'duplicate':
      i = op.index + 1
      break
    case 'add':
      i = op.index
      break
    case 'delete':
      i = op.index
      break
    default:
      i = 0
  }
  return Math.max(0, Math.min(i, newLen - 1))
}
