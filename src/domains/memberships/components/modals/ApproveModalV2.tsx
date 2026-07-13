/**
 * Modal d'approbation V2 pour une demande d'adhésion
 * 
 * Suit les diagrammes de séquence et la logique métier
 */

'use client'

import { Dialog } from '@/components/ui/responsive-dialog'
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface ApproveModalV2Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: {
    membershipType: 'adherant' | 'bienfaiteur' | 'sympathisant'
    companyName?: string
    professionName?: string
  }) => Promise<void>
  requestId: string
  memberName: string
  isLoading?: boolean
}

export function ApproveModalV2({
  isOpen,
  onClose,
  onConfirm,
  requestId,
  memberName,
  isLoading = false,
}: ApproveModalV2Props) {
  const [membershipType, setMembershipType] = useState<'adherant' | 'bienfaiteur' | 'sympathisant' | ''>('')
  const [companyName, setCompanyName] = useState('')
  const [professionName, setProfessionName] = useState('')

  const handleConfirm = async () => {
    if (!membershipType) {
      return
    }

    await onConfirm({
      membershipType: membershipType as 'adherant' | 'bienfaiteur' | 'sympathisant',
      companyName: companyName.trim() || undefined,
      professionName: professionName.trim() || undefined,
    })
  }

  const handleClose = () => {
    if (!isLoading) {
      setMembershipType('')
      setCompanyName('')
      setProfessionName('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <ModalContent className="sm:max-w-[500px]">
        <ModalHeader
          icon={CheckCircle2}
          tone="success"
          title="Approuver la demande d'adhésion"
          description={
            <>
              Vous êtes sur le point d'approuver la demande de <strong>{memberName}</strong>.
              Veuillez sélectionner le type de membre.
            </>
          }
        />

        <ModalBody>
          {/* Type de membre */}
          <div className="space-y-2">
            <Label htmlFor="membershipType" className="text-sm font-semibold text-kara-primary-dark">
              Type de membre <span className="text-red-500">*</span>
            </Label>
            <Select
              value={membershipType}
              onValueChange={(value) => setMembershipType(value as any)}
              disabled={isLoading}
            >
              <SelectTrigger id="membershipType" className="h-10">
                <SelectValue placeholder="Sélectionner un type de membre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adherant">Adhérent</SelectItem>
                <SelectItem value="bienfaiteur">Bienfaiteur</SelectItem>
                <SelectItem value="sympathisant">Sympathisant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nom de l'entreprise (optionnel) */}
          <div className="space-y-2">
            <Label htmlFor="companyName" className="text-sm font-semibold text-gray-700">
              Nom de l'entreprise (optionnel)
            </Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nom de l'entreprise"
              disabled={isLoading}
              className="h-10"
            />
          </div>

          {/* Nom de la profession (optionnel) */}
          <div className="space-y-2">
            <Label htmlFor="professionName" className="text-sm font-semibold text-gray-700">
              Profession (optionnel)
            </Label>
            <Input
              id="professionName"
              value={professionName}
              onChange={(e) => setProfessionName(e.target.value)}
              placeholder="Nom de la profession"
              disabled={isLoading}
              className="h-10"
            />
          </div>
        </ModalBody>

        <ModalFooter className="flex-col-reverse gap-2 sm:flex-row [&>button]:w-full sm:[&>button]:w-auto">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="border-gray-300"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !membershipType}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Approbation en cours...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approuver
              </>
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  )
}
