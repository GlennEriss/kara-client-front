'use client'
import { VehicleLocationStats } from '@/components/vehicule/VehicleLocationStats'
import { vehicleLocationStats } from '@/domains/vehicles/location'
import { VehicleLocationFields } from '@/components/vehicule/VehicleLocationFields'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Car,
  Plus,
  MapPin,
  Phone,
  MessageCircle,
  Bell,
  History,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  prospectStatuses,
  prospectPhase,
  daysToExpiry,
  vehicleTypes,
  KARA_SPONSOR_ID,
  type InsuranceProspect,
  type ProspectInput,
} from './model'
import { InsuranceProspectRepository } from './repository'

type Operation =
  | 'create'
  | 'edit'
  | 'contacted'
  | 'quote_requested'
  | 'renewed_elsewhere'
  | 'lost'
  | 'assign'
  | 'converted'
  | 'history'
type Choice = { value: string; label: string }
const empty: ProspectInput = {
  ownerName: '',
  phone: '',
  whatsapp: '',
  plateNumber: '',
  vehicleType: 'car',
  vehicleDescription: '',
  city: '',
  communeId: '',
  districtId: '',
  quarterId: '',
  locationType: 'quarter',
  quarter: '',
  locationDetails: '',
  insuranceCompany: '',
  endDate: '',
  notes: '',
}
const labels: Record<Operation, string> = {
  create: 'Nouveau prospect',
  edit: 'Modifier le prospect',
  contacted: 'Enregistrer une relance',
  quote_requested: 'Demander une assurance LE KARA',
  renewed_elsewhere: 'Renouvelé ailleurs',
  lost: 'Clôturer comme perdu',
  assign: 'Attribuer le parrainage',
  converted: 'Rattacher l’assurance LE KARA',
  history: 'Historique du suivi',
}
export function ProspectsPage({
  actor,
  canCreate = true,
  canEdit = true,
  loadMembers,
  loadInsurances,
  insuranceCreateUrl,
}: {
  actor: { id: string; name: string; memberId?: string; admin: boolean }
  canCreate?: boolean
  canEdit?: boolean
  loadMembers?: (search: string) => Promise<Choice[]>
  loadInsurances?: (row: InsuranceProspect) => Promise<Choice[]>
  insuranceCreateUrl?: (row: InsuranceProspect) => string
}) {
  const client = useQueryClient(),
    repository = new InsuranceProspectRepository()
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState(''),
    [dueOnly, setDueOnly] = useState(false)
  const [selection, setSelection] = useState<{
    op: Operation
    row?: InsuranceProspect
  } | null>(null)
  const [values, setValues] = useState<Record<string, string>>({}),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const [memberSearch, setMemberSearch] = useState(''),
    [members, setMembers] = useState<Choice[]>([]),
    [memberBusy, setMemberBusy] = useState(false)
  const [insurances, setInsurances] = useState<Choice[]>([]),
    [history, setHistory] = useState<Record<string, unknown>[]>([])
  const query = useQuery({
    queryKey: ['insurance-prospects', actor.admin ? 'admin' : actor.memberId],
    queryFn: () =>
      repository.list(actor.admin ? undefined : [actor.id, actor.memberId!]),
    enabled: !!actor.id && (actor.admin || !!actor.memberId),
  })
  const all = query.data || [],
    openRows = all.filter((r) => !['converted', 'lost'].includes(r.status))
  const filtered = all.filter(
    (r) =>
      (!status || r.status === status) &&
      (!dueOnly ||
        (!['converted', 'lost'].includes(r.status) &&
          daysToExpiry(r.endDate) <= 30)) &&
      [
        r.plateNumber,
        r.ownerName,
        r.phone,
        r.city,
        r.quarter,
        r.locationDetails,
        r.sponsorName,
        r.insuranceCompany,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase()),
  )
  const [page, setPage] = useState(1),
    pageCount = Math.max(1, Math.ceil(filtered.length / 12)),
    currentPage = Math.min(page, pageCount)
  const open = async (op: Operation, row?: InsuranceProspect) => {
    setSelection({ op, row })
    setError('')
    setMembers([])
    setInsurances([])
    setHistory([])
    setMemberSearch('')
    setValues(
      op === 'edit' && row
        ? Object.fromEntries(
            Object.keys(empty).map((k) => [
              k,
              String(row[k as keyof InsuranceProspect] ?? ''),
            ]),
          )
        : {
            ...empty,
            sponsorMemberId:
              row?.sponsorMemberId ||
              (actor.admin ? KARA_SPONSOR_ID : actor.memberId || ''),
            insuranceCompany: row?.insuranceCompany || '',
            endDate: op === 'renewed_elsewhere' ? '' : row?.endDate || '',
            note: '',
            followUpDate: row?.followUpDate || '',
          },
    )
    if (op === 'history' && row) {
      setBusy(true)
      try {
        setHistory(await repository.history(row.id))
      } catch {
        setError('Historique indisponible')
      } finally {
        setBusy(false)
      }
    }
    if (op === 'converted' && row && loadInsurances) {
      setBusy(true)
      try {
        setInsurances(await loadInsurances(row))
      } catch {
        setError('Impossible de rechercher les assurances')
      } finally {
        setBusy(false)
      }
    }
  }
  const set = (key: string, value: string) =>
    setValues((v) => ({ ...v, [key]: value }))
  const input = (
    key: string,
    label: string,
    type = 'text',
    required = false,
  ) => (
    <label className="grid gap-2 text-sm font-medium" key={key}>
      {label}
      {required ? ' *' : ''}
      <Input
        aria-label={label}
        type={type}
        value={values[key] || ''}
        onChange={(e) => set(key, e.target.value)}
        required={required}
      />
    </label>
  )
  const choose = (
    key: string,
    label: string,
    options: Record<string, string>,
  ) => (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <select
        aria-label={label}
        value={values[key] || ''}
        onChange={(e) => set(key, e.target.value)}
        className="h-11 rounded-lg border bg-background px-3"
      >
        {Object.entries(options).map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  )
  const submit = async () => {
    if (!selection || busy) return
    setError('')
    setBusy(true)
    try {
      if (selection.op === 'create' || selection.op === 'edit') {
        const input = Object.fromEntries(
          Object.keys(empty).map((k) => [k, values[k] || '']),
        ) as ProspectInput
        if (input.locationType === 'quarter' && !input.quarterId) throw Error('Sélectionnez un quartier de Géographie.')
        if (selection.op === 'create')
          await repository.create(input, values.sponsorMemberId, actor)
        else await repository.change(selection.row!.id, actor, 'edit', input)
      } else if (selection.op !== 'history')
        await repository.change(selection.row!.id, actor, selection.op, values)
      await client.invalidateQueries({ queryKey: ['insurance-prospects'] })
      setSelection(null)
    } catch (e) {
      const issues = (e as { issues?: { message: string }[] }).issues
      setError(
        issues?.[0]?.message ||
          (e instanceof Error ? e.message : 'Opération impossible'),
      )
    } finally {
      setBusy(false)
    }
  }
  const sponsorField = (
    <div className="space-y-3 rounded-xl border p-4">
      <p className="font-medium">Parrainage</p>
      {choose('sponsorMemberId', 'Parrain', {
        [KARA_SPONSOR_ID]: 'LE KARA — Inconnu',
        ...(selection?.row && selection.row.sponsorMemberId !== KARA_SPONSOR_ID
          ? { [selection.row.sponsorMemberId]: selection.row.sponsorName }
          : {}),
        ...Object.fromEntries(members.map((m) => [m.value, m.label])),
      })}
      <div className="flex gap-2">
        <Input
          aria-label="Rechercher un membre"
          placeholder="Nom ou matricule du membre"
          value={memberSearch}
          onChange={(e) => setMemberSearch(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={memberBusy}
          onClick={async () => {
            setMemberBusy(true)
            setError('')
            try {
              setMembers((await loadMembers?.(memberSearch)) || [])
            } catch {
              setError('Recherche des membres impossible')
            } finally {
              setMemberBusy(false)
            }
          }}
        >
          {memberBusy ? 'Recherche…' : 'Rechercher'}
        </Button>
      </div>
    </div>
  )
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <VehicleLocationStats locations={vehicleLocationStats(openRows)} title="Prospection par quartier" />
      <header className="rounded-2xl bg-gradient-to-r from-[#234D65] to-[#2c5a73] p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Car />
              Prospection assurance
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/85">
              Suivez les véhicules assurés ailleurs et préparez leur prochaine
              assurance chez LE KARA.
            </p>
          </div>
          {canCreate && (
            <Button
              className="bg-white text-[#234D65] hover:bg-white/90"
              onClick={() => void open('create')}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouveau prospect
            </Button>
          )}
        </div>
      </header>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['À suivre', openRows.length],
          [
            'À contacter',
            openRows.filter((r) => daysToExpiry(r.endDate) <= 30).length,
          ],
          [
            'Demandes LE KARA',
            all.filter((r) => r.status === 'quote_requested').length,
          ],
          [
            'Assurés chez LE KARA',
            all.filter((r) => r.status === 'converted').length,
          ],
        ].map(([label, count]) => (
          <div className="rounded-xl border bg-card p-4" key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-[#234D65]">{count}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-4 text-sm">
        <p className="flex items-center gap-2 font-medium">
          <Bell className="h-4 w-4" />
          Rappels à J−30, J−15, J−7 et à l’échéance
        </p>
        <p className="mt-2 text-muted-foreground">
          À l’échéance, contactez le prospect puis enregistrez le résultat :
          assurance demandée, renouvellement ailleurs ou prospect perdu. Une
          assurance LE KARA doit être enregistrée et validée par
          l’administration pour clôturer le suivi comme assuré.
        </p>
        <details className="mt-4 border-t pt-3">
          <summary className="cursor-pointer font-semibold">
            Comment suivre un prospect ?
          </summary>
          <div className="mt-3 space-y-4 text-sm text-muted-foreground">
            <div>
              <h2 className="font-semibold text-foreground">
                1. Enregistrer le véhicule assuré ailleurs
              </h2>
              <p>
                Choisissez « Nouveau prospect ». Indiquez le contact, le
                téléphone, la plaque, l’assureur actuel et la fin de
                l’assurance. Précisez la ville et le quartier, ou choisissez «
                Autre emplacement » et décrivez le lieu. Le type de véhicule «
                Autre » doit aussi être précisé.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">
                2. Suivre les rappels et les relances
              </h2>
              <p>
                Les rappels sont prévus à J−30, J−15, J−7 et le jour
                d’expiration. Appelez le contact ou ouvrez WhatsApp, puis
                utilisez « Enregistrer une relance » avec le résultat et une
                éventuelle prochaine date. Les messages WhatsApp restent à
                envoyer manuellement.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">
                3. Enregistrer le résultat à l’échéance
              </h2>
              <p>
                Choisissez « Demander une assurance LE KARA » si le contact
                souhaite une prise en charge. S’il renouvelle ailleurs, utilisez
                « Renouvelé ailleurs » avec l’assureur et une nouvelle date de
                fin : les rappels repartiront sur cette date. Sinon, clôturez
                comme perdu avec un motif. L’historique reste consultable.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">
                Parrainage et assurance confirmée
              </h2>
              <p>
                {actor.admin
                  ? 'Vous pouvez attribuer le prospect à un membre ou à « LE KARA — Inconnu ». Pour le déclarer assuré chez LE KARA, enregistrez d’abord l’assurance dans Véhicules, puis utilisez « Rattacher l’assurance LE KARA » : elle doit être validée, de même plaque et parrain, couvrir une période après l’ancienne échéance et ne pas être liée à un autre prospect.'
                  : 'Vous suivez uniquement vos propres prospects et ceux que l’administration vous attribue. Vous pouvez demander leur prise en charge ; seule l’administration peut changer le parrain et rattacher une assurance réellement validée.'}
              </p>
            </div>
            <p>
              Un prospect n’est pas une assurance souscrite chez LE KARA.
              L’arrivée à échéance ne crée ni couverture ni commission. Les
              rappels de prospection s’arrêtent lorsque le dossier devient «
              Assuré chez LE KARA » ou « Prospect perdu ».
            </p>
          </div>
        </details>
      </div>
      <div className="flex flex-wrap gap-3">
        <Input
          className="min-w-48 flex-1"
          aria-label="Rechercher un prospect"
          placeholder="Plaque, contact, quartier, parrain…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <select
          aria-label="Statut des prospects"
          className="rounded-lg border bg-background px-3"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
        >
          <option value="">Tous les statuts</option>
          {Object.entries(prospectStatuses).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <Button
          variant={dueOnly ? 'default' : 'outline'}
          onClick={() => {
            setDueOnly(!dueOnly)
            setPage(1)
          }}
        >
          À contacter
        </Button>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Actualiser
        </Button>
      </div>
      {query.isPending ? (
        <p>Chargement des prospects…</p>
      ) : query.isError ? (
        <p role="alert">
          Impossible de charger les prospects.{' '}
          <Button onClick={() => void query.refetch()}>Réessayer</Button>
        </p>
      ) : !filtered.length ? (
        <p className="rounded-xl border p-8 text-center text-muted-foreground">
          Aucun prospect correspondant.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered
            .slice((currentPage - 1) * 12, currentPage * 12)
            .map((row) => {
              const closed = ['converted', 'lost'].includes(row.status)
              return (
                <article
                  key={row.id}
                  className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-bold">{row.plateNumber}</h2>
                      <p className="text-sm text-muted-foreground">
                        {row.ownerName} · {vehicleTypes[row.vehicleType]}
                      </p>
                    </div>
                    <span className="h-fit rounded-lg bg-[#234D65]/10 px-3 py-1 text-xs font-semibold text-[#234D65]">
                      {prospectPhase(row)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Assureur actuel
                      </p>
                      <p className="font-semibold">{row.insuranceCompany}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Fin de l’assurance
                      </p>
                      <p className="font-semibold">
                        {new Date(
                          `${row.endDate}T12:00:00Z`,
                        ).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <p className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {row.city} ·{' '}
                    {row.locationType === 'quarter'
                      ? row.quarter
                      : row.locationDetails}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Parrain : {row.sponsorName} · {prospectStatuses[row.status]}
                    {row.followUpDate
                      ? ` · Relance prévue : ${new Date(`${row.followUpDate}T12:00:00Z`).toLocaleDateString('fr-FR')}`
                      : ''}
                  </p>
                  {row.notes && <p className="text-sm">{row.notes}</p>}
                  <div className="flex flex-wrap gap-2">
                    <a
                      className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                      href={`tel:${row.phone}`}
                    >
                      <Phone className="h-4 w-4" />
                      {row.phone}
                    </a>
                    <a
                      className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                      href={`https://wa.me/${(row.whatsapp || row.phone).replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                    <Button
                      variant="outline"
                      onClick={() => void open('history', row)}
                    >
                      <History className="mr-2 h-4 w-4" />
                      Historique
                    </Button>
                  </div>
                  {!closed && canEdit && (
                    <div className="flex flex-wrap gap-2 border-t pt-3">
                      {(
                        [
                          'contacted',
                          'quote_requested',
                          'renewed_elsewhere',
                          'edit',
                          ...(actor.admin ? ['assign', 'converted'] : []),
                          'lost',
                        ] as Operation[]
                      ).map((op) => (
                        <Button
                          key={op}
                          variant={
                            op === 'quote_requested' ? 'default' : 'outline'
                          }
                          onClick={() => void open(op, row)}
                        >
                          {labels[op]}
                        </Button>
                      ))}
                    </div>
                  )}
                </article>
              )
            })}
        </div>
      )}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            Précédent
          </Button>
          <span>
            {currentPage} / {pageCount}
          </span>
          <Button
            variant="outline"
            disabled={currentPage >= pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            Suivant
          </Button>
        </div>
      )}
      <Dialog
        open={!!selection}
        onOpenChange={(v) => {
          if (!v && !busy) setSelection(null)
        }}
      >
        <DialogContent className="flex max-h-[90dvh] max-w-2xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b p-5">
            <DialogTitle>{selection && labels[selection.op]}</DialogTitle>
            <DialogDescription>
              {selection?.row
                ? `${selection.row.plateNumber} · ${selection.row.ownerName}`
                : 'Les données de prospection ne créent pas de contrat d’assurance.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto p-5">
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}
            {selection && ['create', 'edit'].includes(selection.op) && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {input('ownerName', 'Nom du contact', 'text', true)}
                  {input('phone', 'Téléphone', 'tel', true)}
                  {input('whatsapp', 'WhatsApp', 'tel')}
                  {input('plateNumber', 'Immatriculation', 'text', true)}
                  {choose('vehicleType', 'Type de véhicule', vehicleTypes)}
                  {values.vehicleType === 'other' &&
                    input(
                      'vehicleDescription',
                      'Précisez le véhicule',
                      'text',
                      true,
                    )}
                  <VehicleLocationFields value={{ ...values, locationType: values.locationType === 'other' ? 'other' : 'quarter' }} allowOther onChange={location => setValues({ ...values, ...location })} />
                  {input('insuranceCompany', 'Assureur actuel', 'text', true)}
                  {input(
                    'endDate',
                    'Fin de l’assurance actuelle',
                    'date',
                    true,
                  )}
                </div>
                <label className="grid gap-2 text-sm font-medium">
                  Notes
                  <Textarea
                    aria-label="Notes"
                    value={values.notes || ''}
                    onChange={(e) => set('notes', e.target.value)}
                  />
                </label>
                {actor.admin && selection.op === 'create' && sponsorField}
              </>
            )}
            {selection &&
              ['contacted', 'quote_requested'].includes(selection.op) &&
              input('followUpDate', 'Prochaine relance', 'date')}
            {selection?.op === 'renewed_elsewhere' && (
              <>
                {input('insuranceCompany', 'Nouvel assureur', 'text', true)}
                {input('endDate', 'Nouvelle fin de l’assurance', 'date', true)}
                <p className="text-sm text-muted-foreground">
                  Le prospect reste à suivre. Les rappels repartiront sur cette
                  nouvelle échéance.
                </p>
              </>
            )}
            {selection?.op === 'assign' && sponsorField}
            {selection?.op === 'converted' && (
              <>
                <p className="text-sm text-muted-foreground">
                  Choisissez une assurance validée pour la même plaque et le
                  même parrain.
                </p>
                {choose('insuranceId', 'Assurance LE KARA', {
                  '': 'Sélectionner une assurance',
                  ...Object.fromEntries(
                    insurances.map((i) => [i.value, i.label]),
                  ),
                })}
                {!busy && !insurances.length && (
                  <p className="text-sm">
                    Aucune assurance correspondante. Enregistrez d’abord la
                    nouvelle assurance dans le module Véhicules.
                  </p>
                )}
                {selection.row && insuranceCreateUrl && (
                  <a
                    className="block text-sm underline"
                    href={insuranceCreateUrl(selection.row)}
                  >
                    Enregistrer l’assurance dans le module Véhicules
                  </a>
                )}
              </>
            )}
            {selection &&
              !['create', 'edit', 'history'].includes(selection.op) && (
                <label className="grid gap-2 text-sm font-medium">
                  Résultat / motif *
                  <Textarea
                    aria-label="Résultat / motif"
                    value={values.note || ''}
                    onChange={(e) => set('note', e.target.value)}
                  />
                </label>
              )}
            {selection?.op === 'history' &&
              (busy ? (
                <p>Chargement…</p>
              ) : !history.length ? (
                <p>Aucune opération enregistrée.</p>
              ) : (
                history.map((item) => (
                  <div
                    key={String(item.id)}
                    className="space-y-1 rounded-xl border p-3"
                  >
                    <p className="text-sm font-semibold">
                      {(
                        {
                          created: 'Création',
                          edit: 'Modification',
                          contacted: 'Relance',
                          quote_requested: 'Demande d’assurance',
                          renewed_elsewhere: 'Renouvellement ailleurs',
                          assign: 'Attribution',
                          converted: 'Assurance LE KARA',
                          lost: 'Clôture du suivi',
                        } as Record<string, string>
                      )[String(item.kind)] || 'Suivi'}
                    </p>
                    <p className="text-sm">{String(item.note || '')}</p>
                    <p className="text-xs text-muted-foreground">
                      {String(item.byName || '')}
                      {item.at &&
                      typeof item.at === 'object' &&
                      'toDate' in item.at
                        ? ` · ${(item.at as { toDate: () => Date }).toDate().toLocaleString('fr-FR')}`
                        : ''}
                    </p>
                  </div>
                ))
              ))}
          </div>
          <DialogFooter className="border-t p-4">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setSelection(null)}
            >
              {selection?.op === 'history' ? 'Fermer' : 'Annuler'}
            </Button>
            {selection?.op !== 'history' && (
              <Button
                disabled={
                  busy || (selection?.op === 'converted' && !values.insuranceId)
                }
                onClick={() => void submit()}
              >
                {busy ? 'Enregistrement…' : 'Confirmer'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
