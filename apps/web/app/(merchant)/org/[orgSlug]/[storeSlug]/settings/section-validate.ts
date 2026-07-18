/**
 * A section is allowed to be saved if its type is either a known registry type
 * (passed in as `known`) or was ALREADY in the stored page. This lets CRUD change
 * count/order freely while still stopping a stale/hostile tab from injecting an
 * arbitrary type. Kept pure/dependency-free so it is unit-testable without
 * resolving the storefront module graph; the caller supplies `known` from
 * SECTION_REGISTRY (the single source of truth).
 */
export function validateSectionTypes(
  next: { type: string }[],
  stored: { type: string }[],
  known: Iterable<string>,
): boolean {
  const knownSet = new Set(known)
  const wasStored = new Set(stored.map((s) => s.type))
  return next.every((s) => knownSet.has(s.type) || wasStored.has(s.type))
}
