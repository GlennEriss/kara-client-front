'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useCreateCharityEvent } from '@/hooks/bienfaiteur/useCharityEvents'
import { useRouter } from 'next/navigation'
import routes from '@/constantes/routes'
import { toast } from 'sonner'
import { CharityEvent } from '@/types/types'
import { Calendar, Upload, X, Image as ImageIcon } from 'lucide-react'
import { charityEventSchema, CharityEventFormData } from '@/schemas/bienfaiteur.schema'
import Image from 'next/image'
import { uploadCharityEventCover } from '@/services/bienfaiteur/CharityMediaService'

export default function CreateCharityEventForm() {
  const router = useRouter()
  const { mutate: createEvent, isPending } = useCreateCharityEvent()
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<CharityEventFormData>({
    resolver: zodResolver(charityEventSchema) as any,
    defaultValues: {
      title: '',
      location: '',
      startDate: '',
      endDate: '',
      description: '',
      targetAmount: '',
      minContributionAmount: '',
      status: 'draft' as const,
      isPublic: true,
    }
  })

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validation
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
      
      // Créer un aperçu
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
      let coverPhotoUrl: string | null = null
      let coverPhotoPath: string | null = null

      // Upload de l'image de couverture si elle existe
      if (coverFile) {
        try {
          toast.info('Upload de l\'image en cours...')
          const uploadResult = await uploadCharityEventCover(coverFile)
          coverPhotoUrl = uploadResult.url
          coverPhotoPath = uploadResult.path
          toast.success('Image uploadée avec succès!')
        } catch (uploadError: any) {
          toast.error(`Erreur lors de l'upload de l'image: ${uploadError.message}`)
          return // Arrêter si l'upload échoue
        }
      }

      const eventData: Omit<CharityEvent, 'id'> = {
        title: data.title,
        location: data.location,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        description: data.description,
        targetAmount: data.targetAmount ? parseFloat(data.targetAmount) : undefined,
        minContributionAmount: data.minContributionAmount ? parseFloat(data.minContributionAmount) : undefined,
        currency: 'FCFA',
        status: data.status || 'draft',
        isPublic: data.isPublic ?? true,
        coverPhotoUrl,
        coverPhotoPath,
        totalCollectedAmount: 0,
        totalContributionsCount: 0,
        totalParticipantsCount: 0,
        totalGroupsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: '' // sera rempli par le hook
      }

      createEvent(eventData, {
        onSuccess: (eventId) => {
          toast.success('Évènement créé avec succès!')
          router.push(routes.admin.bienfaiteurDetails(eventId))
        },
        onError: (error) => {
          toast.error('Erreur lors de la création de l\'évènement')
          console.error(error)
        }
      })
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
                {coverFile?.name} • {(coverFile?.size || 0 / 1024 / 1024).toFixed(2)} MB
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
              Création en cours...
            </>
          ) : (
            'Créer l\'évènement'
          )}
        </Button>
      </div>
    </form>
  )
}
