/**
 * Modal d'approbation V2 pour une demande d'adhésion
 * 
 * Suit les diagrammes de séquence et la logique métier
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
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-kara-primary-dark">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Approuver la demande d'adhésion
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Vous êtes sur le point d'approuver la demande de <strong>{memberName}</strong>.
            Veuillez sélectionner le type de membre.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
        </div>

        <DialogFooter className="gap-2">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
