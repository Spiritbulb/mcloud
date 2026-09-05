// apps/web/lib/servers-db.ts
// Org-scoping layer on top of the servers table. UpCloud stays the source of
// truth for live state — this just tracks which UpCloud UUIDs belong to
// which org, and caches basics for display.
import { createClient } from '@mcloud/db/server'
import type { UpcloudServer } from './upcloud'

export async function getOrgRole(orgId: string, userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle()
  return data?.role ?? null
}

export async function listOrgServerUuids(orgId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('servers')
    .select('upcloud_uuid')
    .eq('org_id', orgId)
  return (data ?? []).map((s) => s.upcloud_uuid)
}

export async function recordServer(input: {
  orgId: string
  upcloudUuid: string
  title: string
  zone: string
  plan: string
  state: string
  createdBy: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('servers').insert({
    org_id: input.orgId,
    upcloud_uuid: input.upcloudUuid,
    title: input.title,
    zone: input.zone,
    plan: input.plan,
    state: input.state,
    created_by: input.createdBy,
  })
  if (error) throw new Error(error.message)
}

export async function syncServerCache(servers: UpcloudServer[]) {
  if (servers.length === 0) return
  const supabase = await createClient()
  // Fire-and-forget-ish: update cached columns for each server we just
  // fetched live. Cheap upserts by upcloud_uuid, best-effort (list page
  // shouldn't fail just because a cache write hiccups).
  await Promise.all(
    servers.map((s) =>
      supabase
        .from('servers')
        .update({ title: s.title, zone: s.zone, plan: s.plan, state: s.state, updated_at: new Date().toISOString() })
        .eq('upcloud_uuid', s.uuid),
    ),
  )
}

export async function removeServerRecord(upcloudUuid: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('servers').delete().eq('upcloud_uuid', upcloudUuid)
  if (error) throw new Error(error.message)
}