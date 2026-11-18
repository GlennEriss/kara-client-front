import { isCreditModule, creditTypeForModule } from '../credit-module'
import { firebaseCollectionNames as names } from '@/constantes/firebase-collection-names'
import { fromFirestore } from '@/domains/mobile/server/calendar-service'
import { computeCreditInstallments } from '@/utils/credit-installments'
import {
  withBusinessDates,
  businessWallTime,
} from '@/domains/mobile/server/calendar-dates'
import { mapWithConcurrency } from '@/utils/mapWithConcurrency'
import type { CreditContract, CreditPayment } from '@/types/types'
import type { FinanceModule, FinanceScope } from '../actions'
import type { FinanceServices } from './services'

export function financeCollection(module: FinanceModule, scope: FinanceScope) {
  if (scope === 'settings')
    return module === 'caisse-imprevue'
      ? names.subscriptionsCI
      : names.caisseSettings
  return {
    'caisse-speciale':
      scope === 'demand' ? names.caisseSpecialeDemands : names.caisseContracts,
    'caisse-imprevue':
      scope === 'demand' ? names.caisseImprevueDemands : names.contractsCI,
    'credit-speciale':
      scope === 'demand' ? names.creditDemands : names.creditContracts,
    'credit-fixe':
      scope === 'demand' ? names.creditDemands : names.creditContracts,
    'caisse-aide':
      scope === 'demand' ? names.creditDemands : names.creditContracts,
  }[module]
}
export async function readFinanceTarget(
  services: FinanceServices,
  module: FinanceModule,
  scope: FinanceScope,
  id: string,
): Promise<Record<string, any>> {
  const snapshot = await services.db
    .collection(financeCollection(module, scope))
    .doc(id)
    .get()
  if (!snapshot.exists) throw new Error('Le dossier demandé est introuvable.')
  const row: Record<string, any> = {
    ...(fromFirestore(snapshot.data()) as Record<string, any>),
    id: snapshot.id,
  }
  if (isCreditModule(module) && row.creditType !== creditTypeForModule(module))
    throw new Error('Ce dossier ne relève pas de cette section de crédit.')
  return row
}
const fullName = (row: any) =>
  `${row?.firstName || ''} ${row?.lastName || ''}`.trim()
