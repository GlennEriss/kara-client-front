'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Handshake, Loader2, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { User } from '@/types/types'
import type { GroupActor } from '@/domains/groups/group-service'
import { listGroupAgreements } from '@/domains/groups/agreements/agreement-service'
import {
  agreementBalance,
  agreementToday,
  AGREEMENT_STATUS_LABELS,
} from '@/domains/groups/agreements/agreement-model'
import { CreateGroupAgreementsDialog } from './CreateGroupAgreementsDialog'
import {
  GroupAgreementDetailDialog,
  agreementDateLabel,
  agreementMoney,
} from './GroupAgreementDetailDialog'

export default function GroupAgreements({
  groupId,
  members,
  actor,
  canManage,
}: {
  groupId: string
  members: User[]
  actor: GroupActor
  canManage: boolean
}) {
  const client = useQueryClient()
  const query = useQuery({
    queryKey: ['group-agreements', groupId],
    queryFn: () => listGroupAgreements(groupId),
    staleTime: 30_000,
  })
  const [create, setCreate] = useState(false)
  const [selected, setSelected] = useState<string | null>(() =>
    typeof window === 'undefined'
      ? null
      : new URLSearchParams(window.location.search).get('agreement'),
  )
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [party, setParty] = useState('')
  const [page, setPage] = useState(1)
  const items = (query.data || []).map((agreement) => ({
    agreement,
    balance: agreementBalance(agreement),
  }))
  const parties = [
    ...new Map(
      items.flatMap(
        ({ agreement: a }) =>
          [
            [a.creditorId, a.creditorName],
            [a.debtorId, a.debtorName],
          ] as [string, string][],
      ),
    ).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1], 'fr'))
  const followDate = (a: NonNullable<typeof query.data>[number]) => {
    const last = a.reminders.at(-1)
    return last?.plannedDate || last?.promiseDate
  }
  const filtered = items.filter(
    ({ agreement: a, balance: b }) =>
      `${a.title} ${a.creditorName} ${a.debtorName} ${a.creditorMatricule} ${a.debtorMatricule}`
        .toLocaleLowerCase('fr')
        .includes(search.toLocaleLowerCase('fr')) &&
      (!party || party === a.creditorId || party === a.debtorId) &&
      (filter === 'all' || filter === 'followup'
        ? filter === 'all' ||
          (b.remaining > 0 && !!followDate(a) && followDate(a)! <= agreementToday())
        : b.status === filter),
  )
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 12)))
  const agreement = query.data?.find((a) => a.id === selected)
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['group-agreements', groupId] }),
      client.invalidateQueries({ queryKey: ['group', groupId] }),
      client.invalidateQueries({ queryKey: ['groups'] }),
    ])
  }
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="!text-lg font-semibold text-[#234D65]">Accords entre membres</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Ventes, prestations et prêts entre les membres du groupe. Un échéancier par personne,
            sous le suivi de LE KARA.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Actualiser les accords"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
          </Button>
          {canManage && (
            <Button onClick={() => setCreate(true)}>
              <Plus className="h-4 w-4" />
              Créer des accords
            </Button>
          )}
        </div>
      </div>
      {query.isError ? (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          Impossible de charger les accords. Actualisez pour réessayer.
        </p>
      ) : query.isLoading ? (
        <p className="flex items-center gap-2 p-5 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des accords…
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Reste à payer par les membres', items.reduce((s, r) => s + r.balance.remaining, 0)],
              ['Dont échéances en retard', items.reduce((s, r) => s + r.balance.overdue, 0)],
              ['KARA : fonds à reverser', items.reduce((s, r) => s + r.balance.heldByKara, 0)],
            ].map(([label, amount]) => (
              <div key={String(label)} className="rounded-2xl border border-gray-100 bg-white p-4">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="mt-2 text-lg font-semibold text-[#234D65]">
                  {agreementMoney(Number(amount))}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              aria-label="Rechercher un accord"
              placeholder="Objet, membre ou bénéficiaire…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            <select
              aria-label="Filtrer par membre"
              className="h-10 min-w-0 rounded-md border px-3 text-sm sm:max-w-56"
              value={party}
              onChange={(e) => {
                setParty(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Tous les membres</option>
              {parties.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrer les accords par situation"
              className="h-10 rounded-md border px-3 text-sm"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="all">Toutes les situations</option>
              <option value="followup">Relance / promesse arrivée à date</option>
              {Object.entries(AGREEMENT_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {!filtered.length && (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <Handshake className="mx-auto mb-3 h-8 w-8 text-gray-400" />
              <p className="font-medium">
                {items.length
                  ? 'Aucun accord ne correspond à ces filtres.'
                  : 'Aucun accord entre membres pour ce groupe.'}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Un vendeur peut avoir plusieurs acheteurs ; chaque membre retrouve son propre suivi.
              </p>
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            {filtered
              .slice((currentPage - 1) * 12, currentPage * 12)
              .map(({ agreement: a, balance: b }) => (
                <button
                  key={a.id}
                  onClick={() => setSelected(a.id)}
                  className="rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition hover:border-[#CBB171] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#234D65]"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="font-semibold text-[#234D65]">{a.title}</h3>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${b.status === 'OVERDUE' ? 'bg-red-50 text-red-700' : b.status === 'PENDING_REMITTANCE' ? 'bg-amber-50 text-amber-800' : 'bg-gray-100 text-gray-700'}`}
                    >
                      {AGREEMENT_STATUS_LABELS[b.status]}
                    </span>
                  </div>
                  <p className="mt-3 text-sm">
                    {a.debtorName} <span className="text-gray-400">→</span> {a.creditorName}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <p className="text-gray-500">
                      Montant convenu
                      <br />
                      <strong className="text-gray-900">{agreementMoney(a.totalAmount)}</strong>
                    </p>
                    <p className="text-gray-500">
                      Reste à payer
                      <br />
                      <strong className={b.overdue > 0 ? 'text-red-700' : 'text-gray-900'}>
                        {agreementMoney(b.remaining)}
                      </strong>
                    </p>
                  </div>
                  {b.nextDue && (
                    <p className="mt-3 text-xs text-gray-500">
                      Échéance du {agreementDateLabel(b.nextDue.dueDate)} :{' '}
                      {agreementMoney(b.nextDue.remaining)}
                    </p>
                  )}
                  {b.heldByKara > 0 && (
                    <p className="mt-2 text-xs text-amber-800">
                      KARA doit encore remettre {agreementMoney(b.heldByKara)}
                    </p>
                  )}
                  {b.remaining > 0 && followDate(a) && (
                    <p className="mt-2 text-xs text-blue-700">
                      Suivi prévu le {agreementDateLabel(followDate(a)!)}
                    </p>
                  )}
                  <p className="mt-4 text-xs font-medium text-[#234D65]">
                    Voir l’échéancier et le suivi →
                  </p>
                </button>
              ))}
          </div>
          {filtered.length > 12 && (
            <div className="flex items-center justify-center gap-3 text-sm">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Précédent
              </Button>
              <span>
                {currentPage} / {Math.ceil(filtered.length / 12)} · {filtered.length} accords
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage * 12 >= filtered.length}
                onClick={() => setPage(currentPage + 1)}
              >
                Suivant
              </Button>
            </div>
          )}
        </>
      )}
      {create && canManage && (
        <CreateGroupAgreementsDialog
          groupId={groupId}
          members={members}
          actor={actor}
          onClose={() => setCreate(false)}
          onCreated={refresh}
        />
      )}
      {agreement && (
        <GroupAgreementDetailDialog
          key={agreement.id}
          agreement={agreement}
          members={members}
          actor={actor}
          canManage={canManage}
          onClose={() => setSelected(null)}
          onSaved={refresh}
        />
      )}
    </section>
  )
}
