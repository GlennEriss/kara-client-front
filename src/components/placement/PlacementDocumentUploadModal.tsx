'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, FileText, X, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import type { PlacementDocumentType } from '@/types/types'

// Schéma de validation
const uploadSchema = z.object({
  file: z
    .custom<FileList>()
    .refine((files) => files?.length === 1, "Veuillez sélectionner un fichier")
    .refine(
      (files) => files?.[0]?.type === 'application/pdf',
      "Le fichier doit être un PDF"
    )
    .refine(
      (files) => files?.[0]?.size <= 10 * 1024 * 1024, // 10MB
      "Le fichier ne doit pas dépasser 10MB"
    ),
})

type UploadFormData = z.infer<typeof uploadSchema>

// Types de documents spécifiques aux placements
type PlacementSpecificDocumentType =
  | 'PLACEMENT_CONTRACT'
  | 'PLACEMENT_COMMISSION_PROOF'
  | 'PLACEMENT_EARLY_EXIT_QUITTANCE'
  | 'PLACEMENT_FINAL_QUITTANCE'
  | 'PLACEMENT_EARLY_EXIT_ADDENDUM'

interface PlacementDocumentUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploaded: (documentId: string) => void
  onSuccess?: (documentId: string) => void
  placementId: string
  benefactorId: string
  documentType: PlacementDocumentType
  title: string
  description?: string
  existingDocumentId?: string
}

const DOCUMENT_TYPE_LABELS: Record<PlacementSpecificDocumentType, string> = {
  PLACEMENT_CONTRACT: 'Contrat de placement',
  PLACEMENT_COMMISSION_PROOF: 'Preuve de commission',
  PLACEMENT_EARLY_EXIT_QUITTANCE: 'Quittance de retrait anticipé',
  PLACEMENT_FINAL_QUITTANCE: 'Quittance finale',
  PLACEMENT_EARLY_EXIT_ADDENDUM: 'Avenant de retrait anticipé',
}

export default function PlacementDocumentUploadModal({
  isOpen,
  onClose,
  onUploaded,
  onSuccess,
  placementId,
  benefactorId,
  documentType,
  title,
  description,
  existingDocumentId,
}: PlacementDocumentUploadModalProps) {
  const { user } = useAuth()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  
  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
  })

  // Fonction de compression simple du PDF (vérification de la taille)
  const compressPDF = async (file: File): Promise<File> => {
    // Si le fichier fait moins de 5MB, pas besoin de vérification supplémentaire
    if (file.size < 5 * 1024 * 1024) {
      return file
    }

    setIsCompressing(true)
    
    try {
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Le fichier est trop volumineux. Veuillez compresser le PDF avant de le téléverser.')
      }
      
      return file
    } finally {
      setIsCompressing(false)
    }
  }

  const onSubmit = async (data: UploadFormData) => {
    if (!data.file?.[0] || !user?.uid) return

    try {
      const file = data.file[0]
      
      // Compression du fichier si nécessaire
      const compressedFile = await compressPDF(file)
      
      // Upload via le service
      const { ServiceFactory } = await import('@/factories/ServiceFactory')
      const service = ServiceFactory.getPlacementService()

      let result
      if (documentType === 'PLACEMENT_CONTRACT') {
        result = await service.uploadPlacementDocument(compressedFile, placementId, benefactorId, documentType, user.uid)
      } else if (documentType === 'PLACEMENT_COMMISSION_PROOF') {
        throw new Error('Utilisez uploadCommissionProof pour les preuves de commission')
      } else if (documentType === 'PLACEMENT_EARLY_EXIT_QUITTANCE') {
        result = await service.uploadEarlyExitQuittance(compressedFile, placementId, benefactorId, user.uid)
      } else if (documentType === 'PLACEMENT_FINAL_QUITTANCE') {
        result = await service.uploadFinalQuittance(compressedFile, placementId, benefactorId, user.uid)
      } else if (documentType === 'PLACEMENT_EARLY_EXIT_ADDENDUM') {
        result = await service.uploadEarlyExitAddendum(compressedFile, placementId, benefactorId, user.uid)
      } else {
        throw new Error('Type de document non supporté pour ce modal')
      }
      
      form.reset()
      setSelectedFile(null)
      onUploaded(result.documentId)
      if (onSuccess) onSuccess(result.documentId)
      onClose()
    } catch (error: any) {
      console.error('Erreur lors du téléversement:', error)
      toast.error(`Erreur lors du ${existingDocumentId ? 'remplacement' : 'téléversement'}: ${error.message}`)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
      form.setValue('file', files as any)
    }
  }

  const handleClose = () => {
    if (!form.formState.isSubmitting && !isCompressing) {
      form.reset()
      setSelectedFile(null)
      onClose()
    }
  }

  const isUploading = form.formState.isSubmitting || isCompressing

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-[#234D65]" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description || `Téléverser le ${DOCUMENT_TYPE_LABELS[documentType as PlacementSpecificDocumentType]?.toLowerCase() || 'document'} pour le placement #${placementId.slice(-6)}`}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {existingDocumentId && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  ⚠️ Un document existe déjà. Le téléversement le remplacera.
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#234D65]" />
                    Fichier PDF *
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {!selectedFile ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#234D65] transition-colors">
                          <Input
                            {...field}
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => {
                              handleFileChange(e)
                              onChange(e.target.files)
                            }}
                            disabled={isUploading}
                            className="hidden"
                            id="file-upload"
                          />
                          <Label
                            htmlFor="file-upload"
                            className="cursor-pointer flex flex-col items-center gap-2"
                          >
                            <Upload className="h-8 w-8 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              Cliquez pour sélectionner un fichier
                            </span>
                            <span className="text-xs text-gray-500">
                              PDF uniquement, maximum 10MB
                            </span>
                          </Label>
                        </div>
                      ) : (
                        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <FileText className="h-8 w-8 text-[#234D65]" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedFile(null)
                                form.setValue('file', undefined as any)
                              }}
                              disabled={isUploading}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {isCompressing && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Vérification du fichier...
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isUploading}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#1a3a4d] hover:to-[#234D65] text-white"
              >
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {existingDocumentId ? 'Remplacer' : 'Téléverser'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

