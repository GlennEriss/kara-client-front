'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Beneficiary } from '@/constantes/beneficiary'
import { updateMembershipRequestBeneficiary } from '@/db/membership.db'
import { useAuth } from '@/hooks/useAuth'
import { useMyAccess } from '@/hooks/useMyAccess'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil } from 'lucide-react'
import { useState } from 'react'
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form'
import type { RegisterFormData } from '@/schemas/schemas'
import { MEMBERSHIP_REQUEST_CACHE } from '@/constantes/membership-requests'
import { toast } from 'sonner'
import BeneficiaryMemberField from './BeneficiaryMemberField'

/**
 * Modification de l'ayant droit par l'admin, à tout moment (demande en cours
 * ou membre déjà validé). Enregistré sur la demande d'adhésion (dossier).
 */
export default function BeneficiaryEditDialog({
  requestId,
  beneficiary,
}: {
  requestId: string
  beneficiary?: Partial<Beneficiary> | null
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()
  const { can } = useMyAccess()
  const queryClient = useQueryClient()
  // Le champ réutilise le formulaire d'inscription : même chemin `identity.beneficiary`.
  const form = useForm<{ identity: { beneficiary: Partial<Beneficiary> } }>({
    defaultValues: { identity: { beneficiary: beneficiary ?? {} } },
  })

  if (!can('members.edit') && !can('memberRequests.edit')) return null

  const handleOpen = () => {
    form.reset({ identity: { beneficiary: beneficiary ?? {} } })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!user?.uid) return
    setSaving(true)
    try {
      await updateMembershipRequestBeneficiary(requestId, form.getValues('identity.beneficiary'), user.uid)
      await queryClient.invalidateQueries({ queryKey: [MEMBERSHIP_REQUEST_CACHE.QUERY_KEY] })
      await queryClient.invalidateQueries({ queryKey: ['membership-beneficiary', requestId] })
      toast.success('Ayant droit mis à jour')
      setOpen(false)
    } catch (error) {
      toast.error("Impossible de modifier l'ayant droit", { description: error instanceof Error ? error.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-violet-700" onClick={handleOpen}>
        <Pencil className="mr-1 h-3.5 w-3.5" />
        Modifier
      </Button>
      <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier l&apos;ayant droit</DialogTitle>
          </DialogHeader>
          <FormProvider {...(form as unknown as UseFormReturn<RegisterFormData>)}>
            <BeneficiaryMemberField />
          </FormProvider>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving} className="bg-[#234D65] hover:bg-[#1a3a4d]">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
