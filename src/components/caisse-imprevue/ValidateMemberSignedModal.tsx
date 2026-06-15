'use client'

import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, Eye, FileText, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useAuth } from '@/hooks/useAuth'
import type { ContractCI } from '@/types/types'
import ViewUploadedContractCIModal from './ViewUploadedContractCIModal'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract: ContractCI
}

export default function ValidateMemberSignedModal({
  open,
  onOpenChange,
  contract,
}: Props) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [viewMemberDocOpen, setViewMemberDocOpen] = useState(false)

  const validateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('Veuillez sélectionner le contrat doublement signé')
      const service = ServiceFactory.getCaisseImprevueService()
      return service.validateMemberSignedContract(contract.id, user?.uid ?? 'admin', selectedFile)
    },
    onSuccess: () => {
      toast.success('Contrat validé', {
        description: 'Le contrat doublement signé est maintenant le document officiel.',
      })
      queryClient.invalidateQueries({ queryKey: ['contractCI', contract.id] })
      queryClient.invalidateQueries({ queryKey: ['contractsCI'] })
      setSelectedFile(null)
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error('Erreur lors de la validation', {
        description: error instanceof Error ? error.message : 'Veuillez réessayer.',
      })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const service = ServiceFactory.getCaisseImprevueService()
      return service.rejectMemberSignedContract(contract.id, user?.uid ?? 'admin')
    },
    onSuccess: () => {
      toast.success('Document refusé', {
        description: 'Le membre sera invité à re-téléverser son contrat signé.',
      })
      queryClient.invalidateQueries({ queryKey: ['contractCI', contract.id] })
      queryClient.invalidateQueries({ queryKey: ['contractsCI'] })
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error('Erreur lors du refus', {
        description: error instanceof Error ? error.message : 'Veuillez réessayer.',
      })
    },
  })

  const isPending = validateMutation.isPending || rejectMutation.isPending
  const hasMemberDoc = !!contract.memberSignedDocumentId

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setSelectedFile(null)
    onOpenChange(nextOpen)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <ModalContent size="sm">
          <ModalHeader icon={FileText} title="Validation du contrat signé" />

          <ModalBody>
            <p className="text-sm text-gray-600">
              Vérifiez le contrat signé par le membre, puis téléversez la version
              doublement signée pour finaliser.
            </p>

            {/* Document du membre */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                Contrat signé par le membre
              </p>
              {hasMemberDoc ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMemberDocOpen(true)}
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-100 gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Visualiser / Télécharger
                </Button>
              ) : (
                <p className="text-sm text-blue-400 italic">Document non disponible</p>
              )}
            </div>

            {/* Upload contrat doublement signé */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Contrat doublement signé (admin + membre)
              </p>
              <p className="text-xs text-emerald-600">
                Téléversez le contrat signé par les deux parties. Ce fichier deviendra
                le document officiel visible par le membre.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
                className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-100 gap-1.5"
              >
                <Upload className="h-3.5 w-3.5 shrink-0" />
                {selectedFile ? 'Changer le fichier' : 'Choisir le PDF doublement signé'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  setSelectedFile(file)
                  e.target.value = ''
                }}
              />
              {selectedFile && (
                <p className="text-xs text-emerald-700 font-medium break-all line-clamp-2">
                  ✓ {selectedFile.name}
                </p>
              )}
            </div>

          </ModalBody>

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => rejectMutation.mutate()}
              disabled={isPending}
              className="flex-1 border-red-200 text-red-700 hover:bg-red-50 gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              {rejectMutation.isPending ? 'Refus…' : 'Refuser'}
            </Button>
            <Button
              onClick={() => validateMutation.mutate()}
              disabled={isPending || !selectedFile}
              className="flex-1 bg-[#234D65] hover:bg-[#2c5a73] text-white gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {validateMutation.isPending ? 'Envoi…' : 'Valider et publier'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Dialog>

      <ViewUploadedContractCIModal
        isOpen={viewMemberDocOpen}
        onClose={() => setViewMemberDocOpen(false)}
        contract={contract}
        documentId={contract.memberSignedDocumentId}
      />
    </>
  )
}
