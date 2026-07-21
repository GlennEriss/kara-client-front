'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { storage } from '@/firebase/storage'
import { zodResolver } from '@hookform/resolvers/zod'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { ChevronLeft, ImageIcon, Loader2, Plus, Save, Trash2, Vote, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import {
  createEventSchema,
  type CreateEventFormValues,
} from '../schemas/event.schema'
import { useAllCharityEvents } from '@/hooks/bienfaiteur/useCharityEvents'
import { EVENT_TYPE_LABEL } from './event-meta'
import type { Event } from '../entities/event.types'

function genOptionId(): string {
  return 'opt_' + Math.random().toString(36).slice(2, 9)
}

function toLocalInputValue(d: Date | undefined): string {
  if (!d) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Radix n'accepte pas de valeur vide : sentinelle pour "aucune collecte". */
const NO_CHARITY = '__none__'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB

export interface EventFormProps {
  initialEvent?: Event
  submitLabel?: string
  description?: string
  lockPollToggle?: boolean
  onBack?: () => void
  onSubmit: (values: CreateEventFormValues) => void | Promise<void>
  isSubmitting?: boolean
}

export function EventForm({
  initialEvent,
  submitLabel = 'Enregistrer comme brouillon',
  description = "Renseignez les informations de l'événement. Vous pourrez publier ensuite depuis la page de détail.",
  lockPollToggle = false,
  onBack,
  onSubmit,
  isSubmitting,
}: EventFormProps) {
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialEvent?.imageURL ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const defaultValues: CreateEventFormValues = {
    title: initialEvent?.title ?? '',
    description: initialEvent?.description ?? '',
    imageURL: initialEvent?.imageURL ?? '',
    type: initialEvent?.type,
    charityEventId: initialEvent?.charityEventId ?? '',
    startDate: toLocalInputValue(initialEvent?.startDate),
    endDate: toLocalInputValue(initialEvent?.endDate),
    pollEnabled: initialEvent?.pollEnabled ?? false,
    proposedLocations:
      initialEvent?.proposedLocations && initialEvent.proposedLocations.length > 0
        ? initialEvent.proposedLocations
        : [
            { id: genOptionId(), name: '', address: '', description: '' },
            { id: genOptionId(), name: '', address: '', description: '' },
          ],
    pollClosesAt: toLocalInputValue(initialEvent?.pollClosesAt),
    finalLocation: initialEvent?.finalLocation ?? { name: '', address: '', description: '' },
  }

  const form = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventSchema),
    defaultValues,
    mode: 'onBlur',
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    control,
  } = form

  const pollEnabled = watch('pollEnabled')
  const imageURL = watch('imageURL')

  const { data: charityEvents = [], isLoading: charityEventsLoading } =
    useAllCharityEvents()

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'proposedLocations',
  })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError('Format non supporté. Utilisez JPG, PNG, WebP ou GIF.')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setUploadError('L\'image ne peut pas dépasser 5 Mo.')
      return
    }

    // Aperçu local immédiat
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)

    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
    const storageRef = ref(storage, `events/images/${fileName}`)
    const uploadTask = uploadBytesResumable(storageRef, file)

    setUploadProgress(0)

    uploadTask.on(
      'state_changed',
      (snap) => {
        setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100))
      },
      (err) => {
        console.error('[EventForm] Erreur upload image:', err)
        setUploadError('Échec du téléversement. Réessayez.')
        setUploadProgress(null)
        setPreviewUrl(null)
        setValue('imageURL', '', { shouldValidate: true })
        if (fileInputRef.current) fileInputRef.current.value = ''
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
        setValue('imageURL', downloadURL, { shouldValidate: true })
        setUploadProgress(null)
      },
    )
  }

  function handleRemoveImage() {
    setPreviewUrl(null)
    setUploadProgress(null)
    setUploadError(null)
    setValue('imageURL', '', { shouldValidate: true })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const submit = handleSubmit(
    async (values) => {
      const cleaned: CreateEventFormValues = {
        ...values,
        proposedLocations: values.pollEnabled ? values.proposedLocations : undefined,
        pollClosesAt: values.pollEnabled ? values.pollClosesAt : '',
        finalLocation: values.pollEnabled ? undefined : values.finalLocation,
      }
      try {
        await onSubmit(cleaned)
      } catch (err) {
        // react-hook-form v7 avale silencieusement les erreurs dans handleSubmit
        console.error('[EventForm] onSubmit error:', err)
      }
    },
    (validationErrors) => {
      // Évite les blocages silencieux quand Zod rejette
      console.error('[EventForm] validation échouée:', validationErrors)
    },
  )

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-2">
        {onBack && (
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="h-4 w-4" />
            Retour
          </Button>
        )}
        <p className="text-sm text-gray-500">{description}</p>
      </div>

      {/* Section 1 — Infos générales */}
      <Card>
        <CardContent className="p-5 md:p-6 space-y-5">
          <h2 className="text-lg font-semibold text-[#234D65]">Informations générales</h2>

          <div>
            <Label htmlFor="event-title">Titre de l&apos;événement *</Label>
            <Input
              id="event-title"
              {...register('title')}
              placeholder="Ex : Journée portes ouvertes 2026"
              className="mt-1.5"
            />
            {errors.title && (
              <p className="text-xs text-red-600 mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="event-description">Description *</Label>
            <Textarea
              id="event-description"
              rows={4}
              {...register('description')}
              placeholder="Décrivez l'événement, le programme, à qui il s'adresse…"
              className="mt-1.5"
            />
            {errors.description && (
              <p className="text-xs text-red-600 mt-1">{errors.description.message}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="event-type">Type</Label>
              <Select
                value={watch('type') ?? ''}
                onValueChange={(v) => setValue('type', v as never, { shouldValidate: true })}
              >
                <SelectTrigger id="event-type" className="mt-1.5">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPE_LABEL).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Collecte associée : l'argent reste géré par le module bienfaiteur */}
            <div>
              <Label htmlFor="event-charity">Collecte associée</Label>
              <Select
                value={watch('charityEventId') || NO_CHARITY}
                onValueChange={(v) =>
                  setValue('charityEventId', v === NO_CHARITY ? '' : v, {
                    shouldValidate: true,
                  })
                }
                disabled={charityEventsLoading}
              >
                <SelectTrigger id="event-charity" className="mt-1.5">
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CHARITY}>Aucune</SelectItem>
                  {charityEvents.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-xs text-gray-500">
                Les contributions financières restent gérées dans Bienfaiteur.
              </p>
            </div>

            {/* Image upload */}
            <div>
              <Label>Image / affiche</Label>
              <input {...register('imageURL')} type="hidden" />

              {previewUrl ? (
                <div className="mt-1.5 relative w-full h-36 rounded-lg overflow-hidden border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Aperçu"
                    className="w-full h-full object-cover"
                  />
                  {uploadProgress !== null && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                      <span className="text-white text-sm font-medium">{uploadProgress}%</span>
                    </div>
                  )}
                  {uploadProgress === null && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadProgress !== null}
                  className="mt-1.5 w-full h-36 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-[#234D65] hover:text-[#234D65] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-sm">Cliquer pour choisir une image</span>
                  <span className="text-xs">JPG, PNG, WebP, GIF · max 5 Mo</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                className="hidden"
                onChange={handleFileChange}
              />

              {uploadError && (
                <p className="text-xs text-red-600 mt-1">{uploadError}</p>
              )}
              {errors.imageURL && !uploadError && (
                <p className="text-xs text-red-600 mt-1">{errors.imageURL.message}</p>
              )}
              {imageURL && uploadProgress === null && (
                <p className="text-xs text-gray-400 mt-1 truncate">{imageURL}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="event-start">Date et heure de début *</Label>
              <Input
                id="event-start"
                type="datetime-local"
                {...register('startDate')}
                className="mt-1.5"
              />
              {errors.startDate && (
                <p className="text-xs text-red-600 mt-1">{errors.startDate.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="event-end">Date et heure de fin</Label>
              <Input
                id="event-end"
                type="datetime-local"
                {...register('endDate')}
                className="mt-1.5"
              />
              {errors.endDate && (
                <p className="text-xs text-red-600 mt-1">{errors.endDate.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2 — Lieu */}
      <Card>
        <CardContent className="p-5 md:p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#234D65]">Lieu</h2>
              <p className="text-sm text-gray-500 mt-1">
                {pollEnabled
                  ? 'Les membres avec un abonnement actif voteront parmi les options ci-dessous.'
                  : 'Le lieu sera fixé directement, sans sondage.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Vote className={`h-4 w-4 ${pollEnabled ? 'text-amber-600' : 'text-gray-400'}`} />
              <Label htmlFor="poll-enabled" className="text-sm font-medium">
                Sondage
              </Label>
              <Switch
                id="poll-enabled"
                checked={pollEnabled}
                onCheckedChange={(v) => setValue('pollEnabled', v, { shouldValidate: true })}
                disabled={lockPollToggle}
              />
            </div>
          </div>

          {!pollEnabled && (
            <div className="space-y-4 border border-dashed border-gray-200 rounded-lg p-4 bg-gray-50/50">
              <div>
                <Label htmlFor="final-name">Nom du lieu *</Label>
                <Input
                  id="final-name"
                  {...register('finalLocation.name')}
                  placeholder="Ex : Salle paroissiale Saint-Pierre"
                  className="mt-1.5 bg-white"
                />
                {errors.finalLocation?.name && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.finalLocation.name.message as string}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="final-address">Adresse</Label>
                <Input
                  id="final-address"
                  {...register('finalLocation.address')}
                  placeholder="Adresse postale ou indication de trajet"
                  className="mt-1.5 bg-white"
                />
              </div>
              <div>
                <Label htmlFor="final-desc">Informations complémentaires</Label>
                <Textarea
                  id="final-desc"
                  rows={2}
                  {...register('finalLocation.description')}
                  placeholder="Capacité, accès, parking…"
                  className="mt-1.5 bg-white"
                />
              </div>
            </div>
          )}

          {pollEnabled && (
            <div className="space-y-5">
              <div>
                <Label htmlFor="poll-closes">Date et heure de clôture du sondage *</Label>
                <Input
                  id="poll-closes"
                  type="datetime-local"
                  {...register('pollClosesAt')}
                  className="mt-1.5 max-w-md"
                />
                {errors.pollClosesAt && (
                  <p className="text-xs text-red-600 mt-1">{errors.pollClosesAt.message as string}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Doit être antérieure à la date de début de l&apos;événement.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Options de lieu (2 minimum, 8 maximum)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({ id: genOptionId(), name: '', address: '', description: '' })
                    }
                    disabled={fields.length >= 8}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>

                {fields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#234D65] uppercase">
                        Option {idx + 1}
                      </span>
                      {fields.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(idx)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`opt-name-${idx}`}>Nom du lieu *</Label>
                      <Input
                        id={`opt-name-${idx}`}
                        {...register(`proposedLocations.${idx}.name` as const)}
                        placeholder="Ex : Orphelinat Saint-Joseph"
                        className="mt-1.5 bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`opt-address-${idx}`}>Adresse</Label>
                      <Input
                        id={`opt-address-${idx}`}
                        {...register(`proposedLocations.${idx}.address` as const)}
                        placeholder="Adresse ou indication"
                        className="mt-1.5 bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`opt-desc-${idx}`}>Description</Label>
                      <Input
                        id={`opt-desc-${idx}`}
                        {...register(`proposedLocations.${idx}.description` as const)}
                        placeholder="Détails pour aider à choisir"
                        className="mt-1.5 bg-white"
                      />
                    </div>
                  </div>
                ))}

                {errors.proposedLocations && (
                  <p className="text-xs text-red-600">
                    {(errors.proposedLocations as { message?: string }).message ??
                      'Vérifiez les options de lieu'}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-2">
        {onBack && (
          <Button type="button" variant="outline" onClick={onBack}>
            Annuler
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || uploadProgress !== null}
          className="bg-[#234D65] hover:bg-[#1A3D4F]"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
