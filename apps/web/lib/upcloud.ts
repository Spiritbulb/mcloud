// apps/web/lib/upcloud.ts
// Thin server-only client for the UpCloud API (v1.3). Auth via Bearer token
// from env. Never import this from a client component.

const BASE = 'https://api.upcloud.com/1.3'

function getToken() {
  const token = process.env.UPCLOUD_API_TOKEN
  if (!token) throw new Error('UPCLOUD_API_TOKEN is not set')
  return token
}

async function upcloudFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...init?.headers,
    },
    // Zones/plans/templates rarely change — cache briefly. Servers list/create
    // should never be cached.
    cache: 'no-store',
  })

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    const message =
      body?.error?.error_message ?? `UpCloud request failed (${res.status})`
    const code = body?.error?.error_code
    throw new Error(code ? `${code}: ${message}` : message)
  }

  return body as T
}

// ---- Types (only the fields we use) ----

export type UpcloudZone = {
  id: string
  description: string
  public: 'yes' | 'no'
}

export type UpcloudPlan = {
  name: string
  core_number: number
  memory_amount: number
  storage_size: number
  storage_tier: string
  public_traffic_out: number
  zones?: { zone: string[] }
}

export type UpcloudTemplate = {
  uuid: string
  title: string
  os: string
  type: string
  zone: string
  state: string
}

export type UpcloudServer = {
  uuid: string
  title: string
  hostname: string
  state: 'started' | 'stopped' | 'maintenance' | 'error'
  zone: string
  plan: string
  core_number: string
  memory_amount: string
  tags?: { tag: string[] }
}

// ---- Reads ----

export async function listZones(): Promise<UpcloudZone[]> {
  const data = await upcloudFetch<{ zones: { zone: UpcloudZone[] } }>('/zone')
  return data.zones.zone.filter((z) => z.public === 'yes')
}

export async function listPlans(): Promise<UpcloudPlan[]> {
  const data = await upcloudFetch<{ plans: { plan: UpcloudPlan[] } }>('/plan')
  return data.plans.plan
}

// Public OS templates only (private/custom templates excluded for now).
export async function listTemplates(): Promise<UpcloudTemplate[]> {
  const data = await upcloudFetch<{
    storages: { storage: UpcloudTemplate[] }
  }>('/storage/template')
  return data.storages.storage
}

export async function listServers(): Promise<UpcloudServer[]> {
  const data = await upcloudFetch<{ servers: { server: UpcloudServer[] } }>(
    '/server',
  )
  return data.servers.server
}

export async function getServer(uuid: string) {
  const data = await upcloudFetch<{ server: UpcloudServer }>(
    `/server/${uuid}`,
  )
  return data.server
}

// ---- Create ----

// apps/web/lib/upcloud.ts — replace CreateServerInput + createServer

export type CreateServerInput = {
  title: string
  hostname: string
  zone: string
  plan: string
  templateUuid: string
  storageSize: number // GB, 10-1024
}

export async function createServer(input: CreateServerInput) {
  const { generateServerKeypair } = await import('./ssh-keygen')
  const { publicKey, privateKey } = generateServerKeypair(input.hostname)

  const data = await upcloudFetch<{ server: UpcloudServer }>('/server', {
    method: 'POST',
    body: JSON.stringify({
      server: {
        title: input.title,
        hostname: input.hostname,
        zone: input.zone,
        plan: input.plan,
        metadata: 'yes', // required for cloud-init templates (Ubuntu 22.04+, Debian 12+, etc.)
        storage_devices: {
          storage_device: [
            {
              action: 'clone',
              storage: input.templateUuid,
              title: `${input.title} disk`,
              size: input.storageSize,
            },
          ],
        },
        networking: {
          interfaces: {
            interface: [
              { type: 'public', ip_addresses: { ip_address: [{ family: 'IPv4' }] } },
              { type: 'utility', ip_addresses: { ip_address: [{ family: 'IPv4' }] } },
            ],
          },
        },
        login_user: {
          username: 'root',
          ssh_keys: { ssh_key: [publicKey] },
        },
      },
    }),
  })

  return { server: data.server, privateKey }
}

export type UpcloudServerDetail = UpcloudServer & {
  ip_addresses?: { ip_address: { address: string; family: string; access: string }[] }
}

export async function getServerDetail(uuid: string): Promise<UpcloudServerDetail> {
  const data = await upcloudFetch<{ server: UpcloudServerDetail }>(`/server/${uuid}`)
  return data.server
}

export async function startServer(uuid: string) {
  const data = await upcloudFetch<{ server: UpcloudServer }>(`/server/${uuid}/start`, {
    method: 'POST',
  })
  return data.server
}

export async function stopServer(uuid: string, hard = false) {
  const data = await upcloudFetch<{ server: UpcloudServer }>(`/server/${uuid}/stop`, {
    method: 'POST',
    body: JSON.stringify({
      stop_server: { stop_type: hard ? 'hard' : 'soft', timeout: 60 },
    }),
  })
  return data.server
}

export async function restartServer(uuid: string, hard = false) {
  const data = await upcloudFetch<{ server: UpcloudServer }>(`/server/${uuid}/restart`, {
    method: 'POST',
    body: JSON.stringify({
      restart_server: { stop_type: hard ? 'hard' : 'soft', timeout: 60 },
    }),
  })
  return data.server
}

export async function renameServer(uuid: string, title: string) {
  const data = await upcloudFetch<{ server: UpcloudServer }>(`/server/${uuid}`, {
    method: 'PUT',
    body: JSON.stringify({ server: { title } }),
  })
  return data.server
}

// Server must be in `stopped` state before this succeeds (UpCloud requirement).
export async function deleteServer(uuid: string) {
  await upcloudFetch<void>(`/server/${uuid}?storages=1&backups=delete`, {
    method: 'DELETE',
  })
}