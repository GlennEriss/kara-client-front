'use client'

import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Save, Table2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { insuranceAssetLabels } from '@/domains/vehicles/asset-types'
import type { TariffGrid, TariffGridInput } from '@/domains/vehicles/tariff-grid'

const endpoint = '/api/vehicules/baremes/grilles'
const ogarGridId = 'ogar--vehicules'
const vehicleTypes = ['car', 'van', 'motorcycle', 'bus', 'truck', 'machinery']
const money = new Intl.NumberFormat('fr-FR')
const updatedDate = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Libreville',
})
const selectStyle = 'h-11 w-full rounded-lg border border-input bg-background px-3 text-sm'
type Group = TariffGrid['groups'][number]

function newGroup(): Group {
  return {
    id: crypto.randomUUID(), label: 'Nouvelle catégorie', assetTypes: [],
    plans: ['1 an'], bands: [{ label: 'Tous', rates: [null] }],
  }
}

async function request<T>(options?: RequestInit): Promise<T> {
  const response = await fetch(endpoint, { cache: 'no-store', ...options })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result) throw Error(result?.error || 'Grilles indisponibles.')
  return result
}

function TariffMatrix({ group, update, automatic }: {
  group: Group
  update?: (group: Group) => void
  automatic: boolean
}) {
  function removePlan(column: number) {
    update?.({
      ...group,
      plans: group.plans.filter((_, index) => index !== column),
      bands: group.bands.map(band => ({ ...band, rates: band.rates.filter((_, index) => index !== column) })),
    })
  }

  return (
    <div className="min-w-0 space-y-4">
      {update && (
        <>
          <div className="space-y-2">
            <Label htmlFor="tariff-category-name">Nom de la catégorie</Label>
            <Input id="tariff-category-name" value={group.label} required maxLength={150}
              onChange={event => update({ ...group, label: event.target.value })} />
          </div>
          {automatic && (
            <fieldset className="flex flex-wrap gap-3 rounded-lg border p-3">
              <legend className="px-1 text-sm font-medium">Types de véhicules liés au simulateur</legend>
              {vehicleTypes.map(type => (
                <label key={type} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={group.assetTypes.includes(type)}
                    onChange={event => update({
                      ...group,
                      assetTypes: event.target.checked ? [...group.assetTypes, type] : group.assetTypes.filter(value => value !== type),
                    })} />
                  {insuranceAssetLabels[type]}
                </label>
              ))}
            </fieldset>
          )}
        </>
      )}
      <div tabIndex={0} role="region" aria-label="Grille des primes en FCFA" className="overflow-x-auto rounded-xl border">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Primes en FCFA pour {group.label}</caption>
          <thead className="bg-muted text-left">
            <tr>
              <th scope="col" className="min-w-44 p-3">Caractéristiques</th>
              {group.plans.map((plan, column) => (
                <th key={column} scope="col" className="min-w-32 p-3">
                  {update ? (
                    <div className="flex items-center gap-1">
                      <Input aria-label={`Durée ou option ${column + 1}`} required maxLength={150} value={plan}
                        onChange={event => update({ ...group, plans: group.plans.map((value, index) => index === column ? event.target.value : value) })} />
                      {group.plans.length > 1 && <Button type="button" size="icon" variant="ghost"
                        aria-label={`Retirer la colonne ${plan}`} onClick={() => removePlan(column)}><Trash2 aria-hidden className="size-4" /></Button>}
                    </div>
                  ) : plan}
                </th>
              ))}
              {update && group.bands.length > 1 && <th scope="col" className="sr-only">Action</th>}
            </tr>
          </thead>
          <tbody>
            {group.bands.map((band, row) => (
              <tr key={row} className="border-t odd:bg-card even:bg-muted/30">
                <th scope="row" className="p-3 text-left font-medium">
                  {update ? <Input aria-label={`Caractéristiques de la ligne ${row + 1}`} required maxLength={150}
                    value={band.label} onChange={event => update({
                      ...group,
                      bands: group.bands.map((value, index) => index === row ? { ...value, label: event.target.value } : value),
                    })} /> : band.label}
                </th>
                {band.rates.map((rate, column) => (
                  <td key={column} className="p-3 text-right tabular-nums">
                    {update ? <Input aria-label={`Prime · ${band.label} · ${group.plans[column]}`} type="number" min={1}
                      step={1} value={rate ?? ''} className="min-w-24 text-right"
                      onChange={event => update({
                        ...group,
                        bands: group.bands.map((value, index) => index === row ? {
                          ...value,
                          rates: value.rates.map((current, cell) =>
                            cell === column ? (event.target.value === '' ? null : event.target.valueAsNumber) : current),
                        } : value),
                      })} /> : rate === null ? '—' : money.format(rate)}
                  </td>
                ))}
                {update && group.bands.length > 1 && <td className="p-2">
                  <Button type="button" size="icon" variant="ghost" aria-label={`Retirer la ligne ${band.label}`}
                    onClick={() => update({ ...group, bands: group.bands.filter((_, index) => index !== row) })}>
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                </td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {update && <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={group.bands.length >= 30}
          onClick={() => update({ ...group, bands: [...group.bands, { label: '', rates: group.plans.map(() => null) }] })}>
          <Plus aria-hidden className="size-4" /> Ajouter une ligne
        </Button>
        <Button type="button" variant="outline" disabled={group.plans.length >= 16}
          onClick={() => update({
            ...group, plans: [...group.plans, ''],
            bands: group.bands.map(band => ({ ...band, rates: [...band.rates, null] })),
          })}>
          <Plus aria-hidden className="size-4" /> Ajouter une durée ou option
        </Button>
      </div>}
    </div>
  )
}

export function InsuranceTariffGrids() {
  const client = useQueryClient()
  const grids = useQuery({
    queryKey: ['insurance-tariff-grids'],
    queryFn: ({ signal }) => request<{ items: TariffGrid[]; canEdit: boolean }>({ signal }),
  })
  const [selected, setSelected] = useState(ogarGridId)
  const [category, setCategory] = useState('')
  const [draft, setDraft] = useState<TariffGridInput | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const active = grids.data?.items.find(item => item.id === selected)
  const visible = draft ?? active
  const group = visible?.groups.find(item => item.id === category) ?? visible?.groups[0]
  const editingNew = draft?.revision === null

  function openDraft(value: TariffGridInput) {
    setError('')
    setMessage('')
    setDraft(value)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!draft || saving) return
    setSaving(true)
    setError('')
    try {
      const { id } = await request<{ id: string }>({
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft),
      })
      await grids.refetch()
      await client.invalidateQueries({ queryKey: ['insurance-tariff-simulation'] })
      setSelected(id)
      setDraft(null)
      setMessage('Grille enregistrée.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section id="grille-tarifaire" aria-labelledby="tariff-grid-title" className="scroll-mt-24 space-y-4 rounded-2xl border bg-card p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="tariff-grid-title" className="flex items-center gap-2 text-lg font-semibold">
            <Table2 aria-hidden className="size-5 text-primary" /> Grilles tarifaires
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Primes en FCFA par assureur, type de bien et catégorie.</p>
        </div>
        {grids.data?.canEdit && !draft && <Button type="button" variant="outline"
          onClick={() => { setCategory(''); openDraft({ revision: null, insurer: '', assetType: '', groups: [newGroup()] }) }}>
          <Plus aria-hidden className="size-4" /> Ajouter une grille
        </Button>}
      </header>
      {grids.isPending && <p role="status">Chargement des grilles…</p>}
      {grids.isError && <div role="alert" className="space-y-2">
        <p>{grids.error.message}</p>
        <Button variant="outline" onClick={() => void grids.refetch()}>Réessayer</Button>
      </div>}
      <form onSubmit={save}>
        <fieldset disabled={saving} className="min-w-0 space-y-4">
          {editingNew && draft ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="new-grid-insurer">Assureur</Label>
                <Input id="new-grid-insurer" required maxLength={60} value={draft.insurer}
                  onChange={event => setDraft({ ...draft, insurer: event.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="new-grid-asset">Type de bien</Label>
                <Input id="new-grid-asset" required maxLength={60} value={draft.assetType}
                  onChange={event => setDraft({ ...draft, assetType: event.target.value })} /></div>
            </div>
          ) : grids.data && (
            <div className="space-y-2">
              <Label htmlFor="tariff-grid">Assureur et type de bien</Label>
              <select id="tariff-grid" className={selectStyle} value={selected} disabled={!!draft}
                onChange={event => { setSelected(event.target.value); setCategory(''); setMessage('') }}>
                {grids.data.items.map(item => <option key={item.id} value={item.id}>{item.insurer} · {item.assetType}</option>)}
              </select>
              {active?.updatedAt && <p className="text-xs text-muted-foreground">
                Dernière mise à jour le {updatedDate.format(new Date(active.updatedAt))}
              </p>}
            </div>
          )}
          {visible && group && (
            <>
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-48 flex-1 space-y-2">
                  <Label htmlFor="tariff-grid-category">Catégorie</Label>
                  <select id="tariff-grid-category" className={selectStyle} value={group.id}
                    onChange={event => setCategory(event.target.value)}>
                    {visible.groups.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                </div>
                {draft && <Button type="button" variant="outline" disabled={draft.groups.length >= 40} onClick={() => {
                  const next = newGroup()
                  setDraft({ ...draft, groups: [...draft.groups, next] })
                  setCategory(next.id)
                }}><Plus aria-hidden className="size-4" /> Ajouter une catégorie</Button>}
                {draft && draft.groups.length > 1 && <Button type="button" variant="outline"
                  onClick={() => setDraft({ ...draft, groups: draft.groups.filter(item => item.id !== group.id) })}>
                  <Trash2 aria-hidden className="size-4" /> Retirer la catégorie
                </Button>}
                {!draft && active && grids.data?.canEdit && <Button type="button" variant="outline"
                  onClick={() => openDraft(active)}><Pencil aria-hidden className="size-4" /> Modifier la grille</Button>}
              </div>
              <TariffMatrix group={group} automatic={selected === ogarGridId && !editingNew}
                update={draft ? updated => setDraft({ ...draft, groups: draft.groups.map(item => item.id === group.id ? updated : item) }) : undefined} />
            </>
          )}
          {draft && <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button type="submit"><Save aria-hidden className="size-4" /> {saving ? 'Enregistrement…' : 'Enregistrer la grille'}</Button>
            <Button type="button" variant="ghost" onClick={() => { setDraft(null); setError('') }}>Annuler</Button>
          </div>}
          {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </fieldset>
      </form>
    </section>
  )
}
