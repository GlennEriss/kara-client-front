'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useUpdateCharityEvent } from '@/hooks/bienfaiteur/useCharityEvents'
import { useRouter } from 'next/navigation'
import routes from '@/constantes/routes'
import { toast } from 'sonner'
import { CharityEvent } from '@/types/types'
import { Calendar, Upload, X, Image as ImageIcon } from 'lucide-react'
import { charityEventSchema, CharityEventFormData } from '@/schemas/bienfaiteur.schema'
import Image from 'next/image'
import { uploadCharityEventCover, deleteCharityEventCover } from '@/services/bienfaiteur/CharityMediaService'

interface EditCharityEventFormProps {
  event: CharityEvent
}

export default function EditCharityEventForm({ event }: EditCharityEventFormProps) {
  const router = useRouter()
  const { mutate: updateEvent, isPending } = useUpdateCharityEvent()
  const [coverPreview, setCoverPreview] = useState<string | null>(event.coverPhotoUrl || null)
  const [coverFile, setCoverFile] = useState<File | null>(null)

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

  useEffect(() => {
    // Pré-remplir les valeurs du formulaire
    setValue('title', event.title)
    setValue('location', event.location)
    setValue('startDate', event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : '')
    setValue('endDate', event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : '')
    setValue('description', event.description)
    setValue('targetAmount', event.targetAmount?.toString() || '')
    setValue('minContributionAmount', event.minContributionAmount?.toString() || '')
    setValue('status', event.status)
    setValue('isPublic', event.isPublic ?? true)
  }, [event, setValue])

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
      setValue('coverPhotoFile', file)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeCoverPhoto = () => {
    setCoverFile(null)
    setCoverPreview(null)
    setValue('coverPhotoFile', undefined)
  }

  const onSubmit = async (data: CharityEventFormData) => {
    try {
      let coverPhotoUrl: string | null | undefined = event.coverPhotoUrl
      let coverPhotoPath: string | null | undefined = event.coverPhotoPath

      // Si une nouvelle image a été uploadée
      if (coverFile) {
        try {
          toast.info('Upload de l\'image en cours...')
          
          // Supprimer l'ancienne image si elle existe
          if (event.coverPhotoPath) {
            await deleteCharityEventCover(event.coverPhotoPath)
          }
          
          // Uploader la nouvelle image
          const uploadResult = await uploadCharityEventCover(coverFile, event.id)
          coverPhotoUrl = uploadResult.url
          coverPhotoPath = uploadResult.path
          toast.success('Image uploadée avec succès!')
        } catch (uploadError: any) {
          toast.error(`Erreur lors de l'upload de l'image: ${uploadError.message}`)
          return // Arrêter si l'upload échoue
        }
      } else if (!coverPreview && event.coverPhotoPath) {
        // Si l'image a été supprimée
        await deleteCharityEventCover(event.coverPhotoPath)
        coverPhotoUrl = null
        coverPhotoPath = null
      }
      
      const updates: Partial<CharityEvent> = {
        title: data.title,
        location: data.location,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        description: data.description,
        targetAmount: data.targetAmount ? parseFloat(data.targetAmount) : undefined,
        minContributionAmount: data.minContributionAmount ? parseFloat(data.minContributionAmount) : undefined,
        status: data.status || event.status,
        isPublic: data.isPublic ?? true,
        coverPhotoUrl,
        coverPhotoPath,
      }

      updateEvent(
        { eventId: event.id, updates },
        {
          onSuccess: () => {
            toast.success('Évènement modifié avec succès!')
            router.push(routes.admin.bienfaiteurDetails(event.id))
          },
          onError: (error: any) => {
            toast.error(error.message || 'Erreur lors de la modification de l\'évènement')
          }
        }
      )
    } catch (error) {
      toast.error('Une erreur est survenue')
      console.error(error)
    }
  }

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
            <p className="text-xs text-gray-500">
              Cette description sera visible par tous les membres
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Objectifs financiers */}
      <Card>
        <CardHeader>
          <CardTitle>Objectifs financiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetAmount">Montant cible (optionnel)</Label>
              <div className="relative">
                <Input
                  id="targetAmount"
                  type="number"
                  placeholder="Ex. 500000"
                  {...register('targetAmount')}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  FCFA
                </span>
              </div>
              {errors.targetAmount && (
                <p className="text-sm text-red-500">{errors.targetAmount.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Montant total à collecter pour l'évènement
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minContributionAmount">Contribution minimum par membre (optionnel)</Label>
              <div className="relative">
                <Input
                  id="minContributionAmount"
                  type="number"
                  placeholder="Ex. 5000"
                  {...register('minContributionAmount')}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  FCFA
                </span>
              </div>
              {errors.minContributionAmount && (
                <p className="text-sm text-red-500">{errors.minContributionAmount.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Montant minimum suggéré par membre
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statut */}
      <Card>
        <CardHeader>
          <CardTitle>Statut de l'évènement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Statut *</Label>
            <select
              id="status"
              {...register('status')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#234D65]"
            >
              <option value="draft">Brouillon</option>
              <option value="upcoming">À venir</option>
              <option value="ongoing">En cours</option>
              <option value="closed">Terminé</option>
              <option value="archived">Archivé</option>
            </select>
            {errors.status && (
              <p className="text-sm text-red-500">{errors.status.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Image de couverture */}
      <Card>
        <CardHeader>
          <CardTitle>Image de couverture (optionnelle)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!coverPreview ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <Label 
                    htmlFor="coverPhoto" 
                    className="cursor-pointer text-[#234D65] hover:text-[#2c5a73] font-medium"
                  >
                    Cliquez pour télécharger une image
                  </Label>
                  <Input
                    id="coverPhoto"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleCoverFileChange}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    JPG, PNG ou WEBP • Max 5MB • 1200x600px recommandé
                  </p>
                </div>
                <Upload className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={coverPreview}
                  alt="Aperçu de la couverture"
                  fill
                  className="object-cover"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={removeCoverPhoto}
              >
                <X className="w-4 h-4 mr-1" />
                Supprimer
              </Button>
              <p className="text-sm text-gray-600 mt-2">
                {coverFile?.name || 'Image actuelle'} {coverFile && `• ${(coverFile.size / 1024 / 1024).toFixed(2)} MB`}
              </p>
            </div>
          )}
          {errors.coverPhotoFile && (
            <p className="text-sm text-red-500">{errors.coverPhotoFile.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Annuler
        </Button>
        <Button 
          type="submit" 
          disabled={isPending}
          className="bg-[#234D65] hover:bg-[#2c5a73]"
        >
          {isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Modification en cours...
            </>
          ) : (
            'Enregistrer les modifications'
          )}
        </Button>
      </div>
    </form>
  )
}

