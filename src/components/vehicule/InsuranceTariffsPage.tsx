'use client'

import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, FileText, Upload } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHero } from '@/components/ui/page-hero'

const endpoint = '/api/vehicules/baremes'

type Tariff = {
  id: string
  insurerId: string
  insurer: string
  assetTypeId: string
  assetType: string
  filename: string
  importedAt: string | null
}

async function readResponse<T>(response: Response): Promise<T> {
  const content = await response.json().catch(() => null)
  if (!response.ok || !content) throw Error(content?.error || 'Les barèmes sont indisponibles.')
  return content
}

const publishedDate = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Africa/Libreville',
})

function OpenTariff({ item }: { item: Tariff }) {
  return (
    <Button asChild variant="outline" size="sm">
      <a href={`${endpoint}?document=${encodeURIComponent(item.id)}`} target="_blank" rel="noopener noreferrer"
        aria-label={`Ouvrir ${item.filename}`}>
        Ouvrir le PDF <ExternalLink aria-hidden className="size-4" />
      </a>
    </Button>
  )
}

export function InsuranceTariffsPage() {
  const [insurer, setInsurer] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const query = useQuery({
    queryKey: ['insurance-tariffs'],
    queryFn: async ({ signal }) => readResponse<{ items: Tariff[]; canPublish: boolean }>(
      await fetch(endpoint, { signal, cache: 'no-store' }),
    ),
  })

  const insurers = new Map<string, string>()
  const assetTypes = new Map([['vehicules', 'Véhicules']])
  const tariffs = new Map<string, Tariff[]>()
  for (const tariff of query.data?.items ?? []) {
    const key = `${tariff.insurerId}:${tariff.assetTypeId}`
    if (!insurers.has(tariff.insurerId)) insurers.set(tariff.insurerId, tariff.insurer)
    if (!assetTypes.has(tariff.assetTypeId)) assetTypes.set(tariff.assetTypeId, tariff.assetType)
    const versions = tariffs.get(key) ?? []
    versions.push(tariff)
    tariffs.set(key, versions)
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (publishing) return
    const form = event.currentTarget
    setPublishing(true)
    setError('')
    setMessage('')
    try {
      const result = await readResponse<{ duplicate?: boolean }>(
        await fetch(endpoint, { method: 'POST', body: new FormData(form) }),
      )
      form.reset()
      setInsurer('')
      setMessage(result.duplicate ? 'Ce fichier figure déjà dans les barèmes.' : 'Barème publié.')
      await query.refetch()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Publication impossible.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <PageHero title="Barèmes des assureurs" subtitle="Consultez les PDF de référence par assureur et par type de bien." icon={FileText}
        action={
          <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
            <Link href="/vehicules"><ArrowLeft aria-hidden className="size-4" /> Assurances et prospections</Link>
          </Button>
        }
      />
      {query.data?.canPublish && (
        <form id="publier-bareme" onSubmit={publish} className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
          <h2 className="font-semibold">Publier un barème</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="tariff-insurer">Assureur</Label>
              <Input id="tariff-insurer" name="insurer" list="tariff-insurers" value={insurer}
                onChange={event => setInsurer(event.target.value)} placeholder="Saisir ou choisir un assureur" required maxLength={60}
                disabled={publishing} />
              <datalist id="tariff-insurers">
                {[...insurers].map(([id, name]) => <option key={id} value={name} />)}
              </datalist>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="tariff-asset-type">Type de bien</Label>
              <Input id="tariff-asset-type" name="assetType" list="tariff-asset-types"
                placeholder="Saisir ou choisir un type de bien" defaultValue="Véhicules"
                required maxLength={60} disabled={publishing} />
              <datalist id="tariff-asset-types">
                {[...assetTypes].map(([id, name]) => <option key={id} value={name} />)}
              </datalist>
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="tariff-pdf">Fichier PDF</Label>
              <Input className="h-11 cursor-pointer" id="tariff-pdf" name="file" type="file"
                accept="application/pdf,.pdf" required disabled={publishing} aria-describedby="tariff-size" />
              <p id="tariff-size" className="text-xs text-muted-foreground">10 Mo maximum</p>
            </div>
          </div>
          <Button type="submit" disabled={publishing}>
            <Upload aria-hidden className="size-4" /> {publishing ? 'Publication…' : 'Publier'}
          </Button>
          {message && <p className="text-sm text-emerald-700" role="status">{message}</p>}
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        </form>
      )}
      {query.isPending ? <p role="status">Chargement des barèmes…</p> : query.isError ? (
        <div role="alert" className="space-y-2 rounded-xl border p-4">
          <p>{query.error.message}</p>
          <Button variant="outline" onClick={() => void query.refetch()}>Réessayer</Button>
        </div>
      ) : tariffs.size === 0 ? <p className="rounded-xl border bg-card p-4">Aucun barème publié.</p> : (
        <div className="space-y-4">
          {[...tariffs.values()].sort(([a], [b]) => a.insurer.localeCompare(b.insurer, 'fr') || a.assetType.localeCompare(b.assetType, 'fr')).map(([current, ...previous]) => (
            <section key={`${current.insurerId}:${current.assetTypeId}`} className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold">{current.insurer} · {current.assetType}</h2>
                  <p className="break-all text-sm text-muted-foreground">{current.filename}</p>
                  {current.importedAt &&
                    <p className="text-xs text-muted-foreground">Publié le {publishedDate.format(new Date(current.importedAt))}</p>}
                </div>
                <OpenTariff item={current} />
              </div>
              {previous.length > 0 && (
                <details className="border-t pt-3">
                  <summary className="cursor-pointer text-sm font-medium">Versions précédentes ({previous.length})</summary>
                  <ul className="mt-3 divide-y">
                    {previous.map(item => (
                      <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div className="min-w-0 break-all text-sm">
                          {item.filename}
                          {item.importedAt && <p className="text-xs text-muted-foreground">{publishedDate.format(new Date(item.importedAt))}</p>}
                        </div>
                        <OpenTariff item={item} />
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
