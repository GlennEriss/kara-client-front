'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { MapPin, Pencil, Plus, Search, Store, Trash2, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useShops, useShopMutations } from '@/hooks/useShops'
import ShopFormModal from './ShopFormModal'
import type { Shop } from '@/types/types'

export default function ShopsList() {
  const { data: shops = [], isLoading } = useShops()
  const { remove } = useShopMutations()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Shop | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return shops
    return shops.filter((s) =>
      [s.name, s.category, s.city, s.ownerName, s.description]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    )
  }, [shops, search])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (shop: Shop) => {
    setEditing(shop)
    setModalOpen(true)
  }
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
          {search ? 'Aucune boutique ne correspond à la recherche.' : 'Aucune boutique. Cliquez sur « Ajouter une boutique ».'}
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
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-gray-900">{shop.name}</p>
                      {!shop.isActive && <Badge variant="outline" className="text-xs text-gray-500">Masquée</Badge>}
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
    </div>
  )
}
