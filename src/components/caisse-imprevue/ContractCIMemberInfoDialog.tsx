'use client'

import GabonPhoneInput from '@/components/shared/GabonPhoneInput'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Pencil, UserCog } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RepositoryFactory } from '@/factories/RepositoryFactory'
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin'
import type { ContractCI } from '@/types/types'

type Props = {
  contract?: ContractCI | null
}

const selectClass =
  'flex h-9 w-full rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#234D65]/40'

/**
 * Bouton (réservé au superAdmin) permettant de corriger les informations
 * dénormalisées du membre stockées sur le contrat Caisse Imprévue (nom, sexe,
 * contacts, adresse…). N'affecte pas la fiche membre.
 */
export default function ContractCIMemberInfoDialog({ contract }: Props) {
  const isSuperAdmin = useIsSuperAdmin()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    memberFirstName: '',
    memberLastName: '',
    memberGender: '',
    memberBirthDate: '',
    memberNationality: '',
    memberAddress: '',
    memberProfession: '',
    memberEmail: '',
    phone1: '',
    phone2: '',
  })

  if (!isSuperAdmin || !contract?.id) return null

  const startEdit = () => {
    setForm({
      memberFirstName: contract.memberFirstName || '',
      memberLastName: contract.memberLastName || '',
      memberGender: contract.memberGender || '',
      memberBirthDate: contract.memberBirthDate || '',
      memberNationality: contract.memberNationality || '',
      memberAddress: contract.memberAddress || '',
      memberProfession: contract.memberProfession || '',
      memberEmail: contract.memberEmail || '',
      phone1: contract.memberContacts?.[0] || '',
      phone2: contract.memberContacts?.[1] || '',
    })
    setOpen(true)
  }

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (!form.memberLastName.trim() || !form.memberFirstName.trim()) {
      toast.error('Nom et prénom sont obligatoires')
      return
    }
    setSaving(true)
    try {
      const contacts = [form.phone1.trim(), form.phone2.trim()].filter(Boolean)
      await RepositoryFactory.getContractCIRepository().updateContract(contract.id, {
        memberFirstName: form.memberFirstName.trim(),
        memberLastName: form.memberLastName.trim(),
        memberGender: form.memberGender,
        memberBirthDate: form.memberBirthDate,
        memberNationality: form.memberNationality.trim(),
        memberAddress: form.memberAddress.trim(),
        memberProfession: form.memberProfession.trim(),
        memberEmail: form.memberEmail.trim(),
        memberContacts: contacts,
      })
      await queryClient.invalidateQueries({ queryKey: ['contractCI', contract.id] })
      await queryClient.invalidateQueries({ queryKey: ['contractsCI'] })
      toast.success('Informations du membre mises à jour')
      setOpen(false)
    } catch {
      toast.error('Échec de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          onClick={startEdit}
          className="inline-flex items-center gap-2 rounded-lg border bg-[#234D65]/10 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
        >
          <UserCog className="h-4 w-4" />
          Modifier les infos
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[90dvh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-[#234D65]" />
            Informations du membre (contrat)
          </DialogTitle>
          <DialogDescription>
            Corrige les informations affichées sur ce contrat. La fiche membre n&apos;est pas modifiée.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 min-h-0 pr-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Nom</Label>
              <Input value={form.memberLastName} onChange={(e) => set('memberLastName', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Prénom</Label>
              <Input value={form.memberFirstName} onChange={(e) => set('memberFirstName', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Sexe</Label>
              <select className={selectClass} value={form.memberGender} onChange={(e) => set('memberGender', e.target.value)}>
                <option value="">—</option>
                <option value="Homme">Homme</option>
                <option value="Femme">Femme</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Date de naissance</Label>
              <Input type="date" value={form.memberBirthDate} onChange={(e) => set('memberBirthDate', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Nationalité</Label>
              <Input value={form.memberNationality} onChange={(e) => set('memberNationality', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Profession</Label>
              <Input value={form.memberProfession} onChange={(e) => set('memberProfession', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Téléphone 1</Label>
              <GabonPhoneInput value={form.phone1} onChange={(v) => set('phone1', v)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Téléphone 2</Label>
              <GabonPhoneInput value={form.phone2} onChange={(v) => set('phone2', v)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-slate-500">Quartier / Adresse</Label>
              <Input value={form.memberAddress} onChange={(e) => set('memberAddress', e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs text-slate-500">Email</Label>
              <Input value={form.memberEmail} onChange={(e) => set('memberEmail', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
              {saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
