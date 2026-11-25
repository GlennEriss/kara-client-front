'use client'

import { useState, type FormEvent } from 'react'
import { Package, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { insuranceAssetOptions } from '@/domains/vehicles/asset-types'
import { useInsuranceAssetTypes, useUpdateInsuranceAssetTypes } from '@/domains/vehicles/use-insurance-asset-types'

export function InsuranceAssetTypesDialog({ open, onOpenChange }: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [label, setLabel] = useState('')
  const types = useInsuranceAssetTypes()
  const update = useUpdateInsuranceAssetTypes()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await update.mutateAsync({ label })
      setLabel('')
    } catch {
      // La mutation expose le motif dans le formulaire.
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="lg" icon={Package} title="Types de biens"
      description="Gérez les types de biens proposés dans les formulaires."
      footer={<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>}>
        <form onSubmit={submit} className="space-y-2 rounded-xl border bg-muted/35 p-3 sm:p-4">
          <Label htmlFor="insurance-asset-label">Nouveau type de bien</Label>
          <div className="flex gap-2">
            <Input id="insurance-asset-label" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={60} required />
            <Button type="submit" disabled={update.isPending || !types.isSuccess}><Plus className="size-4" aria-hidden /> Ajouter</Button>
          </div>
          {update.error && <p role="alert" className="text-sm text-destructive">{update.error.message}</p>}
        </form>
        {types.isError && (
          <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
            Impossible de charger les types de biens.
            <Button type="button" variant="link" onClick={() => void types.refetch()}>Réessayer</Button>
          </div>
        )}
        {types.isPending && <p role="status" className="text-sm text-muted-foreground">Chargement des types de biens…</p>}
        {types.isSuccess && (
          <ul className="divide-y rounded-lg border text-sm">
            {insuranceAssetOptions(types.data, { includeInactive: true }).map(({ value, label }) => {
              const inactive = types.data.inactive.includes(value)
              return (
                <li key={value} className="flex min-h-11 items-center justify-between gap-2 px-3 py-1">
                  <span className="min-w-0 break-words">
                    {label}
                    {inactive && <span className="ml-2 text-xs text-muted-foreground">Retiré</span>}
                  </span>
                  {value !== 'other' && (
                    <Button type="button" variant="outline" size="sm" disabled={update.isPending}
                      aria-label={`${inactive ? 'Réactiver' : 'Retirer'} ${label}`}
                      onClick={() => update.mutate({ value, active: inactive })}>
                      {inactive ? 'Réactiver' : 'Retirer'}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
    </Modal>
  )
}
