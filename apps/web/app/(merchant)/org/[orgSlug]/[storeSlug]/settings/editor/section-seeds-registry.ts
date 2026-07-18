// seedSection lives here, separate from the pure section-seeds.ts, because it
// must import SECTION_REGISTRY (the single source of truth for section schemas).
// That import transitively pulls the storefront module graph, which the bare
// `node --experimental-strip-types` test runner cannot resolve — so it is kept
// OUT of section-seeds.ts (which the unit tests import). Production code imports
// seedSection from here; it resolves normally under Next/tsc.
import { SECTION_REGISTRY } from '../../../../../../../../storefront/lib/sections'
import { fillDefaults } from './section-seeds'

export function seedSection(type: string): { type: string; settings: Record<string, unknown> } {
  const def = (SECTION_REGISTRY as Record<string, { schema?: readonly { id: string; default?: unknown }[] }>)[type]
  return { type, settings: fillDefaults(def?.schema as any) }
}
