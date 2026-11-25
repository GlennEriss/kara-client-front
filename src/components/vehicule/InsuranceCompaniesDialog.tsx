'use client'

import { useState, type FormEvent } from 'react'
import { Building2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useInsuranceCompanies, useUpdateInsuranceCompanies } from '@/domains/vehicles/use-insurance-companies'

export function InsuranceCompaniesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const catalog = useInsuranceCompanies(open)
  const update = useUpdateInsuranceCompanies()
  const [name, setName] = useState('')
  const [removing, setRemoving] = useState('')

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await update.mutateAsync({ add: name })
      setName('')
    } catch { /* Le formulaire affiche l’erreur de la mutation. */ }
  }

  return (
    <Modal open={open} onOpenChange={value => { if (!value) setRemoving(''); onOpenChange(value) }}
      size="lg" icon={Building2} title="Liste des assureurs"
      description="Choisissez les noms proposés dans les formulaires d’assurance et de prospection."
      footer={<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>}>
      <form onSubmit={add} className="space-y-2 rounded-xl border bg-muted/35 p-3 sm:p-4">
        <Label htmlFor="new-insurer">Nouvel assureur</Label>
        <div className="flex gap-2">
          <Input id="new-insurer" value={name} onChange={event => setName(event.target.value)} required maxLength={60} />
          <Button type="submit" disabled={!catalog.isSuccess || update.isPending}><Plus className="size-4" aria-hidden /> Ajouter</Button>
        </div>
      </form>
      {catalog.isPending && <p role="status" className="text-sm">Chargement des assureurs…</p>}
      {catalog.isError && <div role="alert" className="text-sm">Liste des assureurs indisponible.
        <Button type="button" variant="link" onClick={() => void catalog.refetch()}>Réessayer</Button>
      </div>}
      {update.error && <p role="alert" className="text-sm text-destructive">{update.error.message}</p>}
      {catalog.isSuccess && (catalog.data.length === 0 ? <p className="text-sm text-muted-foreground">Aucun assureur dans la liste.</p> : (
        <ul className="divide-y rounded-xl border">
          {catalog.data.map(insurer => (
            <li key={insurer} className="flex min-h-12 flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="min-w-0 break-words font-medium">{insurer}</span>
              {removing === insurer ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setRemoving('')}>Annuler</Button>
                  <Button type="button" size="sm" variant="destructive" disabled={update.isPending}
                    onClick={() => update.mutate({ remove: insurer }, { onSuccess: () => setRemoving('') })}>Confirmer le retrait</Button>
                </div>
              ) : (
                <Button type="button" size="sm" variant="outline" aria-label={`Retirer ${insurer}`}
                  disabled={update.isPending} onClick={() => { update.reset(); setRemoving(insurer) }}>
                  <Trash2 className="size-4" aria-hidden /> Retirer
                </Button>
              )}
            </li>
          ))}
        </ul>
      ))}
      <p className="text-xs text-muted-foreground">Le retrait d’un assureur conserve son nom dans les dossiers existants.</p>
    </Modal>
  )
}
