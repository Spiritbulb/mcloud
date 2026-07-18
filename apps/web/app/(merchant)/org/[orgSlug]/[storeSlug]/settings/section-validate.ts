// Known section types from SECTION_REGISTRY
// If adding a new section type, update both this set and apps/storefront/lib/sections.ts
const KNOWN_TYPES = new Set([
  'hero',
  'collections',
  'featured',
  'all-products',
  'mission',
  'programs',
  'impact',
  'contact',
  'campaigns',
])

/**
 * A section is allowed to be saved if its type is either a known registry type
 * or was ALREADY in the stored page. This lets CRUD change count/order freely
 * while still stopping a stale/hostile tab from injecting an arbitrary type.
 */
export function validateSectionTypes(
  next: { type: string }[],
  stored: { type: string }[],
): boolean {
  const wasStored = new Set(stored.map((s) => s.type))
  return next.every((s) => KNOWN_TYPES.has(s.type) || wasStored.has(s.type))
}
