import { isCreditModule } from '../credit-module'
import { contractActionAvailable } from './contract-policy'
import { canWithAccess } from '@/domains/auth/access-policy'
import { mobileJson, requireMobileCaller } from '@/domains/mobile/server/access'
import type { NextRequest } from 'next/server'
import type { MobileCaller } from '@/domains/mobile/server/access'
import type { FinanceAction, FinanceModule, FinanceScope } from '../actions'
import type { FinanceServices } from './services'
import { readFinanceTarget } from './read-model'

export const financePermissionPrefix = (module: FinanceModule) =>
  ({
    'caisse-speciale': 'caisseSpeciale',
    'caisse-imprevue': 'caisseImprevue',
    'credit-speciale': 'creditSpeciale',
    'credit-fixe': 'creditFixe',
    'caisse-aide': 'creditAide',
  })[module]
export async function requireFinanceCaller(
  request: NextRequest,
  module: FinanceModule,
) {
  const caller = await requireMobileCaller(request)
  if ('status' in caller) return caller
  if (caller.mustChangePassword)
    return mobileJson(
      { error: 'Choisissez votre mot de passe personnel avant de continuer.' },
      403,
    )
  if (!canWithAccess(caller.access, `${financePermissionPrefix(module)}.view`))
    return mobileJson(
      { error: 'Vos permissions ne permettent pas d’ouvrir cette section.' },
      403,
    )
  // Recovery agents have deliberately restricted access to amounts and documents.
  if (caller.access.restrictedRole === 'AgentRecouvrement')
    return mobileJson(
      {
        error:
          'Le recouvrement reste accessible depuis le calendrier et les relances.',
      },
      403,
    )
  return caller
}
export function canFinanceAction(caller: MobileCaller, action: FinanceAction) {
  return (
    canWithAccess(caller.access, action.permission) &&
    (!action.superAdminOnly || caller.access.isSuperAdmin)
  )
}
export async function guardFinanceTarget(
  services: FinanceServices,
  module: FinanceModule,
  action: FinanceAction,
  id: string,
  data: Record<string, any>,
  caller: MobileCaller,
) {
  if (module === 'caisse-speciale' && data.caisseType) {
    if (
      data.caisseType.startsWith('JOURNALIERE') &&
      Number(data.monthsPlanned) > 12
    )
      throw new Error(
        'Une caisse journalière ne peut pas dépasser 12 périodes.',
      )
    if (
      data.caisseType.startsWith('LIBRE') &&
      Number(data.monthlyAmount) < 100000
    )
      throw new Error('Le minimum d’une caisse libre est de 100 000 FCFA.')
    if (data.memberId && data.caisseType.endsWith('_CHARITABLE')) {
      const summary = await services.db
        .collection('member-charity-summary')
        .doc(data.memberId)
        .get()
      if (summary.data()?.eligible !== true)
        throw new Error(
          'Le membre n’est pas éligible à une caisse charitable. Vérifiez sa contribution bienfaiteur.',
        )
    }
  }
  if (action.scope !== 'workspace') {
    const row = await readFinanceTarget(
      services,
      module,
      action.scope as FinanceScope,
      id,
    )
    if (
      action.scope === 'contract' &&
      !contractActionAvailable(module, row, action.id)
    )
      throw new Error(
        'Cette opération est indisponible : vérifiez le contrat signé et l’état du dossier.',
      )
    if (
      action.id === 'demand.delete' &&
      row.contractId &&
      !caller.access.isSuperAdmin
    )
      throw new Error(
        'Seul un superadmin peut supprimer une demande déjà convertie.',
      )
  } else if (id !== 'new')
    throw new Error('La création doit démarrer depuis la section concernée.')
  // The parent contract always comes from the authenticated route, never from a
  // child ID supplied by the client. Validate every cross-document selector.
  if (data.paymentId && isCreditModule(module)) {
    const items = await services.creditPayments.getPaymentsByCreditId(id)
    if (!items.some((item) => item.id === data.paymentId))
      throw new Error('Ce paiement ne relève pas du contrat.')
  }
  if (data.penaltyId) {
    const items = await services.creditPenalties.getPenaltiesByCreditId(id)
    if (!items.some((item) => item.id === data.penaltyId))
      throw new Error('Cette pénalité ne relève pas du contrat.')
  }
  if (data.guarantorPaymentId) {
    const items = await services.guarantorPayments.getPaymentsByCreditId(id)
    if (!items.some((item) => item.id === data.guarantorPaymentId))
      throw new Error('Ce paiement au garant ne relève pas du contrat.')
  }
  if (module === 'caisse-speciale' && action.id === 'payment.group') {
    const contract = await readFinanceTarget(services, module, 'contract', id)
    if (contract.contractType !== 'GROUP' || !contract.groupeId)
      throw new Error('Ce contrat est individuel.')
    const member = await services.db
      .collection('users')
      .doc(data.memberId)
      .get()
    if (!(member.data()?.groupIds || []).includes(contract.groupeId))
      throw new Error('Le membre sélectionné ne fait pas partie de ce groupe.')
  }
}
