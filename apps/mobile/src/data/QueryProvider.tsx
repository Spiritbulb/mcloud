// Wraps the app in a QueryClientProvider. Stage 1: in-memory cache only.
// Stage 2 swaps this for PersistQueryClientProvider (AsyncStorage) — see Task 6.
import * as React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { makeQueryClient } from './queryClient'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // One client for the app's lifetime.
  const [client] = React.useState(makeQueryClient)
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
