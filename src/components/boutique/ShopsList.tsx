'use client'

import React, { useMemo, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import {
  CheckCircle2,
  Clock,
  EyeOff,
  Images,
  MapPin,
  Pencil,
  Plus,
  Search,
  Store,
  Tag,
  Trash2,
  User,
  XCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useShops, useShopMutations } from '@/hooks/useShops'
import ShopFormModal from './ShopFormModal'
import ShopReviewModal from './ShopReviewModal'
import { StatsBreakdownBar } from '@/components/ui/stats-breakdown-bar'
import { cn } from '@/lib/utils'
import type { Shop } from '@/types/types'

/**
 * Onglets de l'annuaire. « À valider » isole les fiches soumises par les
 * membres depuis leur portail : elles ne sont pas encore dans l'annuaire.
 */
type ShopTab = 'pending' | 'published' | 'hidden' | 'all'

const TAB_ITEMS: { value: ShopTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'pending', label: 'À valider', icon: Clock },
  { value: 'published', label: 'Publiées', icon: CheckCircle2 },
  { value: 'hidden', label: 'Masquées', icon: EyeOff },
  { value: 'all', label: 'Toutes', icon: Store },
]

/** Une boutique est publiée si elle est validée ET visible. */
function isPublished(shop: Shop): boolean {
  return (shop.status ?? 'approved') === 'approved' && shop.isActive
}

function matchesTab(shop: Shop, tab: ShopTab): boolean {
  const status = shop.status ?? 'approved'
  switch (tab) {
    case 'pending':
      return status === 'pending'
    case 'published':
      return isPublished(shop)
    case 'hidden':
      // Refusées et retirées de l'annuaire : tout ce qui est tranché mais invisible.
      return status !== 'pending' && !shop.isActive
    default:
      return true
  }
}

/** Carte d'indicateur compacte, alignée sur celles des autres sections. */
function ShopStatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  color: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-2.5 py-2 shadow-sm">
      <div className="shrink-0 rounded-lg p-1.5" style={{ backgroundColor: `${color}15`, color }}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
        <p className="text-sm font-black tabular-nums text-gray-900">{value}</p>
      </div>
    </div>
  )
}

