'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createShop,
  deleteShop,
  getShop,
  listShops,
  updateShop,
  type ShopInput,
} from '@/db/shops.db'
import { useAuth } from '@/hooks/useAuth'

export function useShops() {
  return useQuery({
    queryKey: ['shops', 'list'],
    queryFn: listShops,
    staleTime: 60 * 1000,
  })
}

export function useShop(id?: string) {
  return useQuery({
    queryKey: ['shops', id],
    queryFn: () => getShop(id as string),
    enabled: !!id,
  })
}

export function useShopMutations() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['shops'] })

  const create = useMutation({
    mutationFn: (input: ShopInput) => createShop(input, user?.uid || 'admin'),
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ShopInput> }) =>
      updateShop(id, updates, user?.uid || 'admin'),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteShop(id),
    onSuccess: invalidate,
  })

  return { create, update, remove }
}
