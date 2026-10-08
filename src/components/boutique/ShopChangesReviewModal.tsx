'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { ArrowRight, CheckCircle2, FilePenLine, Loader2, XCircle } from 'lucide-react'

import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { pickProposableChanges } from '@/db/shops.db'
import { useShopMutations } from '@/hooks/useShops'
import type { Shop, ShopDayHours, ShopPhoto } from '@/types/types'

interface Props {
  open: boolean
  onClose: () => void
  shop: Shop | null
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nom',
  category: 'Catégorie',
  description: 'Description',
  phone: 'Téléphone',
  whatsapp: 'WhatsApp',
  email: 'Email',
  province: 'Province',
  city: 'Ville',
  district: 'Quartier',
  address: 'Adresse',
  openingHours: 'Horaires',
  photoURL: 'Photo principale',
  gallery: 'Galerie',
}

const formatHours = (hours?: ShopDayHours[]) =>
  (hours ?? []).map((h) => `${h.day} : ${h.closed ? 'fermé' : `${h.open}–${h.close}`}`).join(' · ') || '—'

const sameValue = (left: unknown, right: unknown) => JSON.stringify(left ?? '') === JSON.stringify(right ?? '')

function Thumbs({ photos }: { photos: ShopPhoto[] }) {
  if (photos.length === 0) return <span className="text-gray-400">Aucune photo</span>
  return (
    <div className="flex flex-wrap gap-1">
      {photos.slice(0, 6).map((photo) => (
        <Image
          key={photo.path || photo.url}
          src={photo.url}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 rounded border object-cover"
          unoptimized
        />
      ))}
      {photos.length > 6 && <span className="text-xs text-gray-500">+{photos.length - 6}</span>}
    </div>
  )
}

function renderValue(field: string, value: unknown) {
  if (field === 'openingHours') return <span>{formatHours(value as ShopDayHours[])}</span>
  if (field === 'gallery') return <Thumbs photos={(value as ShopPhoto[]) ?? []} />
  if (field === 'photoURL') {
    return value ? (
      <Image src={String(value)} alt="" width={56} height={56} className="h-14 w-14 rounded border object-cover" unoptimized />
    ) : (
      <span className="text-gray-400">Aucune</span>
    )
  }
  const text = typeof value === 'string' ? value.trim() : ''
  return text ? <span className="whitespace-pre-wrap">{text}</span> : <span className="text-gray-400">—</span>
}

/**
 * Examen d'une modification proposée par le propriétaire d'une boutique
 * publiée : seuls les champs qui changent sont montrés, avant → après.
 */
export default function ShopChangesReviewModal({ open, onClose, shop }: Props) {
  const { reviewChanges } = useShopMutations()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) {
      setRejecting(false)
      setReason('')
    }
  }, [open, shop?.id])

  const changes = useMemo(() => {
    if (!shop?.pendingChanges) return []
    const proposal = pickProposableChanges(shop.pendingChanges as Record<string, unknown>) as Record<string, unknown>
    return Object.keys(FIELD_LABELS)
      .filter((field) => field in proposal && !sameValue(proposal[field], (shop as unknown as Record<string, unknown>)[field]))
      .map((field) => ({
        field,
        before: (shop as unknown as Record<string, unknown>)[field],
        after: proposal[field],
      }))
  }, [shop])

  if (!shop) return null

  const decide = async (decision: 'approved' | 'rejected') => {
    if (decision === 'rejected' && !reason.trim()) {
      toast.error('Indiquez le motif du refus : le membre le recevra.')
      return
    }
    try {
      await reviewChanges.mutateAsync({ shop, decision, reason: reason.trim() })
      toast.success(decision === 'approved' ? 'Modifications publiées' : 'Modifications refusées')
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la validation')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <ModalContent size="lg">
        <ModalHeader
          icon={FilePenLine}
          title="Modification proposée"
          description={`« ${shop.name} »${shop.ownerName ? ` — ${shop.ownerName}` : ''}${
            shop.pendingChangesSubmittedAt ? `, le ${shop.pendingChangesSubmittedAt.toLocaleDateString('fr-FR')}` : ''
          }. La fiche publiée ne change qu'après validation.`}
        />

        <ModalBody>
          {changes.length === 0 ? (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
              La proposition ne change aucun champ de la fiche publiée.
            </p>
          ) : (
            <div className="space-y-3">
              {changes.map(({ field, before, after }) => (
                <div key={field} className="rounded-xl border border-gray-100 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{FIELD_LABELS[field]}</p>
                  <div className="grid grid-cols-1 items-start gap-2 text-sm sm:grid-cols-[1fr_auto_1fr]">
                    <div className="rounded-lg bg-red-50/60 px-2 py-1.5 text-gray-700">{renderValue(field, before)}</div>
                    <ArrowRight className="mx-auto hidden h-4 w-4 text-gray-400 sm:block" />
                    <div className="rounded-lg bg-emerald-50/70 px-2 py-1.5 text-gray-900">{renderValue(field, after)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {rejecting && (
            <div className="mt-4 space-y-1">
              <Label className="text-xs text-gray-500">Motif du refus *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Ex : la nouvelle photo ne correspond pas à la boutique…"
              />
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" onClick={onClose} disabled={reviewChanges.isPending}>
            Fermer
          </Button>
          {rejecting ? (
            <Button
              onClick={() => decide('rejected')}
              disabled={reviewChanges.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {reviewChanges.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Confirmer le refus
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setRejecting(true)}
                disabled={reviewChanges.isPending}
              >
                <XCircle className="mr-1 h-4 w-4" /> Refuser
              </Button>
              <Button
                onClick={() => decide('approved')}
                disabled={reviewChanges.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {reviewChanges.isPending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                )}
                Valider et publier
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