export default function ShopsList() {
  const { data: shops = [], isLoading } = useShops()
  const { remove } = useShopMutations()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Shop | null>(null)
  const [tab, setTab] = useState<ShopTab>('all')
  const [reviewing, setReviewing] = useState<{ shop: Shop; decision: 'approved' | 'rejected' } | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return shops.filter((s) => {
      if (!matchesTab(s, tab)) return false
      if (!q) return true
      return [s.name, s.category, s.city, s.ownerName, s.description]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    })
  }, [shops, search, tab])

  const tabCounts = useMemo(
    () => ({
      pending: shops.filter((s) => matchesTab(s, 'pending')).length,
      published: shops.filter((s) => matchesTab(s, 'published')).length,
      hidden: shops.filter((s) => matchesTab(s, 'hidden')).length,
      all: shops.length,
    }),
    [shops],
  )

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (shop: Shop) => {
    setEditing(shop)
    setModalOpen(true)
  }
  /**
   * Indicateurs de l'annuaire. Calculés sur toutes les boutiques et non sur la
   * recherche en cours : ils décrivent le fonds, pas l'écran.
   */
  const stats = useMemo(() => {
    const published = shops.filter(isPublished).length
    const pending = shops.filter((s) => (s.status ?? 'approved') === 'pending').length
    const categories = new Set(shops.map((s) => s.category?.trim()).filter(Boolean)).size
    const withPhotos = shops.filter((s) => (s.gallery?.length ?? 0) > 0).length
    return {
      total: shops.length,
      published,
      pending,
      hidden: shops.length - published - pending,
      categories,
      withPhotos,
    }
  }, [shops])

  const handleDelete = async (shop: Shop) => {
    if (!confirm(`Supprimer la boutique « ${shop.name} » ?`)) return
    try {
      await remove.mutateAsync(shop.id)
      toast.success('Boutique supprimée')
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <div className="container mx-auto space-y-6 p-4 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[#234D65]">
            <Store className="h-6 w-6" /> Boutiques
          </h1>
          <p className="text-sm text-gray-500">Annuaire des commerces des membres — visible par tous les membres.</p>
        </div>
        <Button onClick={openCreate} className="bg-[#234D65] hover:bg-[#234D65]/90">
          <Plus className="mr-1 h-4 w-4" /> Ajouter une boutique
        </Button>
      </div>

      {!isLoading && shops.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <ShopStatCard icon={Store} label="Total" value={stats.total} color="#234D65" />
            <ShopStatCard icon={Clock} label="À valider" value={stats.pending} color="#f59e0b" />
            <ShopStatCard icon={CheckCircle2} label="Publiées" value={stats.published} color="#10b981" />
            <ShopStatCard icon={EyeOff} label="Masquées" value={stats.hidden} color="#6b7280" />
            <ShopStatCard icon={Tag} label="Catégories" value={stats.categories} color="#3b82f6" />
            <ShopStatCard icon={Images} label="Avec photos" value={stats.withPhotos} color="#e87ba4" />
          </div>

          <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm">
            <StatsBreakdownBar
              title="Visibilité dans l'annuaire"
              segments={[
                { label: 'Publiées', value: stats.published, color: '#10b981' },
                { label: 'À valider', value: stats.pending, color: '#f59e0b' },
                { label: 'Masquées', value: stats.hidden, color: '#6b7280' },
              ]}
            />
          </div>
        </div>
      )}

      {/* La file d'attente ne doit pas dépendre d'un onglet qu'on pense à
          ouvrir : on la signale tant qu'elle n'est pas vide. */}
      {!isLoading && stats.pending > 0 && tab !== 'pending' && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-900">
            <span className="font-semibold">{stats.pending}</span>{' '}
            {stats.pending > 1 ? 'boutiques soumises par des membres attendent' : 'boutique soumise par un membre attend'}{' '}
            votre validation.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100 sm:shrink-0"
            onClick={() => setTab('pending')}
          >
            Voir les demandes
          </Button>
        </div>
      )}

      {/* Onglets : défilement horizontal sur mobile, aucune troncature. */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TAB_ITEMS.map(({ value, label, icon: Icon }) => {
          const isActive = tab === value
          const count = tabCounts[value]
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                isActive
                  ? 'border-[#234D65] bg-[#234D65] text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-[#234D65]',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] tabular-nums',
                  isActive ? 'bg-white/20' : 'bg-gray-100 text-gray-600',
                  !isActive && value === 'pending' && count > 0 ? 'bg-amber-100 text-amber-800' : '',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Rechercher (nom, catégorie, ville, propriétaire)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-gray-500">
          {search
            ? 'Aucune boutique ne correspond à la recherche.'
            : tab === 'pending'
              ? 'Aucune boutique en attente de validation.'
              : tab === 'published'
                ? "Aucune boutique publiée dans l'annuaire."
                : tab === 'hidden'
                  ? 'Aucune boutique masquée ou refusée.'
                  : 'Aucune boutique. Cliquez sur « Ajouter une boutique ».'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((shop) => (
            <Card key={shop.id} className="overflow-hidden rounded-2xl border-gray-100 shadow-sm transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {shop.photoURL ? (
                    <Image
                      src={shop.photoURL}
                      alt={shop.name}
                      width={56}
                      height={56}
                      className="h-14 w-14 flex-shrink-0 rounded-lg border object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border bg-gray-50 text-gray-400">
                      <Store className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-gray-900">{shop.name}</p>
                      {(shop.status ?? 'approved') === 'pending' ? (
                        <Badge className="bg-amber-100 text-xs text-amber-800 hover:bg-amber-100">À valider</Badge>
                      ) : shop.status === 'rejected' ? (
                        <Badge className="bg-red-100 text-xs text-red-700 hover:bg-red-100">Refusée</Badge>
                      ) : (
                        !shop.isActive && (
                          <Badge variant="outline" className="text-xs text-gray-500">Masquée</Badge>
                        )
                      )}
                    </div>
                    <p className="truncate text-sm text-[#234D65]">{shop.category}</p>
                    {shop.ownerName && (
                      <p className="mt-1 flex items-center gap-1 truncate text-xs text-gray-500">
                        <User className="h-3 w-3" /> {shop.ownerName}
                      </p>
                    )}
                    {(shop.city || shop.province) && (
                      <p className="flex items-center gap-1 truncate text-xs text-gray-500">
                        <MapPin className="h-3 w-3" /> {[shop.city, shop.province].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                {/* Aperçu de la galerie : montre d'un coup d'œil les fiches
                    déjà illustrées et celles qui restent à compléter. */}
                {shop.gallery && shop.gallery.length > 0 && (
                  <div className="mt-3 flex items-center gap-1.5">
                    {shop.gallery.slice(0, 4).map((photo) => (
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
                    {shop.gallery.length > 4 && (
                      <span className="text-xs font-medium text-gray-500">
                        +{shop.gallery.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Motif du refus : l'admin doit pouvoir relire ce qu'il a
                    répondu au membre sans rouvrir la fiche. */}
                {shop.status === 'rejected' && shop.rejectionReason && (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    Motif du refus : {shop.rejectionReason}
                  </p>
                )}

                {(shop.status ?? 'approved') === 'pending' && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setReviewing({ shop, decision: 'approved' })}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Valider
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setReviewing({ shop, decision: 'rejected' })}
                    >
                      <XCircle className="mr-1 h-4 w-4" /> Refuser
                    </Button>
                  </div>
                )}

                <div className="mt-3 flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(shop)} title="Modifier">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(shop)}
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ShopFormModal open={modalOpen} onClose={() => setModalOpen(false)} shop={editing} />
      <ShopReviewModal
        open={!!reviewing}
        onClose={() => setReviewing(null)}
        shop={reviewing?.shop ?? null}
        decision={reviewing?.decision ?? 'approved'}
      />
    </div>
  )
}
