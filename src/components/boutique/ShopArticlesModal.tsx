'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, Package, Trash2, XCircle } from 'lucide-react'

import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useShopArticleMutations, useShopArticles } from '@/hooks/useShops'
import { cn } from '@/lib/utils'
import type { Shop, ShopArticle } from '@/types/types'

const fcfa = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} FCFA`

const STATUS: Record<ShopArticle['status'], { label: string; className: string }> = {
  pending: { label: 'À valider', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  approved: { label: 'Publié', className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
  rejected: { label: 'Refusé', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
}

interface Props {
  open: boolean
  onClose: () => void
  /** Catalogue d'une boutique ; sans boutique, la file des articles à valider. */
  shop?: Shop | null
}

/**
 * Articles des boutiques : validation des articles proposés par les
 * propriétaires (le prix engage l'association, qui paie le vendeur).
 */
export default function ShopArticlesModal({ open, onClose, shop }: Props) {
  const { data: all = [], isLoading } = useShopArticles()
  const { review, remove } = useShopArticleMutations()
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const articles = useMemo(
    () => (shop ? all.filter((a) => a.shopId === shop.id) : all.filter((a) => a.status === 'pending')),
    [all, shop],
  )

  const decide = async (article: ShopArticle, decision: 'approved' | 'rejected') => {
    if (decision === 'rejected' && !reason.trim()) {
      toast.error('Indiquez le motif du refus : le membre le recevra.')
      return
    }
    try {
      await review.mutateAsync({ article, decision, reason: reason.trim() })
      toast.success(decision === 'approved' ? 'Article publié' : 'Article refusé')
      setRejectingId(null)
      setReason('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la validation')
    }
  }

  const handleDelete = async (article: ShopArticle) => {
    if (!confirm(`Supprimer l'article « ${article.name} » ?`)) return
    try {
      await remove.mutateAsync(article.id)
      toast.success('Article supprimé')
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <ModalContent size="lg">
        <ModalHeader
          icon={Package}
          title={shop ? `Articles de « ${shop.name} »` : 'Articles à valider'}
          description={
            shop
              ? 'Catalogue proposé par le propriétaire. Seuls les articles publiés peuvent être payés en 2 ou 3 fois.'
              : 'Articles ajoutés ou modifiés par les propriétaires des boutiques.'
          }
        />

        <ModalBody>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : articles.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">
              {shop ? 'Aucun article dans cette boutique.' : 'Aucun article en attente de validation.'}
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {articles.map((article) => (
                <div key={article.id} className="space-y-2 py-3">
                  <div className="flex items-start gap-3">
                    {article.photoURL ? (
                      <Image
                        src={article.photoURL}
                        alt={article.name}
                        width={56}
                        height={56}
                        className="h-14 w-14 shrink-0 rounded-lg border object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                        <Package className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900">{article.name}</p>
                        <Badge className={STATUS[article.status].className}>{STATUS[article.status].label}</Badge>
                        {article.status === 'approved' && !article.isAvailable && (
                          <Badge variant="outline" className="text-gray-500">En rupture</Badge>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-[#234D65]">{fcfa(article.price)}</p>
                      {!shop && <p className="text-xs text-gray-500">Boutique « {article.shopName} »</p>}
                      {article.description && <p className="mt-1 text-sm text-gray-600">{article.description}</p>}
                      {article.photos.length > 1 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {article.photos.map((photo) => (
                            <a key={photo.path || photo.url} href={photo.url} target="_blank" rel="noreferrer">
                              <Image
                                src={photo.url}
                                alt=""
                                width={48}
                                height={48}
                                className="h-12 w-12 rounded border object-cover hover:opacity-80"
                                unoptimized
                              />
                            </a>
                          ))}
                        </div>
                      )}
                      {article.status === 'rejected' && article.rejectionReason && (
                        <p className="mt-1 text-xs text-red-700">Motif : {article.rejectionReason}</p>
                      )}
                    </div>
                  </div>

                  {rejectingId === article.id ? (
                    <div className="space-y-2">
                      <Textarea
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Motif du refus (transmis au membre)"
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setRejectingId(null)}>
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                          disabled={review.isPending}
                          onClick={() => decide(article, 'rejected')}
                        >
                          Confirmer le refus
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className={cn('flex flex-wrap justify-end gap-2')}>
                      {article.status !== 'approved' && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          disabled={review.isPending}
                          onClick={() => decide(article, 'approved')}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Valider
                        </Button>
                      )}
                      {article.status !== 'rejected' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => {
                            setRejectingId(article.id)
                            setReason('')
                          }}
                        >
                          <XCircle className="mr-1 h-4 w-4" /> {article.status === 'approved' ? 'Retirer' : 'Refuser'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(article)}
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
