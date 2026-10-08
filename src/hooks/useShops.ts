'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveShopChanges,
  createShop,
  deleteShopArticle,
  listShopArticles,
  reviewShopArticle,
  rejectShopChanges,
  deleteShop,
  getShop,
  getShopCreditPartner,
  listShopCreditPartners,
  listShops,
  saveShopCreditPartner,
  reviewShop,
  updateShop,
  type ShopInput,
} from '@/db/shops.db'
import { useAuth } from '@/hooks/useAuth'
import { ServiceFactory } from '@/factories/ServiceFactory'
import type { Shop, ShopArticle, ShopCreditPartner } from '@/types/types'

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

/** Conditions des boutiques partenaires de l'achat à crédit, par id de boutique. */
export function useShopCreditPartners() {
  return useQuery({
    queryKey: ['shops', 'credit-partners'],
    queryFn: async () => new Map((await listShopCreditPartners()).map((p) => [p.shopId, p])),
    staleTime: 60 * 1000,
  })
}

export function useShopCreditPartner(shopId?: string) {
  return useQuery({
    queryKey: ['shops', 'credit-partners', shopId],
    queryFn: () => getShopCreditPartner(shopId as string),
    enabled: !!shopId,
  })
}

export function useSaveShopCreditPartner() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (partner: Omit<ShopCreditPartner, 'updatedAt' | 'updatedBy'>) =>
      saveShopCreditPartner(partner, user?.uid || 'admin'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shops'] }),
  })
}

/** Articles de toutes les boutiques. */
export function useShopArticles() {
  return useQuery({
    queryKey: ['shops', 'articles'],
    queryFn: listShopArticles,
    staleTime: 60 * 1000,
  })
}

export function useShopArticleMutations() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['shops', 'articles'] })

  /** Valide ou refuse un article et prévient le propriétaire (best-effort). */
  const review = useMutation({
    mutationFn: async ({
      article,
      decision,
      reason,
    }: {
      article: ShopArticle
      decision: 'approved' | 'rejected'
      reason?: string
    }) => {
      await reviewShopArticle(article.id, decision, user?.uid || 'admin', reason)
      const recipientId = article.ownerMatricule || article.submittedBy
      if (!recipientId) return
      try {
        await ServiceFactory.getNotificationService().notifyMember({
          recipientId,
          module: 'boutique',
          entityId: article.id,
          type: 'status_update',
          title: decision === 'approved' ? 'Article publié' : 'Article refusé',
          message:
            decision === 'approved'
              ? `Votre article « ${article.name} » est publié dans la boutique « ${article.shopName} ».`
              : `Votre article « ${article.name} » n'a pas été retenu${reason?.trim() ? ` : ${reason.trim()}` : ''}.`,
          metadata: { articleId: article.id, shopId: article.shopId, status: decision },
        })
      } catch {
        // La décision est enregistrée ; la notification n'est pas bloquante.
      }
    },
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteShopArticle(id),
    onSuccess: invalidate,
  })

  return { review, remove }
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

  /** Valide ou refuse la modification proposée par le membre, et le prévient. */
  const reviewChanges = useMutation({
    mutationFn: async ({
      shop,
      decision,
      reason,
    }: {
      shop: Shop
      decision: 'approved' | 'rejected'
      reason?: string
    }) => {
      if (decision === 'approved') await approveShopChanges(shop, user?.uid || 'admin')
      else await rejectShopChanges(shop.id, user?.uid || 'admin', reason || '')

      const recipientId = shop.ownerMatricule || shop.ownerMemberId || shop.submittedBy
      if (!recipientId) return
      await ServiceFactory.getNotificationService().notifyMember({
        recipientId,
        module: 'boutique',
        entityId: shop.id,
        type: 'status_update',
        title: decision === 'approved' ? 'Modification de boutique validée' : 'Modification de boutique refusée',
        message:
          decision === 'approved'
            ? `Les modifications de votre boutique « ${shop.name} » sont publiées dans l'annuaire.`
            : `Les modifications de votre boutique « ${shop.name} » n'ont pas été retenues${reason?.trim() ? ` : ${reason.trim()}` : ''}. La fiche publiée reste inchangée.`,
        metadata: { shopId: shop.id, changes: decision },
      })
    },
    onSuccess: invalidate,
  })

  return { create, update, remove, review, reviewChanges }
}