export async function enrichFinanceRows(
  services: FinanceServices,
  module: FinanceModule,
  rows: Record<string, any>[],
): Promise<Record<string, any>[]> {
  const members = new Map<string, Promise<any>>()
  return mapWithConcurrency(rows, 6, async (row) => {
    const id = String(row.memberId || row.clientId || '')
    let name =
      `${row.memberFirstName || row.clientFirstName || ''} ${row.memberLastName || row.clientLastName || ''}`.trim()
    let member: any = null
    if (id) {
      if (!members.has(id)) members.set(id, services.members.getMemberById(id))
      member = await members.get(id)
      if (!name) name = fullName(member)
    }
    if (!name && row.groupeId) {
      const group = await services.db
        .collection(names.groups)
        .doc(row.groupeId)
        .get()
      name = String(group.data()?.name || 'Groupe KARA')
    }
    return {
      ...row,
      memberName: name || row.label || row.code || 'Dossier KARA',
      memberContacts:
        row.memberContacts || row.clientContacts || member?.contacts || [],
      memberPhotoUrl: row.memberPhotoUrl || member?.photoURL || null,
      module,
    }
  })
}
export interface FinanceListInput {
  kind: 'contracts' | 'demands' | 'settings'
  search: string
  status?: string
  cursor?: string
  limit: number
  page: number
  type?: string
}
export async function listFinanceRows(
  services: FinanceServices,
  module: FinanceModule,
  input: FinanceListInput,
) {
  const scope =
    input.kind === 'demands'
      ? 'demand'
      : input.kind === 'settings'
        ? 'settings'
        : 'contract'
  if (isCreditModule(module) && scope === 'settings')
    throw new Error('Cette section de crédit ne dispose pas de forfaits de caisse.')
  if (module === 'caisse-speciale' && scope === 'contract') {
    const result = await services.csContractService.getContractsWithFilters(
      {
        search: input.search,
        status: input.status as any,
        caisseType: input.type as any,
      },
      { limit: input.limit, cursor: input.cursor },
    )
    return {
      ...result,
      items: await enrichFinanceRows(services, module, result.items),
    }
  }
  if (module === 'caisse-speciale' && scope === 'demand') {
    const result = await services.caisseSpeciale.getDemandsWithFilters({
      search: input.search,
      status: input.status as any,
      page: input.page,
      limit: input.limit,
      caisseType: input.type as any,
    })
    return {
      items: await enrichFinanceRows(services, module, result.items),
      total: result.total,
      nextCursor:
        input.page * input.limit < result.total
          ? String(result.items.at(-1)?.id)
          : null,
    }
  }
  if (module === 'caisse-imprevue' && scope === 'demand') {
    const result = await services.ciDemandService.getPaginatedDemands(
      {
        searchQuery: input.search,
        status: input.status as any,
        paymentFrequency: input.type as any,
      },
      { limit: input.limit, page: input.page, cursor: input.cursor },
      { sortBy: 'date', sortOrder: 'desc' },
    )
    return {
      items: await enrichFinanceRows(services, module, result.items),
      total: result.pagination.total,
      nextCursor: result.pagination.nextCursor || null,
    }
  }
  // Existing repositories perform the same search and business filters as the site.
  // Cursor slicing happens after those filters for repositories without cursor APIs.
  let rows: Record<string, any>[]
  if (isCreditModule(module) && scope === 'demand')
    rows = await services.creditSpeciale.getDemandsWithFilters({
      search: input.search,
      status: input.status as any,
      creditType: creditTypeForModule(module),
    })
  else if (isCreditModule(module))
    rows = await services.creditSpeciale.getContractsWithFilters({
      search: input.search,
      status: input.status as any,
      creditType: creditTypeForModule(module),
    })
  else if (scope === 'settings')
    rows =
      module === 'caisse-imprevue'
        ? await services.caisseImprevue.getAllSubscriptions()
        : await services.csSettings.listSettings()
  else
    rows = await services.ciContracts.getContractsWithFilters(
      {
        search: input.search,
        status: input.status as any,
        paymentFrequency: input.type as any,
      },
      { throwOnError: true },
    )
  const total = rows.length
  const start = input.cursor
    ? rows.findIndex((row) => row.id === input.cursor) + 1
    : 0
  if (input.cursor && start === 0)
    throw new Error('La liste a changé. Actualisez les dossiers.')
  const page = rows.slice(start, start + input.limit)
  return {
    items: await enrichFinanceRows(services, module, page),
    total,
    nextCursor: start + input.limit < total ? String(page.at(-1)?.id) : null,
  }
}
export async function financeContractDetail(
  services: FinanceServices,
  module: FinanceModule,
  id: string,
) {
  const record = await readFinanceTarget(services, module, 'contract', id)
  if (module === 'caisse-speciale') {
    const [payments, refunds, documents, member, group] = await Promise.all([
      services.csPayments.listPayments(id),
      services.csRefunds.listRefunds(id),
      services.documents.getDocumentsByContractId(id),
      record.memberId ? services.members.getMemberById(record.memberId) : null,
      record.groupeId
        ? services.db
            .collection(names.groups)
            .doc(record.groupeId)
            .get()
            .then((s) => s.data())
        : null,
    ])
    return {
      record: (await enrichFinanceRows(services, module, [record]))[0],
      payments,
      refunds,
      documents,
      member,
      group,
      declarations: await services.csRefunds.listDeclaredVersementsCS(id),
      contributions: payments.flatMap((payment: any) =>
        (payment.contribs || payment.groupContributions || []).map(
          (item: any) => ({
            ...item,
            paymentId: payment.id,
            month: payment.dueMonthIndex + 1,
          }),
        ),
      ),
    }
  }
  if (module === 'caisse-imprevue') {
    const [payments, refunds, supports, documents, stats] = await Promise.all([
      services.caisseImprevue.getPaymentsByContractId(id),
      services.ciRefunds.getEarlyRefundsByContractId(id),
      services.caisseImprevue.getSupportHistory(id),
      services.documents.getDocumentsByContractId(id),
      services.caisseImprevue.getContractPaymentStats(id),
    ])
    return {
      record: (await enrichFinanceRows(services, module, [record]))[0],
      payments,
      refunds,
      supports,
      documents,
      stats,
      declarations: await services.csRefunds.listDeclaredVersementsCI(id),
      versements: payments.flatMap((payment) =>
        payment.versements.map((item) => ({
          ...item,
          month: payment.monthIndex + 1,
          paymentId: payment.id,
        })),
      ),
    }
  }
  const [
    payments,
    penalties,
    remunerations,
    guarantorPayments,
    documents,
    extensionEligibility,
  ] = await Promise.all([
    services.creditSpeciale.getPaymentsByCreditId(id),
    services.creditSpeciale.getPenaltiesByCreditId(id),
    module === 'credit-speciale'
      ? services.creditSpeciale.getRemunerationsByCreditId(id)
      : Promise.resolve([]),
    module === 'credit-speciale'
      ? services.creditSpeciale.getGuarantorPaymentsByCreditId(id)
      : Promise.resolve([]),
    services.documents.getDocumentsByContractId(id),
    module === 'credit-speciale'
      ? services.creditSpeciale.checkExtensionEligibility(id)
      : Promise.resolve(undefined),
  ])
  const installments = computeCreditInstallments(
    withBusinessDates(record) as CreditContract,
    withBusinessDates(payments) as CreditPayment[],
    businessWallTime(new Date()),
  )
  return {
    record: (await enrichFinanceRows(services, module, [record]))[0],
    payments,
    penalties,
    ...(module === 'credit-speciale'
      ? { remunerations, guarantorPayments, extensionEligibility }
      : {}),
    documents,
    installments,
  }
}
