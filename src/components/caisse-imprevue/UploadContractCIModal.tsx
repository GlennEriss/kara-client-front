'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Upload, FileText, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { ContractCI } from '@/types/types'
import { toast } from 'sonner'

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
      (files) => files?.[0]?.size <= 5 * 1024 * 1024, // 5MB
      "Le fichier ne doit pas dépasser 5MB"
    ),
})

type UploadFormData = z.infer<typeof uploadSchema>

interface UploadContractCIModalProps {
  isOpen: boolean
  onClose: () => void
  contract: ContractCI | null
  onSuccess: () => void
}

export default function UploadContractCIModal({
  isOpen,
  onClose,
  contract,
  onSuccess
}: UploadContractCIModalProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
  })

  const onSubmit = async (data: UploadFormData) => {
    if (!contract || !data.file?.[0]) return

    setIsUploading(true)

    try {
      const file = data.file[0]
      
      // TODO: Implémenter l'upload vers Firebase Storage
      // Pour le moment, on simule un upload
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simuler la sauvegarde de l'ID du document dans Firestore
      console.log('Upload du fichier:', {
        contractId: contract.id,
        fileName: file.name,
        fileSize: file.size,
      })

      toast.success('Contrat téléversé avec succès')
      
      form.reset()
      setSelectedFile(null)
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erreur lors du téléversement:', error)
      toast.error('Erreur lors du téléversement du contrat')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      form.reset()
      setSelectedFile(null)
      onClose()
    }
  }

  if (!contract) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-[#234D65]" />
            Téléverser le contrat
          </DialogTitle>
          <DialogDescription>
            Téléverser le contrat signé pour le contrat #{contract.id.slice(-6)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informations du contrat */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Membre:</span>
              <span className="font-medium">{contract.memberFirstName} {contract.memberLastName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Forfait:</span>
              <span className="font-medium">{contract.subscriptionCILabel || contract.subscriptionCICode}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Statut actuel:</span>
              <span className="font-medium">
                {contract.contractStartId ? (
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Contrat téléversé
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-orange-600">
                    <XCircle className="h-3 w-3" />
                    Aucun contrat
                  </span>
                )}
              </span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="file"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>Fichier PDF du contrat *</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="relative overflow-hidden"
                            disabled={isUploading}
                            asChild
                          >
                            <label className="cursor-pointer">
                              <FileText className="h-4 w-4 mr-2" />
                              Choisir un fichier
                              <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept="application/pdf"
                                onChange={(e) => {
                                  onChange(e.target.files)
                                  handleFileChange(e)
                                }}
                                disabled={isUploading}
                                {...field}
                              />
                            </label>
                          </Button>
                          {selectedFile && (
                            <span className="text-sm text-gray-600 truncate">
                              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          Format accepté: PDF • Taille max: 5MB
                        </p>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isUploading}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading || !form.formState.isValid}
                  className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65]"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Téléversement...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Téléverser
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

