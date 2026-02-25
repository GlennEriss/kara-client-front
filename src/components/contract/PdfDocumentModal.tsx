"use client"

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { updateRefund } from '@/db/caisse/refunds.db'
import { deleteContractDocument, uploadContractDocument } from '@/db/upload-file.db'
import type { DocumentType } from '@/domains/infrastructure/documents/entities/document.types'
import { DocumentRepository } from '@/domains/infrastructure/documents/repositories/DocumentRepository'
import { useAuth } from '@/hooks/useAuth'
import type { RefundDocument } from '@/types/types'
import { Eye, FileText, Trash2, Upload, X } from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

interface PdfDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  onDocumentUploaded: (document: RefundDocument) => void
  contractId: string
  refundId: string
  existingDocument?: RefundDocument
  title?: string
  description?: string
  documentType: DocumentType
  memberId: string
  documentLabel?: string
}

export default function PdfDocumentModal({
  isOpen,
  onClose,
  onDocumentUploaded,
  contractId,
  refundId,
  existingDocument,
  title = "Document PDF",
  description = "Téléchargez et téléversez le document PDF requis",
  documentType,
  memberId,
  documentLabel,
}: PdfDocumentModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { user } = useAuth()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Vérifier que c'est un fichier PDF
    if (file.type !== 'application/pdf') {
      toast.error('Veuillez sélectionner un fichier PDF valide')
      return
    }

    // Vérifier la taille du fichier (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier PDF ne doit pas dépasser 10MB')
      return
    }

    setSelectedFile(file)
    toast.success('Fichier PDF sélectionné')
  }

  const handleUpload = async () => {
    if (!selectedFile || !user) {
      toast.error('Veuillez sélectionner un fichier PDF')
      return
    }

    // Confirmation for replacement
    if (existingDocument) {
      const confirmed = window.confirm(
        `Êtes-vous sûr de vouloir remplacer le document "${existingDocument.originalFileName}" ?\n\nL'ancien document sera définitivement supprimé.`
      )
      if (!confirmed) return
    }

    try {
      setIsUploading(true)
      
      // Upload the file to Firebase Storage
      // If replacing an existing document, delete the old one first
      if (existingDocument) {
        try {
          await deleteContractDocument(existingDocument.path)
          console.log('✅ Old document deleted successfully')
        } catch {
          // Continue with upload even if deletion fails
        }
      }
      
      const uploadResult = await uploadContractDocument(
        selectedFile,
        contractId,
        refundId,
        'final_refund_document'
      )
      
      // Create document object
      const document: RefundDocument = {
        id: `${refundId}_doc_${Date.now()}`,
        url: uploadResult.url,
        path: uploadResult.path,
        uploadedAt: new Date(),
        uploadedBy: user.uid,
        originalFileName: selectedFile.name,
        fileSize: selectedFile.size,
        status: 'active'
      }
      
      // Update the refund with the document
      await updateRefund(contractId, refundId, {
        document: {
          id: `${refundId}_doc_${Date.now()}`,
          url: uploadResult.url,
          path: uploadResult.path,
          uploadedAt: new Date(),
          uploadedBy: user.uid,
          originalFileName: selectedFile.name,
          fileSize: selectedFile.size,
          status: 'active'
        },
        updatedBy: user?.uid,
        documentUpdatedAt: new Date()
      })
      
      // Store document in documents collection if possible
      try {
        if (memberId) {
          const repository = new DocumentRepository()
          await repository.createDocument({
            type: documentType,
            format: 'pdf',
            libelle: documentLabel || `${title} - Contrat ${contractId}`,
            path: uploadResult.path,
            url: uploadResult.url,
            size: selectedFile.size,
            memberId,
            contractId,
            createdBy: user.uid,
            updatedBy: user.uid
          })
        } else {
          toast.warning('Document téléversé mais non associé à un membre. Veuillez vérifier le contrat.')
        }
      } catch (docError: any) {
        console.error('Erreur lors de la sauvegarde du document dans la collection documents:', docError)
        toast.warning('Document téléversé mais non enregistré dans la bibliothèque. Réessayez plus tard.')
      }
      
      onDocumentUploaded(document)
      toast.success(existingDocument ? 'Document PDF remplacé avec succès' : 'Document PDF téléversé avec succès')
      onClose()
      
      // Reset
      setSelectedFile(null)
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(`Erreur lors du ${existingDocument ? 'remplacement' : 'téléversement'}: ${error.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  const _handleDownload = () => {
    // Simuler le téléchargement du document PDF
    toast.info('Téléchargement du document PDF...')
    // Ici vous pouvez ajouter la logique de téléchargement réelle
  }

  const handlePreview = () => {
    if (!selectedFile) return
    
    // Ouvrir le PDF dans un nouvel onglet pour prévisualisation
    const url = URL.createObjectURL(selectedFile)
    window.open(url, '_blank')
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    toast.info('Fichier supprimé')
  }

  const handleDeleteExistingDocument = async () => {
    if (!existingDocument) return

    try {
      setIsDeleting(true)
      
      // Delete from Firebase Storage
      await deleteContractDocument(existingDocument.path)
      
      // Remove from refund (set document to null)
      await updateRefund(contractId, refundId, { 
        document: null,
        updatedBy: user?.uid,
        documentDeletedAt: new Date()
      })
      
      // Notify parent component
      onDocumentUploaded(null as any)
      
      toast.success('Document supprimé avec succès')
      onClose()
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(`Erreur lors de la suppression: ${error.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[95vw] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-red-600" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">

          {/* Document existant */}
          {existingDocument && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Document actuel</Label>
              <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                {/* Mobile layout */}
                <div className="flex flex-col gap-3 sm:hidden">
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 rounded-lg p-2 flex-shrink-0">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="text-sm text-green-900 break-words whitespace-normal">
                      <p className="font-medium" title={existingDocument.originalFileName}>{existingDocument.originalFileName}</p>
                      <p className="text-xs text-green-700 mt-1">
                        Téléversé le {new Date(existingDocument.uploadedAt).toLocaleDateString('fr-FR')}
                      </p>
                      <p className="text-xs text-green-600">
                        {(existingDocument.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(existingDocument.url, '_blank')}
                      className="h-9 text-green-600 border-green-200"
                    >
                      <Eye className="h-4 w-4 mr-2" />Voir
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteExistingDocument}
                      disabled={isDeleting}
                      className="h-9 text-red-600 border-red-200"
                    >
                      {isDeleting ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent mr-2" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Supprimer
                    </Button>
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden sm:flex sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-green-100 rounded-lg p-2 flex-shrink-0">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1 max-w-md">
                      <p className="text-sm font-medium text-green-900 truncate" title={existingDocument.originalFileName}>
                        {existingDocument.originalFileName}
                      </p>
                      <p className="text-xs text-green-700">
                        Téléversé le {new Date(existingDocument.uploadedAt).toLocaleDateString('fr-FR')}
                      </p>
                      <p className="text-xs text-green-600">
                        {(existingDocument.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(existingDocument.url, '_blank')}
                      className="h-8 px-2 text-green-600 hover:text-green-700"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Voir
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteExistingDocument}
                      disabled={isDeleting}
                      className="h-8 px-2 text-red-600 hover:text-red-700"
                    >
                      {isDeleting ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent mr-1" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-1" />
                      )}
                      Supprimer
                    </Button>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800 font-medium mb-1">
                  📄 Document déjà téléversé
                </p>
                <p className="text-xs text-blue-600">
                  Pour remplacer ce document, téléversez un nouveau fichier PDF ci-dessous. 
                  L'ancien document sera automatiquement supprimé.
                </p>
              </div>
            </div>
          )}

          {/* Section Téléversement */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {existingDocument ? 'Remplacer le document' : 'Téléverser le document rempli'}
            </Label>
            
            {!selectedFile ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {existingDocument ? 'Cliquez pour sélectionner un nouveau fichier PDF' : 'Cliquez pour sélectionner un fichier PDF'}
                  </span>
                  <span className="text-xs text-gray-500">
                    PDF uniquement, max 10MB
                  </span>
                </label>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4">
                {/* Mobile layout */}
                <div className="flex flex-col gap-3 sm:hidden">
                  <div className="flex items-start gap-3">
                    <div className="bg-red-100 rounded-lg p-2 flex-shrink-0">
                      <FileText className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="text-sm text-gray-900 break-words whitespace-normal">
                      <p className="text-xs text-gray-500 mt-1">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreview}
                      className="h-9 flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />Prévisualiser
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="h-9 flex-1 text-red-600 border-red-200"
                    >
                      <X className="h-4 w-4 mr-2" />Retirer
                    </Button>
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden sm:flex sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-red-100 rounded-lg p-2 flex-shrink-0">
                      <FileText className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="min-w-0 flex-1 max-w-md">
                      <p className="text-sm font-medium text-gray-900 truncate" title={selectedFile.name}>
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePreview}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading || isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isUploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                Téléversement...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {existingDocument ? 'Remplacer le document' : 'Téléverser'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
