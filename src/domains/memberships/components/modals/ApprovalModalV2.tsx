/**
 * Modal d'approbation V2 pour une demande d'adhésion
 * 
 * Permet à un admin d'approuver une demande d'adhésion en :
 * - Sélectionnant le type de membre
 * - Uploadant la fiche d'adhésion (PDF obligatoire)
 * - Approuvant la demande (création utilisateur, abonnement, etc.)
 * - Téléchargeant automatiquement le PDF des identifiants
 */

'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadgeV2, PaymentBadgeV2 } from '../shared'
import { 
  CheckCircle, 
  Loader2, 
  Upload, 
  File, 
  X, 
  AlertCircle,
  Building2,
  Briefcase,
  User,
} from 'lucide-react'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { createFile } from '@/db/upload-image.db'
import type { MembershipRequest } from '@/types/types'

interface ApprovalModalV2Props {
  isOpen: boolean
  onClose: () => void
  onApprove: (params: {
    membershipType: 'adherant' | 'bienfaiteur' | 'sympathisant'
    adhesionPdfURL: string
    companyId?: string | null
    professionId?: string | null
  }) => Promise<void>
  request: MembershipRequest
  isLoading?: boolean
}

export function ApprovalModalV2({
  isOpen,
  onClose,
  onApprove,
  request,
  isLoading = false,
}: ApprovalModalV2Props) {
  const [membershipType, setMembershipType] = useState<'adherant' | 'bienfaiteur' | 'sympathisant' | ''>('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [errors, setErrors] = useState<{
    membershipType?: string
    pdf?: string
  }>({})

  // Validation
  const isValid = membershipType !== '' && pdfUrl !== null
  const hasCompany = request.company?.isEmployed === true && request.company?.companyName
  const hasProfession = request.company?.isEmployed === true && request.company?.profession

  // Réinitialiser le formulaire à la fermeture
  const handleClose = useCallback(() => {
    if (!isLoading && !isUploading) {
      setMembershipType('')
      setPdfFile(null)
      setPdfUrl(null)
      setErrors({})
      onClose()
    }
  }, [isLoading, isUploading, onClose])

  // Gestion de la sélection de fichier PDF
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Vérifier que c'est un fichier PDF
    if (file.type !== 'application/pdf') {
      setErrors((prev) => ({ ...prev, pdf: 'Le fichier doit être au format PDF' }))
      toast.error('Veuillez sélectionner un fichier PDF valide')
      return
    }

    // Vérifier la taille du fichier (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, pdf: 'Le fichier ne doit pas dépasser 10MB' }))
      toast.error('Le fichier PDF ne doit pas dépasser 10MB')
      return
    }

    setPdfFile(file)
    setErrors((prev) => ({ ...prev, pdf: undefined }))

    // Upload automatique vers Firebase Storage
    try {
      setIsUploading(true)
      toast.info('Upload du PDF en cours...', { duration: 2000 })

      // Upload vers Firebase Storage
      const uploadResult = await createFile(file, request.id, `membership-adhesion-pdfs/${request.id}`)
      
      setPdfUrl(uploadResult.url)
      toast.success('PDF uploadé avec succès!')
    } catch (error: any) {
      console.error('Erreur lors de l\'upload du PDF:', error)
      setErrors((prev) => ({ ...prev, pdf: error.message || 'Erreur lors de l\'upload du PDF' }))
      toast.error(`Erreur lors de l'upload: ${error.message || 'Erreur inconnue'}`)
      setPdfFile(null)
    } finally {
      setIsUploading(false)
    }
  }, [request.id])

  // Supprimer le PDF sélectionné
  const handleRemovePdf = useCallback(() => {
    setPdfFile(null)
    setPdfUrl(null)
    setErrors((prev) => ({ ...prev, pdf: undefined }))
  }, [])

  // Soumettre l'approbation
  const handleApprove = useCallback(async () => {
    // Validation
    const newErrors: typeof errors = {}
    
    if (!membershipType) {
      newErrors.membershipType = 'Le type de membre est requis'
    }
    
    if (!pdfUrl) {
      newErrors.pdf = 'Le PDF d\'adhésion est requis'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error('Veuillez corriger les erreurs avant de continuer')
      return
    }

    try {
      // Appeler la fonction d'approbation (gère l'appel au service, Cloud Function, etc.)
      // pdfUrl est vérifié non-null dans la validation précédente
      await onApprove({
        membershipType: membershipType as 'adherant' | 'bienfaiteur' | 'sympathisant',
        adhesionPdfURL: pdfUrl!,
        companyId: hasCompany ? undefined : null, // TODO: Récupérer companyId si l'entreprise existe
        professionId: hasProfession ? undefined : null, // TODO: Récupérer professionId si la profession existe
      })
    } catch (error: any) {
      console.error('Erreur lors de l\'approbation:', error)
      toast.error(`Erreur lors de l'approbation: ${error.message || 'Erreur inconnue'}`)
    }
  }, [membershipType, pdfUrl, hasCompany, hasProfession, onApprove])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-[calc(100vw-24px)] sm:max-w-[700px] max-h-[90vh] overflow-y-auto overflow-x-hidden w-full" 
        data-testid="approval-modal"
      >
        <DialogHeader data-testid="approval-modal-header">
          <DialogTitle 
            className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent"
            data-testid="approval-modal-title"
          >
            <CheckCircle className="w-6 h-6 text-[#234D65]" />
            Approuver une Demande d'Adhésion
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {request.identity?.firstName} {request.identity?.lastName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 px-4 sm:px-6">
          {/* Informations du Dossier */}
          <Card data-testid="approval-modal-dossier-section">
            <CardHeader className="pb-3 px-4 sm:px-6">
              <CardTitle className="text-base flex items-center gap-2">
                <File className="w-4 h-4" />
                Informations du Dossier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                <span className="text-sm text-gray-600">Matricule:</span>
                <span className="text-sm font-semibold break-words" data-testid="approval-modal-matricule">
                  {request.matricule || request.id}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                <span className="text-sm text-gray-600">Statut:</span>
                {request.status ? (
                  <div data-testid="approval-modal-status-badge">
                    <StatusBadgeV2 status={request.status} />
                  </div>
                ) : (
                  <span className="text-sm text-gray-400 italic" data-testid="approval-modal-status-badge">
                    —
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1 sm:gap-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                  <span className="text-sm text-gray-600">Paiement:</span>
                  {request.isPaid !== undefined ? (
                    <div data-testid="approval-modal-payment-badge">
                      <PaymentBadgeV2 isPaid={request.isPaid || false} />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic" data-testid="approval-modal-payment-badge">
                      —
                    </span>
                  )}
                </div>
                {request.isPaid === false && (
                  <span className="text-xs text-amber-600 italic ml-0 sm:ml-auto" data-testid="approval-modal-payment-hint">
                    (Paiement requis avant approbation)
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Entreprise (si applicable) */}
          {hasCompany && (
            <Card data-testid="approval-modal-company-section">
              <CardHeader className="pb-3 px-4 sm:px-6">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Entreprise
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                  <span className="text-sm text-gray-600">Nom:</span>
                  <span className="text-sm font-semibold break-words" data-testid="approval-modal-company-name">
                    {request.company?.companyName}
                  </span>
                </div>
                <div className="flex items-center justify-start sm:justify-end">
                  <Badge variant="outline" data-testid="approval-modal-company-exists-badge" className="w-fit">
                    {/* TODO: Vérifier si l'entreprise existe dans la base */}
                    Existe
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Profession (si applicable) */}
          {hasProfession && (
            <Card data-testid="approval-modal-profession-section">
              <CardHeader className="pb-3 px-4 sm:px-6">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Profession
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                  <span className="text-sm text-gray-600">Nom:</span>
                  <span className="text-sm font-semibold break-words" data-testid="approval-modal-profession-name">
                    {request.company?.profession}
                  </span>
                </div>
                <div className="flex items-center justify-start sm:justify-end">
                  <Badge variant="outline" data-testid="approval-modal-profession-exists-badge" className="w-fit">
                    {/* TODO: Vérifier si la profession existe dans la base */}
                    Existe
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Type de Membre */}
          <Card data-testid="approval-modal-membership-type-section">
            <CardHeader className="pb-3 px-4 sm:px-6">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Type de Membre <span className="text-red-500">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <Select
                value={membershipType}
                onValueChange={(value) => {
                  setMembershipType(value as 'adherant' | 'bienfaiteur' | 'sympathisant')
                  setErrors((prev) => ({ ...prev, membershipType: undefined }))
                }}
                disabled={isLoading || isUploading}
                data-testid="approval-modal-membership-type-select"
              >
                <SelectTrigger className={errors.membershipType ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Sélectionner un type de membre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adherant">Adhérent</SelectItem>
                  <SelectItem value="bienfaiteur">Bienfaiteur</SelectItem>
                  <SelectItem value="sympathisant">Sympathisant</SelectItem>
                </SelectContent>
              </Select>
              {errors.membershipType && (
                <p className="text-xs text-red-500 mt-1" data-testid="approval-modal-membership-type-error">
                  {errors.membershipType}
                </p>
              )}
            </CardContent>
          </Card>

          {/* PDF d'Adhésion */}
          <Card data-testid="approval-modal-pdf-section">
            <CardHeader className="pb-3 px-4 sm:px-6">
              <CardTitle className="text-base flex items-center gap-2">
                <File className="w-4 h-4" />
                Fiche d'Adhésion (PDF) <span className="text-red-500">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {!pdfUrl ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-colors w-full ${
                    errors.pdf
                      ? 'border-red-500 bg-red-50'
                      : isUploading
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
                  }`}
                  data-testid="approval-modal-pdf-upload-zone"
                >
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    disabled={isLoading || isUploading}
                    className="hidden"
                    id="pdf-upload-input"
                    data-testid="approval-modal-pdf-file-input"
                  />
                  <label
                    htmlFor="pdf-upload-input"
                    className="cursor-pointer flex flex-col items-center gap-2 w-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        <span className="text-sm text-blue-600 break-words text-wrap">Upload en cours...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-gray-400" />
                        <span className="text-sm text-gray-600 break-words text-wrap px-2">
                          Glissez-déposez ou cliquez pour choisir
                        </span>
                        <span className="text-xs text-gray-500 break-words text-wrap px-2">
                          Format: PDF uniquement, Max: 10 MB
                        </span>
                      </>
                    )}
                  </label>
                  {errors.pdf && (
                    <p className="text-xs text-red-500 mt-2 break-words text-wrap" data-testid="approval-modal-pdf-error">
                      {errors.pdf}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 w-full gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <File className="w-5 h-5 text-blue-500 shrink-0" />
                    <span className="text-sm font-medium break-words text-wrap" data-testid="approval-modal-pdf-file-name">
                      {pdfFile?.name || 'Fichier PDF'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemovePdf}
                    disabled={isLoading || isUploading}
                    className="text-red-500 hover:text-red-700 shrink-0"
                    data-testid="approval-modal-pdf-remove-button"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages d'erreur API */}
          {errors.pdf && pdfUrl && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription data-testid="approval-modal-api-error">
                {errors.pdf}
              </AlertDescription>
            </Alert>
          )}

          {/* Message de chargement */}
          {(isLoading || isUploading) && (
            <Alert>
              <Loader2 className="w-4 h-4 animate-spin" />
              <AlertDescription data-testid="approval-modal-loading-message">
                {isUploading ? 'Upload du PDF en cours...' : 'Approbation en cours...'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row px-4 sm:px-6 pb-4 sm:pb-6">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading || isUploading}
            className="border-gray-300 w-full sm:w-auto"
            data-testid="approval-modal-cancel-button"
          >
            Annuler
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isLoading || isUploading || !isValid}
            className="bg-[#234D65] hover:bg-[#234D65]/90 text-white w-full sm:w-auto"
            data-testid="approval-modal-approve-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" data-testid="approval-modal-loading-spinner" />
                Approbation en cours...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Approuver
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
