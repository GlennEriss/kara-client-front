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
import { createFile } from '@/db/upload-image.db'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react'
import { DocumentRepository } from '@/domains/infrastructure/documents/repositories/DocumentRepository'
import { CaisseContract } from '@/types/types'
import { DocumentType } from '@/domains/infrastructure/documents/entities/document.types'

interface ContractPdfUploadModalProps {
  isOpen: boolean
  onClose: () => void
  contractId: string
  contractName?: string
  onSuccess?: () => void
  contract?: CaisseContract
}

const ContractPdfUploadModal: React.FC<ContractPdfUploadModalProps> = ({
  isOpen,
  onClose,
  contractId,
  contractName,
  onSuccess,
  contract
}) => {
  const { user } = useAuth()
  const [uploadError, setUploadError] = useState<string | null>(null)

  const form = useForm<ContractPdfUploadFormData>({
    resolver: zodResolver(contractPdfUploadSchema),
    defaultValues: {
      contractPdf: {
        file: undefined as any,
        originalFileName: '',
        fileSize: 0,
        path: undefined,
        url: undefined
      }
    }
  })

  const truncateFileName = (fileName: string, maxLength: number = 30) => {
    if (fileName.length <= maxLength) return fileName
    
    const extension = fileName.split('.').pop()
    const nameWithoutExt = fileName.slice(0, fileName.lastIndexOf('.'))
    const truncatedName = nameWithoutExt.slice(0, maxLength - extension!.length - 4) + '...'
    
    return `${truncatedName}.${extension}`
  }

  const handleFileChange = (file: File | undefined) => {
    if (file) {
      form.setValue('contractPdf.file', file)
      form.setValue('contractPdf.originalFileName', file.name)
      form.setValue('contractPdf.fileSize', file.size)
      // Le chemin et l'URL seront définis après l'upload
      form.setValue('contractPdf.path', undefined)
      form.setValue('contractPdf.url', undefined)
    }
  }

  const onSubmit = async (data: ContractPdfUploadFormData) => {
    console.log('🚀 onSubmit appelé avec:', data)
    
    if (!user?.uid) {
      toast.error('Utilisateur non authentifié')
      return
    }

    const memberIdForDocument = contract?.memberId || (contract?.groupeId ? `GROUP_${contract.groupeId}` : '')
    if (!memberIdForDocument) {
      toast.error('Impossible de déterminer le membre associé au contrat')
      return
    }

    setUploadError(null)

    try {
      console.log('📁 Début de l\'upload vers Firebase Storage...')
      // Upload du fichier vers Firebase Storage
      const uploadResult = await createFile(data.contractPdf.file, contractId, `contracts/${contractId}`)
      console.log('✅ Upload réussi:', uploadResult)
      
      const contractPdfData = {
        fileSize: data.contractPdf.fileSize,
        path: uploadResult.path,
        originalFileName: data.contractPdf.originalFileName,
        uploadedAt: new Date(),
        url: uploadResult.url
      }

      console.log('📄 Mise à jour du contrat avec:', contractPdfData)
      await updateContractPdf(contractId, contractPdfData, user.uid)

      try {
        const documentRepository = new DocumentRepository()
        const documentLabel = contractName
          ? `Contrat Caisse Spéciale - ${contractName}`
          : `Contrat Caisse Spéciale #${contractId.slice(-6)}`

        await documentRepository.createDocument({
          type: 'ADHESION_CS' as DocumentType,
          format: 'pdf',
          libelle: documentLabel,
          path: uploadResult.path,
          url: uploadResult.url,
          size: data.contractPdf.fileSize,
          memberId: memberIdForDocument,
          contractId,
          createdBy: user.uid,
          updatedBy: user.uid
        })
      } catch (docError: any) {
        console.error('❌ Erreur lors de la sauvegarde du document dans Firestore:', docError)
        throw new Error(docError?.message || 'Erreur lors de l\'enregistrement du document dans la collection documents')
      }

      toast.success('Document PDF téléversé avec succès !')
      form.reset()
      onSuccess?.()
      onClose()
    } catch (error: any) {
      console.error('❌ Erreur lors du téléversement:', error)
      setUploadError(error.message || 'Erreur lors du téléversement du document')
      toast.error('Erreur lors du téléversement du document')
    }
  }

  const handleClose = () => {
    if (!form.formState.isSubmitting) {
      form.reset()
      setUploadError(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-w-[90vw] w-full">
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
                <strong>Contrat:</strong> <span className="truncate block" title={contractName}>{contractName}</span>
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
                render={({ field, formState: { isSubmitting } }) => (
                  <FormItem>
                    <FormLabel>Fichier PDF</FormLabel>
                    <FormControl>
                      <FileInput
                        accept=".pdf"
                        onFileSelect={handleFileChange}
                        disabled={isSubmitting}
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
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate" title={form.watch('contractPdf.originalFileName')}>
                        {truncateFileName(form.watch('contractPdf.originalFileName'))}
                      </div>
                      <div className="text-gray-400 text-xs">
                        {(form.watch('contractPdf.fileSize') / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={form.formState.isSubmitting}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting || !form.watch('contractPdf.file')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {form.formState.isSubmitting ? (
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
