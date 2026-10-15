// Reach delivery areas: a two-level list (town > area) the Reach admin curates. Pure functions so the
// dashboard, the mobile API and the tests share one definition of "who serves whom".

export interface Area {
  id: string
  parent_id: string | null
  name: string
  slug: string
  lat: number | null
  lng: number | null
  active?: boolean
}

/** Max length of "also delivers to" for one vendor: enough for a town's neighbourhoods, not the country. */
export const MAX_VENDOR_AREAS = 12

/**
 * The areas a buyer's choice relates to: the area itself, the town above it and the areas below it.
 * A vendor serving "Nairobi" therefore serves a buyer in "Westlands", and a buyer who only picked
 * "Nairobi" sees vendors in any Nairobi area.
 */
export function relatedAreaIds(areas: Area[], areaId: string): Set<string> {
  const byId = new Map(areas.map((a) => [a.id, a]))
  const out = new Set<string>()
  if (!byId.has(areaId)) return out
  out.add(areaId)
  // ancestors (guarding against a cycle in bad data)
  for (let cur = byId.get(areaId)?.parent_id, hops = 0; cur && hops < 10; hops++) {
    out.add(cur)
    cur = byId.get(cur)?.parent_id ?? null
  }
  // descendants
  const children = new Map<string, string[]>()
  for (const a of areas) if (a.parent_id) children.set(a.parent_id, [...(children.get(a.parent_id) ?? []), a.id])
  const stack = [areaId]
  while (stack.length) {
    for (const c of children.get(stack.pop()!) ?? []) {
      if (!out.has(c)) {
        out.add(c)
        stack.push(c)
      }
    }
  }
  return out
}

/** True when a vendor whose home + delivery areas are `vendorAreaIds` serves a buyer in `buyerAreaId`. */
export function vendorServesArea(areas: Area[], vendorAreaIds: string[], buyerAreaId: string): boolean {
  const related = relatedAreaIds(areas, buyerAreaId)
  return vendorAreaIds.some((id) => related.has(id))
}

/** "Westlands, Nairobi" for an area under a town, "Nairobi" for a town. */
export function areaLabel(areas: Area[], areaId: string | null | undefined): string {
  const a = areas.find((x) => x.id === areaId)
  if (!a) return ''
  const parent = a.parent_id ? areas.find((x) => x.id === a.parent_id) : null
  return parent ? `${a.name}, ${parent.name}` : a.name
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLng = rad(lng2 - lng1)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

/**
 * The area closest to a GPS fix, for "use my location". Only areas with coordinates compete, and
 * nothing is suggested when the nearest is farther than `maxKm` (a buyer in Garissa should not be
 * told they are in Nairobi). Ties go to the more specific (child) area.
 */
export function nearestArea(areas: Area[], lat: number, lng: number, maxKm = 40): Area | null {
  let best: { area: Area; km: number } | null = null
  for (const a of areas) {
    if (a.active === false || a.lat == null || a.lng == null) continue
    const km = haversineKm(lat, lng, a.lat, a.lng)
    if (km > maxKm) continue
    if (!best || km < best.km || (km === best.km && a.parent_id && !best.area.parent_id)) best = { area: a, km }
  }
  return best?.area ?? null
}

export function slugifyArea(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function validateAreaInput(input: {
  name: unknown
  lat?: unknown
  lng?: unknown
}): { ok: true; name: string; slug: string; lat: number | null; lng: number | null } | { ok: false; error: string } {
  const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : ''
  if (name.length < 2 || name.length > 60) return { ok: false, error: 'Area names are 2 to 60 characters.' }
  const slug = slugifyArea(name)
  if (!slug) return { ok: false, error: 'Use letters or numbers in the name.' }
  const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v))
  const lat = num(input.lat)
  const lng = num(input.lng)
  if ((lat === null) !== (lng === null)) return { ok: false, error: 'Give both latitude and longitude, or neither.' }
  if (lat !== null && lng !== null) {
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { ok: false, error: 'Latitude must be between -90 and 90.' }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) return { ok: false, error: 'Longitude must be between -180 and 180.' }
  }
  return { ok: true, name, slug, lat, lng }
}
