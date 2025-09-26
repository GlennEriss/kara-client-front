'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import FileInput from '@/components/ui/file-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { contractPdfUploadSchema, type ContractPdfUploadFormData } from '@/schemas/contract-pdf-upload.schema'
import { updateContractPdf } from '@/db/caisse/contracts.db'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react'

interface ContractPdfUploadModalProps {
  isOpen: boolean
  onClose: () => void
  contractId: string
  contractName?: string
  onSuccess?: () => void
}

const ContractPdfUploadModal: React.FC<ContractPdfUploadModalProps> = ({
  isOpen,
  onClose,
  contractId,
  contractName,
  onSuccess
}) => {
  const { user } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const form = useForm<ContractPdfUploadFormData>({
    resolver: zodResolver(contractPdfUploadSchema),
    defaultValues: {
      contractPdf: {
        file: undefined as any,
        originalFileName: '',
        fileSize: 0,
        path: '',
        url: ''
      }
    }
  })

  const handleFileChange = (file: File | undefined) => {
    if (file) {
      form.setValue('contractPdf.file', file)
      form.setValue('contractPdf.originalFileName', file.name)
      form.setValue('contractPdf.fileSize', file.size)
      // Simuler un chemin et une URL (dans un vrai projet, vous feriez l'upload vers Firebase Storage)
      form.setValue('contractPdf.path', `contracts/${contractId}/${file.name}`)
      form.setValue('contractPdf.url', URL.createObjectURL(file))
    }
  }

  const onSubmit = async (data: ContractPdfUploadFormData) => {
    if (!user?.uid) {
      toast.error('Utilisateur non authentifié')
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      // Ici, vous devriez faire l'upload vers Firebase Storage
      // Pour l'instant, on simule avec les données du fichier
      const contractPdfData = {
        fileSize: data.contractPdf.fileSize,
        path: data.contractPdf.path,
        originalFileName: data.contractPdf.originalFileName,
        uploadedAt: new Date(),
        url: data.contractPdf.url
      }

      await updateContractPdf(contractId, contractPdfData, user.uid)

      toast.success('Document PDF téléversé avec succès !')
      form.reset()
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('Erreur lors du téléversement:', error)
      setUploadError(error.message || 'Erreur lors du téléversement du document')
      toast.error('Erreur lors du téléversement du document')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      form.reset()
      setUploadError(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Téléverser le document PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {contractName && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Contrat:</strong> {contractName}
              </p>
            </div>
          )}

          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="contractPdf.file"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fichier PDF</FormLabel>
                    <FormControl>
                      <FileInput
                        accept=".pdf"
                        onFileSelect={handleFileChange}
                        disabled={isUploading}
                        className="w-full"
                        maxSize={10}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('contractPdf.file') && (
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="h-4 w-4" />
                    <span>{form.watch('contractPdf.originalFileName')}</span>
                    <span className="text-gray-400">
                      ({(form.watch('contractPdf.fileSize') / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
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
                  disabled={isUploading || !form.watch('contractPdf.file')}
                  className="bg-blue-600 hover:bg-blue-700"
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

export default ContractPdfUploadModal
