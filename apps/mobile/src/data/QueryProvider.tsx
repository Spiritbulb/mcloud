// Persisted cache: survives restarts so launches (incl. offline) render data
// immediately. Writes the query cache to AsyncStorage (native — needs a rebuild).
// `buster` bumps to drop incompatible cached shapes across app versions.
import * as React from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { queryClient } from './queryClient'

const persister = createAsyncStoragePersister({ storage: AsyncStorage })

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const client = queryClient
  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000, buster: 'v1' }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}
