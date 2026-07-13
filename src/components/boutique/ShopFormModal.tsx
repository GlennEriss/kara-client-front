'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Store, Camera, Loader2 } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import MemberSearchInput from '@/components/vehicule/MemberSearchInput'
import GabonPhoneInput from '@/components/shared/GabonPhoneInput'
import ShopHoursEditor, { makeDefaultHours, normalizeHours } from './ShopHoursEditor'
import { createFile } from '@/db/upload-image.db'
import { useShopMutations } from '@/hooks/useShops'
import { useProvinces, useDepartments, useCommunes } from '@/domains/infrastructure/geography/hooks/useGeographie'
import type { Shop } from '@/types/types'

interface Props {
  open: boolean
  onClose: () => void
  shop?: Shop | null
}

const empty = {
  name: '',
  category: '',
  description: '',
  ownerMemberId: '',
  ownerName: '',
  ownerMatricule: '',
  phone: '',
  whatsapp: '',
  email: '',
  province: '',
  city: '',
  district: '',
  address: '',
  openingHours: makeDefaultHours(),
  isActive: true,
  photoURL: '',
  photoPath: '',
}

export default function ShopFormModal({ open, onClose, shop }: Props) {
  const isEdit = !!shop
  const { create, update } = useShopMutations()
  const [form, setForm] = useState({ ...empty })
  const [selectedProvinceId, setSelectedProvinceId] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const { data: provinces = [] } = useProvinces()
  const { data: departments = [] } = useDepartments(selectedProvinceId || undefined)
  const { data: allCommunes = [] } = useCommunes()

  const cities = useMemo(() => {
    if (!selectedProvinceId) return []
    const deptIds = new Set(departments.map((d) => d.id))
    return allCommunes
      .filter((c) => deptIds.has(c.departmentId))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
  }, [selectedProvinceId, departments, allCommunes])

  const sortedProvinces = useMemo(
    () => [...provinces].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
    [provinces],
  )

  // (Ré)initialise le formulaire à l'ouverture / au changement de boutique.
  useEffect(() => {
    if (!open) return
    if (shop) {
      setForm({
        name: shop.name || '',
        category: shop.category || '',
        description: shop.description || '',
        ownerMemberId: shop.ownerMemberId || '',
        ownerName: shop.ownerName || '',
        ownerMatricule: shop.ownerMatricule || '',
        phone: shop.phone || '',
        whatsapp: shop.whatsapp || '',
        email: shop.email || '',
        province: shop.province || '',
        city: shop.city || '',
        district: shop.district || '',
        address: shop.address || '',
        openingHours: normalizeHours(shop.openingHours),
        isActive: shop.isActive ?? true,
        photoURL: shop.photoURL || '',
        photoPath: shop.photoPath || '',
      })
      setSelectedProvinceId(provinces.find((p) => p.name === shop.province)?.id || '')
    } else {
      setForm({ ...empty, openingHours: makeDefaultHours() })
      setSelectedProvinceId('')
    }
    setPhotoFile(null)
    setPhotoPreview('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shop])

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error('Le nom de la boutique est obligatoire')
    if (!form.category.trim()) return toast.error('La spécialité / catégorie est obligatoire')

    setSubmitting(true)
    try {
      let photoURL = form.photoURL
      let photoPath = form.photoPath
      if (photoFile) {
        const uploadId = shop?.id || `new_${Date.now()}`
        const res = await createFile(photoFile, uploadId, `shops/${uploadId}`)
        photoURL = res.url
        photoPath = res.path
      }

      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        ownerMemberId: form.ownerMemberId,
        ownerName: form.ownerName,
        ownerMatricule: form.ownerMatricule,
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        email: form.email.trim(),
        province: form.province,
        city: form.city,
        district: form.district.trim(),
        address: form.address.trim(),
        openingHours: form.openingHours,
        isActive: form.isActive,
        photoURL,
        photoPath,
      }

      if (isEdit && shop) {
        await update.mutateAsync({ id: shop.id, updates: payload })
        toast.success('Boutique mise à jour')
      } else {
        await create.mutateAsync(payload)
        toast.success('Boutique créée')
      }
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <ModalContent size="lg">
        <ModalHeader
          icon={Store}
          title={isEdit ? 'Modifier la boutique' : 'Ajouter une boutique'}
          description="Renseignez les informations de la boutique. Elle sera visible par les membres si « Active »."
        />

        <ModalBody>
          {/* Base */}
          <p className="text-xs font-semibold uppercase tracking-wide text-[#234D65]/70">Informations</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Nom de la boutique *</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: Chez Youri" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Spécialité / Catégorie *</Label>
              <Input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Ex: Restauration, Couture…" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Propriétaire (membre)</Label>
            <MemberSearchInput
              value={form.ownerMemberId}
              onChange={(memberId, member) => {
                set('ownerMemberId', memberId)
                set('ownerName', member ? `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() : '')
                set('ownerMatricule', member?.matricule || '')
              }}
              placeholder="Rechercher le membre propriétaire…"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Description</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Que propose cette boutique ?"
            />
          </div>

          {/* Contact */}
          <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-[#234D65]/70">Contact</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Téléphone</Label>
              <GabonPhoneInput value={form.phone} onChange={(v) => set('phone', v)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">WhatsApp</Label>
              <GabonPhoneInput value={form.whatsapp} onChange={(v) => set('whatsapp', v)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="contact@exemple.com" />
          </div>

          {/* Localisation */}
          <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-[#234D65]/70">Localisation</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Province</Label>
              <Select
                value={form.province}
                onValueChange={(name) => {
                  set('province', name)
                  setSelectedProvinceId(provinces.find((p) => p.name === name)?.id || '')
                  set('city', '')
                }}
              >
                <SelectTrigger><SelectValue placeholder="Choisir une province" /></SelectTrigger>
                <SelectContent>
                  {sortedProvinces.map((p) => (
                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Ville</Label>
              <Select
                value={form.city}
                onValueChange={(v) => set('city', v)}
                disabled={!selectedProvinceId || cities.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!selectedProvinceId ? "Choisir d'abord une province" : 'Choisir une ville'} />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Quartier</Label>
              <Input value={form.district} onChange={(e) => set('district', e.target.value)} placeholder="Quartier" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Adresse / Repère</Label>
              <Input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Près de…" />
            </div>
          </div>

          {/* Médias & horaires */}
          <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-[#234D65]/70">Médias &amp; horaires</p>
          <ShopHoursEditor value={form.openingHours} onChange={(v) => set('openingHours', v)} />
          <div className="space-y-1 sm:max-w-xs">
            <Label className="text-xs text-gray-500">Statut</Label>
            <Select value={form.isActive ? 'active' : 'inactive'} onValueChange={(v) => set('isActive', v === 'active')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active (visible)</SelectItem>
                <SelectItem value="inactive">Inactive (masquée)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Photo / logo</Label>
            <div className="flex items-center gap-3">
              {(photoPreview || form.photoURL) ? (
                <Image
                  src={photoPreview || form.photoURL}
                  alt="Boutique"
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-lg border object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg border bg-gray-50 text-gray-400">
                  <Camera className="h-6 w-6" />
                </div>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setPhotoFile(f)
                    setPhotoPreview(URL.createObjectURL(f))
                  }
                  e.target.value = ''
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
                <Camera className="mr-1 h-3.5 w-3.5" /> {form.photoURL || photoPreview ? 'Changer' : 'Ajouter'}
              </Button>
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="flex-col-reverse gap-2 sm:flex-row [&>button]:w-full sm:[&>button]:w-auto">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Annuler</Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
