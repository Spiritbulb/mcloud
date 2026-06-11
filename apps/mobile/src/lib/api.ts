// Typed wrappers over the /api/mobile/* endpoints. All calls go through the
// authedFetch from AuthContext (bearer token + refresh-on-401).

export type Org = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  role: string
  canManage: boolean
}

export type Store = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  is_pro: boolean
  created_at: string
}

type Fetch = (path: string, init?: RequestInit) => Promise<Response>

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`)
  }
  return data as T
}

export function api(authedFetch: Fetch) {
  return {
    async listOrgs(): Promise<Org[]> {
      const res = await authedFetch('/api/mobile/orgs')
      return (await json<{ orgs: Org[] }>(res)).orgs
    },

    async listStores(orgSlug: string): Promise<{ stores: Store[]; role: string; orgId: string }> {
      const res = await authedFetch(`/api/mobile/orgs/${orgSlug}/stores`)
      return json<{ stores: Store[]; role: string; orgId: string }>(res)
    },

    async createStore(orgSlug: string, input: { name: string; slug: string }): Promise<{ slug: string }> {
      const res = await authedFetch(`/api/mobile/orgs/${orgSlug}/stores`, {
        method: 'POST',
        body: JSON.stringify(input),
      })
      return json<{ slug: string }>(res)
    },
  }
}
