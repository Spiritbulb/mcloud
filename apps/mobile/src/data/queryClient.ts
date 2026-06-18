// Central QueryClient + typed query-key factory. staleTime keeps cached data
// "fresh enough" to render instantly on revisit; a background refetch updates it.
import { QueryClient } from '@tanstack/react-query'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000, // 30s: render cache instantly, refetch in background
        gcTime: 24 * 60 * 60 * 1000, // keep cache 24h so offline launches have data
        retry: 1, // mobile networks flap; one retry, then surface/keep cache
        refetchOnReconnect: true,
        refetchOnWindowFocus: false, // RN has no window focus; we refetch on mount
      },
      mutations: { retry: 0 },
    },
  })
}

export const queryKeys = {
  products: (storeSlug: string) => ['products', storeSlug] as const,
}
