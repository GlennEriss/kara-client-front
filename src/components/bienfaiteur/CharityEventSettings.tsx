'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUpdateCharityEvent } from '@/hooks/bienfaiteur/useCharityEvents'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CharityEvent } from '@/types/types'
import { Calendar, Upload, X, Image as ImageIcon, Save, XCircle } from 'lucide-react'
import { charityEventSchema, CharityEventFormData } from '@/schemas/bienfaiteur.schema'
import Image from 'next/image'
import { uploadCharityEventCover, deleteCharityEventCover } from '@/services/bienfaiteur/CharityMediaService'
import { CHARITY_EVENT_STATUS_LABELS } from '@/types/types'

interface CharityEventSettingsProps {
  event: CharityEvent
}

export default function CharityEventSettings({ event }: CharityEventSettingsProps) {
  const router = useRouter()
  const { mutate: updateEvent, isPending } = useUpdateCharityEvent()
  const [coverPreview, setCoverPreview] = useState<string | null>(event.coverPhotoUrl || null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [isUploadingCover, setIsUploadingCover] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<CharityEventFormData>({
    resolver: zodResolver(charityEventSchema) as any,
    defaultValues: {
      title: event.title,
      location: event.location,
      startDate: event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : '',
      endDate: event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : '',
      description: event.description,
      targetAmount: event.targetAmount?.toString() || '',
      minContributionAmount: event.minContributionAmount?.toString() || '',
      status: event.status,
      isPublic: event.isPublic ?? true,
    }
  })

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La taille de l\'image ne doit pas dépasser 5MB')
        return
      }
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error('Format non supporté. Utilisez JPG, PNG ou WEBP')
        return
      }

      setCoverFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeCoverPhoto = () => {
    setCoverFile(null)
    setCoverPreview(event.coverPhotoUrl || null)
  }

  const onSubmit = async (data: CharityEventFormData) => {
    try {
      let coverPhotoUrl: string | null = event.coverPhotoUrl || null
      let coverPhotoPath: string | null = event.coverPhotoPath || null

      // Upload de la nouvelle image de couverture si elle existe
      if (coverFile) {
        try {
          setIsUploadingCover(true)
          toast.info('Upload de l\'image en cours...')
          
          // Supprimer l'ancienne image si elle existe
          if (event.coverPhotoPath) {
            await deleteCharityEventCover(event.coverPhotoPath)
          }
          
          const uploadResult = await uploadCharityEventCover(coverFile, event.id)
          coverPhotoUrl = uploadResult.url
          coverPhotoPath = uploadResult.path
          toast.success('Image uploadée avec succès!')
        } catch (uploadError: any) {
          toast.error(`Erreur lors de l'upload de l'image: ${uploadError.message}`)
          setIsUploadingCover(false)
          return
        } finally {
          setIsUploadingCover(false)
        }
      }

      const updateData: Partial<CharityEvent> = {
        title: data.title,
        location: data.location,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        description: data.description,
        targetAmount: data.targetAmount ? parseFloat(data.targetAmount) : undefined,
        minContributionAmount: data.minContributionAmount ? parseFloat(data.minContributionAmount) : undefined,
        status: data.status || event.status,
        isPublic: data.isPublic ?? event.isPublic,
        coverPhotoUrl,
        coverPhotoPath,
        updatedAt: new Date(),
      }

      updateEvent(
        { eventId: event.id, updates: updateData },
        {
          onSuccess: () => {
            toast.success('Évènement mis à jour avec succès!')
            router.refresh()
          },
          onError: (error: any) => {
            toast.error(error.message || 'Erreur lors de la mise à jour de l\'évènement')
          }
        }
      )
    } catch (error) {
      toast.error('Une erreur est survenue')
      console.error(error)
    }
  }

  const statusOptions = Object.entries(CHARITY_EVENT_STATUS_LABELS).map(([value, label]) => ({
    value,
    label
  }))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Informations générales */}
      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre de l'évènement *</Label>
              <Input
                id="title"
                placeholder="Ex. Récolection 2025 - MELEN"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Lieu *</Label>
              <Input
                id="location"
                placeholder="Ex. MELEN, Libreville, Gabon"
                {...register('location')}
              />
              {errors.location && (
                <p className="text-sm text-red-500">{errors.location.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de début *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="startDate"
                  type="date"
                  className="pl-10"
                  {...register('startDate')}
                />
              </div>
              {errors.startDate && (
                <p className="text-sm text-red-500">{errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="endDate"
                  type="date"
                  className="pl-10"
                  {...register('endDate')}
                />
              </div>
              {errors.endDate && (
                <p className="text-sm text-red-500">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description / Communiqué officiel *</Label>
            <Textarea
              id="description"
              placeholder="Décrivez l'évènement, son objectif, les modalités de participation..."
              rows={6}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financement */}
      <Card>
        <CardHeader>
          <CardTitle>Financement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetAmount">Objectif financier (FCFA)</Label>
              <Input
                id="targetAmount"
                type="number"
                placeholder="Ex. 500000"
                {...register('targetAmount')}
              />
              {errors.targetAmount && (
                <p className="text-sm text-red-500">{errors.targetAmount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="minContributionAmount">Contribution minimale par membre (FCFA)</Label>
              <Input
                id="minContributionAmount"
                type="number"
                placeholder="Ex. 5000"
                {...register('minContributionAmount')}
              />
              {errors.minContributionAmount && (
                <p className="text-sm text-red-500">{errors.minContributionAmount.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visuel */}
      <Card>
        <CardHeader>
          <CardTitle>Image de couverture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {coverPreview ? (
            <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-gray-200">
              <Image
                src={coverPreview}
                alt="Aperçu de la couverture"
                fill
                className="object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={removeCoverPhoto}
                className="absolute top-2 right-2"
              >
                <X className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-2">Aucune image de couverture</p>
            </div>
          )}

          <div>
            <Label htmlFor="coverFile" className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Upload className="w-4 h-4" />
                <span>{coverPreview ? 'Changer l\'image' : 'Téléverser une image'}</span>
              </div>
            </Label>
            <Input
              id="coverFile"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleCoverFileChange}
              className="hidden"
            />
            <p className="text-xs text-gray-500 mt-2">
              JPG, PNG, WEBP • Max 5MB • 1200x600px recommandé
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Statut et visibilité */}
      <Card>
        <CardHeader>
          <CardTitle>Statut et visibilité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Statut de l'évènement</Label>
              <Select
                value={watch('status')}
                onValueChange={(value) => setValue('status', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="isPublic">Visibilité</Label>
              <Select
                value={watch('isPublic') ? 'true' : 'false'}
                onValueChange={(value) => setValue('isPublic', value === 'true')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Public</SelectItem>
                  <SelectItem value="false">Privé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending || isUploadingCover}
        >
          <XCircle className="w-4 h-4 mr-2" />
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={isPending || isUploadingCover}
          className="bg-[#234D65] hover:bg-[#2c5a73]"
        >
          {isPending || isUploadingCover ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Enregistrer les modifications
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

