'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { Calendar, Loader2 } from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'

interface RestMonthModalProps {
  isOpen: boolean
  onClose: () => void
  creditId: string
  monthNumber: number
  onSuccess?: () => void
}

export default function RestMonthModal({
  isOpen,
  onClose,
  creditId,
  monthNumber,
  onSuccess,
}: RestMonthModalProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = reason.trim()
    if (!trimmed) {
      toast.error('Veuillez indiquer le motif du mois de repos.')
      return
    }
    if (!user?.uid || !user?.displayName) {
      toast.error('Session utilisateur invalide.')
      return
    }
    setIsSubmitting(true)
    try {
      const service = ServiceFactory.getCreditSpecialeService()
      await service.recordRestMonth(creditId, monthNumber, trimmed, user.uid, user.displayName)
      toast.success('Mois de repos enregistré.')
      setReason('')
      onClose()
      onSuccess?.()
      await queryClient.invalidateQueries({ queryKey: ['creditContract', creditId] })
      await queryClient.invalidateQueries({ queryKey: ['creditPayments', creditId] })
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Mois de repos – Échéance {monthNumber}
          </DialogTitle>
          <DialogDescription>
            Enregistrer le mois {monthNumber} comme mois de repos (aucun paiement, aucune pénalité). Indiquez le motif (maladie, cas de force majeure, etc.).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="rest-reason">Motif *</Label>
            <Textarea
              id="rest-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex. maladie, décès dans la famille, …"
              className="mt-1 min-h-[80px]"
              disabled={isSubmitting}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-kara-blue text-white hover:bg-kara-blue/90 focus-visible:ring-kara-blue"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? 'Enregistrement…' : 'Enregistrer le mois de repos'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
