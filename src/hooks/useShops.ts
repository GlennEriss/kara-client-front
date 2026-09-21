'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createShop,
  deleteShop,
  getShop,
  listShops,
  reviewShop,
  updateShop,
  type ShopInput,
} from '@/db/shops.db'
import { useAuth } from '@/hooks/useAuth'
import { ServiceFactory } from '@/factories/ServiceFactory'
import type { Shop } from '@/types/types'

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

  /**
   * Valide ou refuse une boutique soumise par un membre, et le prévient.
   * La notification est best-effort : elle ne doit pas annuler la décision.
   */
  const review = useMutation({
    mutationFn: async ({
      shop,
      decision,
      reason,
    }: {
      shop: Shop
      decision: 'approved' | 'rejected'
      reason?: string
    }) => {
      await reviewShop(shop.id, decision, user?.uid || 'admin', reason)

      const recipientId = shop.ownerMatricule || shop.ownerMemberId || shop.submittedBy
      if (!recipientId) return
      await ServiceFactory.getNotificationService().notifyMember({
        recipientId,
        module: 'boutique',
        entityId: shop.id,
        type: 'status_update',
        title: decision === 'approved' ? 'Boutique validée' : 'Boutique refusée',
        message:
          decision === 'approved'
            ? `Votre boutique « ${shop.name} » est désormais visible dans l'annuaire.`
            : `Votre boutique « ${shop.name} » n'a pas été retenue${reason?.trim() ? ` : ${reason.trim()}` : ''}. Vous pouvez la corriger et la soumettre à nouveau.`,
        metadata: { shopId: shop.id, status: decision },
      })
    },
    onSuccess: invalidate,
  })

  return { create, update, remove, review }
}
