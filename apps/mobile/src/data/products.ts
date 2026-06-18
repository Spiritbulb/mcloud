// React-query hooks for Products. Wrap the existing api.ts transport; add caching
// + optimistic writes. The cached shape mirrors listProducts' response so the
// list screen reads { products, role } straight from the cache.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, type Product } from '@/lib/api'
import { useAuth } from '@/auth/AuthContext'
import * as React from 'react'
import { queryKeys } from './queryClient'

type ProductsData = { products: Product[]; role: string }

function useClient() {
  const { authedFetch } = useAuth()
  return React.useMemo(() => api(authedFetch), [authedFetch])
}

export function useProducts(storeSlug: string) {
  const client = useClient()
  return useQuery({
    queryKey: queryKeys.products(storeSlug),
    queryFn: () => client.listProducts(storeSlug),
  })
}

export function useCreateProduct(storeSlug: string) {
  const client = useClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<ReturnType<typeof api>['createProduct']>[1]) =>
      client.createProduct(storeSlug, input),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.products(storeSlug) }),
  })
}

export function useUpdateProduct(storeSlug: string) {
  const client = useClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<ReturnType<typeof api>['updateProduct']>[2] }) =>
      client.updateProduct(storeSlug, id, patch),
    // Optimistic: apply the patch to the cached product immediately.
    onMutate: async ({ id, patch }) => {
      const key = queryKeys.products(storeSlug)
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<ProductsData>(key)
      if (prev) {
        qc.setQueryData<ProductsData>(key, {
          ...prev,
          products: prev.products.map((p) => (p.id === id ? { ...p, ...patch } as Product : p)),
        })
      }
      return { prev }
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.products(storeSlug), ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.products(storeSlug) }),
  })
}

export function useDeleteProduct(storeSlug: string) {
  const client = useClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => client.deleteProduct(storeSlug, id),
    // Optimistic: remove the row immediately.
    onMutate: async (id) => {
      const key = queryKeys.products(storeSlug)
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<ProductsData>(key)
      if (prev) {
        qc.setQueryData<ProductsData>(key, {
          ...prev,
          products: prev.products.filter((p) => p.id !== id),
        })
      }
      return { prev }
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKeys.products(storeSlug), ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.products(storeSlug) }),
  })
}
