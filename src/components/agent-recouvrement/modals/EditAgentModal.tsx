'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { agentRecouvrementFormSchema, pieceIdentiteTypeEnum } from '@/schemas/agent-recouvrement.schema'
import type { AgentRecouvrementFormValues } from '@/schemas/agent-recouvrement.schema'
import type { AgentRecouvrement } from '@/types/types'
import { useAuth } from '@/hooks/useAuth'
import type { UseMutationResult } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { AgentPhotoUpload } from '../AgentPhotoUpload'
import { uploadAgentPhoto, deleteFile } from '@/db/upload-image.db'
import { ImageCompressionService } from '@/services/imageCompressionService'

// Helper pour convertir une valeur (Date, Timestamp, string) en string YYYY-MM-DD pour input date
function toDateInputValue(value: unknown): string {
  if (!value) return ''
  try {
    // Gérer Timestamp Firestore
    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate().toISOString().slice(0, 10)
    }
    // Gérer Date ou string
    const date = new Date(value as Date | string | number)
    if (isNaN(date.getTime())) return ''
    return date.toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

// Helper pour convertir une valeur en Date pour le formulaire
function toFormDate(value: unknown): Date | undefined {
  if (!value) return undefined
  try {
    // Gérer Timestamp Firestore
    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate()
    }
    const date = new Date(value as Date | string | number)
    if (isNaN(date.getTime())) return undefined
    return date
  } catch {
    return undefined
  }
}

interface EditAgentModalProps {
  agent: AgentRecouvrement
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  mutation: UseMutationResult<boolean, Error, { id: string; updates: Partial<Omit<AgentRecouvrement, 'id' | 'createdAt' | 'createdBy'>>; updatedBy: string }>
}

export function EditAgentModal({ agent, open, onOpenChange, onSuccess, mutation }: EditAgentModalProps) {
  const { user } = useAuth()
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)

  const form = useForm<AgentRecouvrementFormValues>({
    resolver: zodResolver(agentRecouvrementFormSchema),
    defaultValues: {
      nom: agent.nom,
      prenom: agent.prenom,
      sexe: agent.sexe,
      pieceIdentite: {
        type: agent.pieceIdentite?.type || 'CNI',
        numero: agent.pieceIdentite?.numero || '',
        dateDelivrance: toFormDate(agent.pieceIdentite?.dateDelivrance) as Date,
        dateExpiration: toFormDate(agent.pieceIdentite?.dateExpiration) as Date,
      },
      dateNaissance: toFormDate(agent.dateNaissance) as Date,
      lieuNaissance: agent.lieuNaissance || '',
      tel1: agent.tel1 || '',
      tel2: agent.tel2 || '',
    },
  })

  useEffect(() => {
    if (open && agent) {
      form.reset({
        nom: agent.nom,
        prenom: agent.prenom,
        sexe: agent.sexe,
        pieceIdentite: {
          type: agent.pieceIdentite?.type || 'CNI',
          numero: agent.pieceIdentite?.numero || '',
          dateDelivrance: toFormDate(agent.pieceIdentite?.dateDelivrance) as Date,
          dateExpiration: toFormDate(agent.pieceIdentite?.dateExpiration) as Date,
        },
        dateNaissance: toFormDate(agent.dateNaissance) as Date,
        lieuNaissance: agent.lieuNaissance || '',
        tel1: agent.tel1 || '',
        tel2: agent.tel2 || '',
      })
      setPhotoFile(null)
      setPhotoRemoved(false)
    }
  }, [open, agent])

  const onSubmit = async (values: AgentRecouvrementFormValues) => {
    if (!user?.uid) return
    const updates: Parameters<typeof mutation.mutateAsync>[0]['updates'] = {
      nom: values.nom,
      prenom: values.prenom,
      sexe: values.sexe,
      pieceIdentite: {
        type: values.pieceIdentite.type,
        numero: values.pieceIdentite.numero,
        dateDelivrance: values.pieceIdentite.dateDelivrance,
        dateExpiration: values.pieceIdentite.dateExpiration,
      },
      dateNaissance: values.dateNaissance,
      lieuNaissance: values.lieuNaissance,
      tel1: values.tel1,
      tel2: values.tel2 || undefined,
    }
    if (photoRemoved) {
      updates.photoUrl = null
      updates.photoPath = null
      if (agent.photoPath) {
        try {
          await deleteFile(agent.photoPath)
        } catch {
          // Ignore delete errors
        }
      }
    } else if (photoFile) {
      if (agent.photoPath) {
        try {
          await deleteFile(agent.photoPath)
        } catch {
          // Ignore
        }
      }
      const compressed = await ImageCompressionService.compressImage(photoFile, 1, 800)
      const { url, path } = await uploadAgentPhoto(compressed, agent.id)
      updates.photoUrl = url
      updates.photoPath = path
    }
    await mutation.mutateAsync({
      id: agent.id,
      updatedBy: user.uid,
      updates,
    })
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier l'agent</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <FormLabel className="mb-2 block">Photo (optionnel)</FormLabel>
              <AgentPhotoUpload
                value={photoFile}
                previewUrl={photoRemoved ? null : agent.photoUrl ?? undefined}
                onChange={(f) => {
                  setPhotoFile(f)
                  if (f) setPhotoRemoved(false)
                }}
                onRemove={() => setPhotoRemoved(true)}
                disabled={mutation.isPending}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prenom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="sexe"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sexe *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="M">Homme</SelectItem>
                      <SelectItem value="F">Femme</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <FormLabel>Pièce d'identité *</FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pieceIdentite.type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pieceIdentiteTypeEnum.options.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pieceIdentite.numero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numéro *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pieceIdentite.dateDelivrance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date délivrance *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={toDateInputValue(field.value)}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pieceIdentite.dateExpiration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date expiration *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={toDateInputValue(field.value)}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dateNaissance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date naissance *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={toDateInputValue(field.value)}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lieuNaissance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lieu naissance *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tel1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tel2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone 2 (opt.)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={mutation.isPending} className="bg-[#234D65] hover:bg-[#2c5a73]">
                {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
