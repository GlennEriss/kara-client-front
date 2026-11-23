'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { insuranceAssetOptions } from '@/domains/vehicles/asset-types'
import { useAddInsuranceAssetType, useInsuranceAssetTypes } from '@/domains/vehicles/use-insurance-asset-types'

export function InsuranceAssetTypesDialog({ open, onOpenChange }: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [label, setLabel] = useState('')
  const types = useInsuranceAssetTypes()
  const add = useAddInsuranceAssetType()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await add.mutateAsync(label)
      setLabel('')
    } catch {
      // La mutation expose le motif dans le formulaire.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Types de biens</DialogTitle>
          <DialogDescription>Les nouveaux types sont proposés dans les formulaires d’assurance et de prospection.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-2">
          <Label htmlFor="insurance-asset-label">Nouveau type de bien</Label>
          <div className="flex gap-2">
            <Input id="insurance-asset-label" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={60} required />
            <Button type="submit" disabled={add.isPending || types.isPending}>Ajouter</Button>
          </div>
          {add.error && <p role="alert" className="text-sm text-destructive">{add.error.message}</p>}
        </form>
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {insuranceAssetOptions(types.data).map((type) => <li key={type.value}>{type.label}</li>)}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
