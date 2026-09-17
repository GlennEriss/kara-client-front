'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Store, Camera, Images, Loader2, X } from 'lucide-react'

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
import { createFile, deleteFile } from '@/db/upload-image.db'
import { useShopMutations } from '@/hooks/useShops'
import { useProvinces, useDepartments, useCommunes } from '@/domains/infrastructure/geography/hooks/useGeographie'
import type { Shop, ShopPhoto } from '@/types/types'

interface Props {
  open: boolean
  onClose: () => void
  shop?: Shop | null
}

/** Aligné sur storage.rules : `isImageSizeValid()` refuse au-delà de 5 Mo. */
const MAX_PHOTO_SIZE = 5 * 1024 * 1024
/** Garde-fou : au-delà, la fiche devient illisible et l'upload interminable. */
const MAX_GALLERY_PHOTOS = 12

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
  gallery: [] as ShopPhoto[],
}

/** Vignette de galerie avec bouton de retrait. */
function GalleryThumb({
  src,
  onRemove,
  isPending = false,
}: {
  src: string
  onRemove: () => void
  isPending?: boolean
}) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg border bg-gray-50">
      <Image src={src} alt="" fill className="object-cover" unoptimized sizes="120px" />
      {isPending && (
        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
          À envoyer
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Retirer cette photo"
        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

export default function ShopFormModal({ open, onClose, shop }: Props) {
  const isEdit = !!shop
  const { create, update } = useShopMutations()
  const [form, setForm] = useState({ ...empty })
  const [selectedProvinceId, setSelectedProvinceId] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  // Galerie : photos déjà en ligne (dans `form.gallery`) + nouvelles en attente.
  const [galleryFiles, setGalleryFiles] = useState<File[]>([])
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([])
  // Photos retirées d'une boutique existante : supprimées de Storage à
  // l'enregistrement seulement, pour qu'un « Annuler » ne détruise rien.
  const [removedPaths, setRemovedPaths] = useState<string[]>([])
  const galleryInputRef = useRef<HTMLInputElement>(null)
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
        gallery: shop.gallery ? [...shop.gallery] : [],
      })
      setSelectedProvinceId(provinces.find((p) => p.name === shop.province)?.id || '')
    } else {
      setForm({ ...empty, openingHours: makeDefaultHours() })
      setSelectedProvinceId('')
    }
    setPhotoFile(null)
    setPhotoPreview('')
    setGalleryFiles([])
    setGalleryPreviews([])
    setRemovedPaths([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shop])

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const galleryCount = form.gallery.length + galleryFiles.length

  /** Ajoute des fichiers à la galerie après contrôle du poids et du quota. */
  const addGalleryFiles = (files: File[]) => {
    const remaining = MAX_GALLERY_PHOTOS - galleryCount
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_GALLERY_PHOTOS} photos par boutique`)
      return
    }
    const tooBig = files.filter((f) => f.size > MAX_PHOTO_SIZE)
    if (tooBig.length > 0) {
      toast.error(`Photo trop lourde (max 5 Mo) : ${tooBig.map((f) => f.name).join(', ')}`)
    }
    const accepted = files.filter((f) => f.size <= MAX_PHOTO_SIZE).slice(0, remaining)
    if (accepted.length < files.length - tooBig.length) {
      toast.info(`Seules ${remaining} photo(s) supplémentaires sont possibles`)
    }
    if (accepted.length === 0) return
    setGalleryFiles((prev) => [...prev, ...accepted])
    setGalleryPreviews((prev) => [...prev, ...accepted.map((f) => URL.createObjectURL(f))])
  }

  /** Retire une photo déjà en ligne (suppression Storage différée au submit). */
  const removeExistingPhoto = (index: number) => {
    const photo = form.gallery[index]
    if (photo?.path) setRemovedPaths((prev) => [...prev, photo.path])
    set('gallery', form.gallery.filter((_, i) => i !== index))
  }

  /** Retire une photo pas encore envoyée. */
  const removePendingPhoto = (index: number) => {
    URL.revokeObjectURL(galleryPreviews[index])
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index))
    setGalleryPreviews((prev) => prev.filter((_, i) => i !== index))
  }

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

      // Upload des nouvelles photos de galerie, puis fusion avec celles conservées.
      let gallery = form.gallery
      if (galleryFiles.length > 0) {
        const uploadId = shop?.id || `new_${Date.now()}`
        const uploaded = await Promise.all(
          galleryFiles.map((file) => createFile(file, uploadId, `shops/${uploadId}/gallery`)),
        )
        gallery = [...gallery, ...uploaded.map(({ url, path }) => ({ url, path }))]
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
        gallery,
      }

      if (isEdit && shop) {
        await update.mutateAsync({ id: shop.id, updates: payload })
        toast.success('Boutique mise à jour')
      } else {
        await create.mutateAsync(payload)
        toast.success('Boutique créée')
      }

      // Nettoyage Storage une fois la fiche enregistrée : si la sauvegarde a
      // échoué, les fichiers sont toujours référencés et ne doivent pas partir.
      await Promise.all(
        removedPaths.map((path) =>
          deleteFile(path).catch((error) => {
            // Un fichier orphelin est moins grave qu'un enregistrement bloqué.
            console.error('[shops] suppression photo impossible:', path, error)
          }),
        ),
      )
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
                accept="image/jpeg,image/png,image/webp"
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

          {/* Galerie : ce que propose la boutique */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="text-xs text-gray-500">
                Photos du contenu de la boutique
                <span className="ml-1 text-gray-400">
                  ({galleryCount}/{MAX_GALLERY_PHOTOS})
                </span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => galleryInputRef.current?.click()}
                disabled={galleryCount >= MAX_GALLERY_PHOTOS}
              >
                <Images className="mr-1 h-3.5 w-3.5" /> Ajouter des photos
              </Button>
            </div>

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                addGalleryFiles(Array.from(e.target.files || []))
                e.target.value = ''
              }}
            />

            {galleryCount === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-xs text-gray-400">
                Aucune photo. Ajoutez des vues des produits ou de la vitrine.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {form.gallery.map((photo, index) => (
                  <GalleryThumb
                    key={photo.path || photo.url}
                    src={photo.url}
                    onRemove={() => removeExistingPhoto(index)}
                  />
                ))}
                {galleryPreviews.map((preview, index) => (
                  <GalleryThumb
                    key={`pending-${preview}`}
                    src={preview}
                    isPending
                    onRemove={() => removePendingPhoto(index)}
                  />
                ))}
              </div>
            )}
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
