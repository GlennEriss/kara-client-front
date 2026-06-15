'use client'

import { PAYMENT_MODES, PAYMENT_MODE_LABELS } from '@/constantes/membership-requests'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { signedQuittanceUploadSchema, type SignedQuittanceUploadFormData } from '@/schemas/credit-speciale.schema'
import { CreditContract } from '@/types/types'
import { format } from 'date-fns'
import { FileText, Loader2, Pencil, Upload } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ACCEPTED_TYPE = 'application/pdf'
const MODIFICATION_MOTIF_MIN = 10
const MODIFICATION_MOTIF_MAX = 500

const PAYMENT_MODE_OPTIONS = [
  PAYMENT_MODES.AIRTEL_MONEY,
  PAYMENT_MODES.MOBICASH,
  PAYMENT_MODES.CASH,
  PAYMENT_MODES.BANK_TRANSFER,
  PAYMENT_MODES.OTHER,
] as const

function getDefaultRepaidAtTime() {
  return format(new Date(), 'HH:mm')
}

function getDefaultRepaidAtDate() {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Données préremplies depuis le contrat (mode modification) */
export interface SignedQuittanceInitialData {
  paymentMode: SignedQuittanceUploadFormData['paymentMode']
  withFees?: boolean
  methodOther?: string
  repaidAtDate: string
  repaidAtTime: string
  comment?: string
}

function buildInitialDataFromContract(contract: CreditContract): SignedQuittanceInitialData {
  const repaidAt = contract.finalRepaymentRepaidAt
    ? new Date(contract.finalRepaymentRepaidAt)
    : new Date()
  return {
    paymentMode: contract.finalRepaymentPaymentMode ?? 'cash',
    withFees: contract.finalRepaymentWithFees,
    methodOther: contract.finalRepaymentMethodOther ?? '',
    repaidAtDate: contract.finalRepaymentRepaidAt
      ? format(repaidAt, 'yyyy-MM-dd')
      : getDefaultRepaidAtDate(),
    repaidAtTime: contract.finalRepaymentRepaidAt
      ? format(repaidAt, 'HH:mm')
      : getDefaultRepaidAtTime(),
    comment: contract.finalRepaymentComment ?? '',
  }
}

interface SignedQuittanceUploadModalProps {
  isOpen: boolean
  onClose: () => void
  contract: CreditContract
  /** Mode remplacement : true = modifier la quittance existante (prefill + motif obligatoire) */
  isReplace?: boolean
  onUpload: (file: File, data: SignedQuittanceUploadFormData) => Promise<void>
  onReplace?: (file: File, data: SignedQuittanceUploadFormData, modificationMotif: string) => Promise<void>
  isPending?: boolean
}

export default function SignedQuittanceUploadModal({
  isOpen,
  onClose,
  contract,
  isReplace = false,
  onUpload,
  onReplace,
  isPending = false,
}: SignedQuittanceUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paymentMode, setPaymentMode] = useState<SignedQuittanceUploadFormData['paymentMode']>('cash')
  const [withFees, setWithFees] = useState<boolean | undefined>(undefined)
  const [methodOther, setMethodOther] = useState('')
  const [repaidAtDate, setRepaidAtDate] = useState(getDefaultRepaidAtDate)
  const [repaidAtTime, setRepaidAtTime] = useState(getDefaultRepaidAtTime)
  const [comment, setComment] = useState('')
  const [modificationMotif, setModificationMotif] = useState('')

  const isMobileMoney = paymentMode === 'airtel_money' || paymentMode === 'mobicash'
  const isOther = paymentMode === 'other'
  const prevOpenRef = useRef(false)

  useEffect(() => {
    if (!isOpen) {
      prevOpenRef.current = false
      return
    }
    if (isOpen && !prevOpenRef.current) {
      if (isReplace && contract.signedQuittanceUrl) {
        const initial = buildInitialDataFromContract(contract)
        setPaymentMode(initial.paymentMode)
        setWithFees(initial.withFees)
        setMethodOther(initial.methodOther ?? '')
        setRepaidAtDate(initial.repaidAtDate)
        setRepaidAtTime(initial.repaidAtTime)
        setComment(initial.comment ?? '')
        setModificationMotif('')
      } else {
        setPaymentMode('cash')
        setWithFees(undefined)
        setMethodOther('')
        setRepaidAtDate(getDefaultRepaidAtDate())
        setRepaidAtTime(getDefaultRepaidAtTime())
        setComment('')
        setModificationMotif('')
      }
      setFile(null)
      setError(null)
    }
    prevOpenRef.current = isOpen
  }, [isOpen, isReplace, contract])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) {
      setFile(null)
      return
    }
    if (selectedFile.type !== ACCEPTED_TYPE) {
      setError('Le fichier doit être un PDF')
      setFile(null)
      return
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('Le fichier ne doit pas dépasser 5 MB')
      setFile(null)
      return
    }
    setFile(selectedFile)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!file) {
      setError('Veuillez sélectionner un fichier PDF')
      return
    }
    if (isReplace) {
      const trimmed = modificationMotif.trim()
      if (trimmed.length < MODIFICATION_MOTIF_MIN || trimmed.length > MODIFICATION_MOTIF_MAX) {
        setError(`Le motif de modification doit contenir entre ${MODIFICATION_MOTIF_MIN} et ${MODIFICATION_MOTIF_MAX} caractères`)
        return
      }
      if (!onReplace) {
        setError('Fonction de remplacement non disponible')
        return
      }
    }
    const payload: SignedQuittanceUploadFormData = {
      paymentMode,
      withFees: isMobileMoney ? withFees : undefined,
      methodOther: isOther ? methodOther.trim() : undefined,
      repaidAtDate,
      repaidAtTime,
      comment: comment.trim() || undefined,
    }
    const result = signedQuittanceUploadSchema.safeParse(payload)
    if (!result.success) {
      const firstIssue = result.error.issues[0]
      setError(firstIssue?.message ?? 'Veuillez remplir tous les champs requis')
      return
    }
    try {
      if (isReplace && onReplace) {
        await onReplace(file, result.data, modificationMotif.trim())
      } else {
        await onUpload(file, result.data)
      }
      setFile(null)
      setError(null)
      setModificationMotif('')
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    }
  }

  const handleClose = () => {
    setFile(null)
    setError(null)
    setModificationMotif('')
    onClose()
  }

  const canSubmit =
    file &&
    (repaidAtDate?.length > 0 && /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(repaidAtTime)) &&
    (!isMobileMoney || withFees === true || withFees === false) &&
    (!isOther || methodOther.trim().length >= 2) &&
    (!isReplace || (modificationMotif.trim().length >= MODIFICATION_MOTIF_MIN && modificationMotif.trim().length <= MODIFICATION_MOTIF_MAX))

  const title = isReplace ? 'Modifier la quittance signée' : 'Téléverser la quittance signée'
  const description = isReplace
    ? `Modifiez les informations du remboursement final si besoin, sélectionnez le nouveau PDF de la quittance signée et indiquez le motif de modification. Taille max : 5 MB.`
    : `Renseignez le moyen de paiement du remboursement, la date et l'heure, puis sélectionnez le PDF de la quittance signée par le membre ${contract.clientFirstName} ${contract.clientLastName}. Taille max : 5 MB.`

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <ModalContent size="md">
        <ModalHeader
          icon={isReplace ? Pencil : Upload}
          title={title}
          description={description}
        />
        <ModalBody>
        <form id="signed-quittance-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Moyen de paiement du remboursement</Label>
            <Select
              value={paymentMode}
              onValueChange={(v) => {
                setPaymentMode(v as SignedQuittanceUploadFormData['paymentMode'])
                if (v !== 'airtel_money' && v !== 'mobicash') setWithFees(undefined)
                if (v !== 'other') setMethodOther('')
              }}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_MODE_OPTIONS.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {PAYMENT_MODE_LABELS[mode] ?? mode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isMobileMoney && (
            <div className="space-y-2">
              <Label>Frais</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="withFees"
                    checked={withFees === true}
                    onChange={() => setWithFees(true)}
                    disabled={isPending}
                  />
                  <span>Avec frais</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="withFees"
                    checked={withFees === false}
                    onChange={() => setWithFees(false)}
                    disabled={isPending}
                  />
                  <span>Sans frais</span>
                </label>
              </div>
            </div>
          )}

          {isOther && (
            <div className="space-y-2">
              <Label htmlFor="methodOther">Précisez le moyen de remboursement</Label>
              <input
                id="methodOther"
                type="text"
                value={methodOther}
                onChange={(e) => setMethodOther(e.target.value)}
                placeholder="Ex. Chèque, Orange Money..."
                disabled={isPending}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                maxLength={200}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="repaidAtDate">Date du remboursement</Label>
              <input
                id="repaidAtDate"
                type="date"
                value={repaidAtDate}
                onChange={(e) => setRepaidAtDate(e.target.value)}
                disabled={isPending}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repaidAtTime">Heure du remboursement</Label>
              <input
                id="repaidAtTime"
                type="time"
                value={repaidAtTime}
                onChange={(e) => setRepaidAtTime(e.target.value)}
                disabled={isPending}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Commentaire (optionnel)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Commentaire pour l'enregistrement du remboursement..."
              disabled={isPending}
              rows={3}
              maxLength={1000}
              className="resize-y"
            />
            <p className="text-xs text-muted-foreground">{comment.length}/1000</p>
          </div>

          {isReplace && (
            <div className="space-y-2">
              <Label htmlFor="modificationMotif">Motif de modification (obligatoire)</Label>
              <Textarea
                id="modificationMotif"
                value={modificationMotif}
                onChange={(e) => setModificationMotif(e.target.value)}
                placeholder="Ex. Correction d'une erreur sur le moyen de paiement, remplacement par la quittance signée définitive..."
                disabled={isPending}
                rows={3}
                minLength={MODIFICATION_MOTIF_MIN}
                maxLength={MODIFICATION_MOTIF_MAX}
                required
                className="resize-y border-amber-200 focus-visible:ring-amber-500/50"
              />
              <p className="text-xs text-muted-foreground">
                {modificationMotif.length}/{MODIFICATION_MOTIF_MAX} caractères (min. {MODIFICATION_MOTIF_MIN})
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Quittance signée (PDF)</Label>
            <div className="flex items-center gap-2 p-4 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept={ACCEPTED_TYPE}
                onChange={handleFileChange}
                disabled={isPending}
                className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground file:cursor-pointer"
              />
            </div>
            {file && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="text-sm truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

        </form>
        </ModalBody>
        <ModalFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Annuler
          </Button>
          <Button
            type="submit"
            form="signed-quittance-form"
            disabled={isPending || !canSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isReplace ? 'Modification...' : 'Téléversement...'}
              </>
            ) : (
              <>
                {isReplace ? <Pencil className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
                {isReplace ? 'Enregistrer la modification' : 'Enregistrer le remboursement et téléverser'}
              </>
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
