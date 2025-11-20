'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Image as ImageIcon, Video, Trash2, Eye, Calendar } from 'lucide-react'
import { useCharityMedia, useCreateCharityMedia, useDeleteCharityMedia } from '@/hooks/bienfaiteur/useCharityMedia'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { charityMediaSchema, CharityMediaFormData } from '@/schemas/bienfaiteur.schema'
import Image from 'next/image'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface CharityMediaSectionProps {
  eventId: string
}

export default function CharityMediaSection({ eventId }: CharityMediaSectionProps) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'photo' | 'video'>('all')
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const { data: media, isLoading } = useCharityMedia(eventId)
  const { mutate: createMedia, isPending: isCreating } = useCreateCharityMedia()
  const { mutate: deleteMedia, isPending: isDeleting } = useDeleteCharityMedia()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<CharityMediaFormData>({
    resolver: zodResolver(charityMediaSchema),
    defaultValues: {
      type: 'photo',
      title: '',
      description: '',
      takenAt: ''
    }
  })

  const mediaType = watch('type')
  const fileValue = watch('file')

  // Filtrage
  const filtered = media?.filter(item => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        item.title?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      )
    }
    return true
  }) || []

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setValue('file', file)
      
      // Prévisualisation pour les images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setPreviewUrl(null)
      }
    }
  }

  const onSubmit = async (data: CharityMediaFormData) => {
    if (!data.file) {
      toast.error('Veuillez sélectionner un fichier')
      return
    }

    createMedia(
      {
        eventId,
        file: data.file,
        type: data.type,
        title: data.title || undefined,
        description: data.description || undefined,
        takenAt: data.takenAt ? new Date(data.takenAt) : undefined
      },
      {
        onSuccess: () => {
          toast.success('Média ajouté avec succès!')
          handleClose()
        },
        onError: (error: any) => {
          toast.error(error.message || 'Erreur lors de l\'ajout du média')
        }
      }
    )
  }

  const handleClose = () => {
    reset()
    setPreviewUrl(null)
    setIsAddOpen(false)
  }

  const handleDelete = (mediaId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce média ?')) return

    deleteMedia(
      { eventId, mediaId },
      {
        onSuccess: () => {
          toast.success('Média supprimé avec succès')
        },
        onError: (error: any) => {
          toast.error(error.message || 'Erreur lors de la suppression')
        }
      }
    )
  }

  const handleView = (url: string) => {
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Filtres et actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un média..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={typeFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setTypeFilter('all')}
              >
                Tous
              </Button>
              <Button
                variant={typeFilter === 'photo' ? 'default' : 'outline'}
                onClick={() => setTypeFilter('photo')}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Photos
              </Button>
              <Button
                variant={typeFilter === 'video' ? 'default' : 'outline'}
                onClick={() => setTypeFilter('video')}
              >
                <Video className="w-4 h-4 mr-2" />
                Vidéos
              </Button>

              <Button onClick={() => setIsAddOpen(true)} className="bg-[#234D65] hover:bg-[#2c5a73]">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grille des médias */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative aspect-video bg-gray-100">
                {item.type === 'photo' ? (
                  <Image
                    src={item.thumbnailUrl || item.url}
                    alt={item.title || 'Photo'}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <Video className="w-16 h-16 text-white" />
                  </div>
                )}
                
                {/* Overlay avec actions */}
                <div className="absolute inset-0 bg-black/0 hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleView(item.url)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Voir
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                </div>

                {/* Badge type */}
                <div className="absolute top-2 right-2">
                  <Badge variant={item.type === 'photo' ? 'default' : 'secondary'}>
                    {item.type === 'photo' ? (
                      <ImageIcon className="w-3 h-3 mr-1" />
                    ) : (
                      <Video className="w-3 h-3 mr-1" />
                    )}
                    {item.type === 'photo' ? 'Photo' : 'Vidéo'}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4">
                {item.title && (
                  <h3 className="font-medium mb-1">{item.title}</h3>
                )}
                {item.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{item.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {(() => {
                      const safeDate = item.createdAt instanceof Date 
                        ? item.createdAt 
                        : new Date(item.createdAt)
                      return !isNaN(safeDate.getTime()) 
                        ? format(safeDate, 'dd MMM yyyy', { locale: fr })
                        : 'Date invalide'
                    })()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="mb-4">Aucun média pour le moment</p>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter le premier média
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal d'ajout */}
      <Dialog open={isAddOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajouter un média</DialogTitle>
            <DialogDescription>
              Téléchargez une photo ou une vidéo pour cet évènement
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Type de média */}
            <div className="space-y-2">
              <Label>Type de média *</Label>
              <RadioGroup
                value={mediaType}
                onValueChange={(value) => setValue('type', value as 'photo' | 'video')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="photo" id="media-photo" />
                  <Label htmlFor="media-photo" className="cursor-pointer flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Photo
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="video" id="media-video" />
                  <Label htmlFor="media-video" className="cursor-pointer flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Vidéo
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Fichier */}
            <div className="space-y-2">
              <Label htmlFor="file">Fichier *</Label>
              {!fileValue ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <Label htmlFor="file" className="cursor-pointer">
                    <div className="text-sm text-gray-600 font-medium mb-2">
                      Cliquez pour télécharger un fichier
                    </div>
                    <div className="text-xs text-gray-500">
                      {mediaType === 'photo' 
                        ? 'Formats: JPG, PNG, WEBP • Max 50MB'
                        : 'Formats: MP4, WEBM, MOV • Max 50MB'}
                    </div>
                  </Label>
                  <Input
                    id="file"
                    type="file"
                    accept={mediaType === 'photo' 
                      ? 'image/jpeg,image/jpg,image/png,image/webp'
                      : 'video/mp4,video/webm,video/quicktime'}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  {previewUrl ? (
                    <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={previewUrl}
                        alt="Aperçu"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-100 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Video className="w-12 h-12 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{fileValue.name}</p>
                          <p className="text-xs text-gray-500">
                            {((fileValue.size || 0) / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setValue('file', undefined as any)
                      setPreviewUrl(null)
                    }}
                  >
                    Changer de fichier
                  </Button>
                </div>
              )}
              {errors.file && (
                <p className="text-sm text-red-500">{errors.file.message}</p>
              )}
            </div>

            {/* Titre */}
            <div className="space-y-2">
              <Label htmlFor="title">Titre (optionnel)</Label>
              <Input
                id="title"
                placeholder="Ex: Cérémonie d'ouverture"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optionnel)</Label>
              <Textarea
                id="description"
                placeholder="Décrivez ce média..."
                rows={3}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            {/* Date de prise */}
            <div className="space-y-2">
              <Label htmlFor="takenAt">Date de prise (optionnel)</Label>
              <Input
                id="takenAt"
                type="date"
                {...register('takenAt')}
              />
              {errors.takenAt && (
                <p className="text-sm text-red-500">{errors.takenAt.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isCreating}>
                Annuler
              </Button>
              <Button type="submit" disabled={isCreating || !fileValue} className="bg-[#234D65] hover:bg-[#2c5a73]">
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Upload en cours...
                  </>
                ) : (
                  'Ajouter le média'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

