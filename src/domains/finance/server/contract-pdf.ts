import { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import CaisseSpecialePDF from '@/components/caisse-speciale/CaisseSpecialePDFV3'
import CaisseImprevuePDF from '@/components/caisse-imprevue/CaisseImprevuePDFV3'
import CreditPDF from '@/components/credit-speciale/AdhesionCreditSpecialeV3'
import CSQuittance from '@/components/contract/QuittanceCaisseSpecialePDF'
import CIQuittance from '@/components/caisse-imprevue/QuittanceCaisseImprevuePDF'
import CreditQuittance from '@/components/credit-speciale/QuittanceCreditSpecialePDF'
import type { FinanceModule } from '../actions'
import type { FinanceServices } from './services'
import { financeContractDetail } from './read-model'
export async function generateContractDocument(
  services: FinanceServices,
  module: FinanceModule,
  id: string,
  liquidation = false,
  blank = false,
) {
  const detail: any = await financeContractDetail(services, module, id)
  const ownerId = detail.record.memberId || detail.record.clientId
  const member =
    detail.member ||
    (ownerId
      ? await services.members.getMemberById(ownerId)
      : detail.group
        ? {
            lastName: detail.group.name,
            firstName: '',
            matricule: detail.record.groupeId,
            contacts: [],
          }
        : null)
  const guarantor = detail.record.guarantorId
    ? await services.members.getMemberById(detail.record.guarantorId)
    : null
  const logo = await readFile(resolve(process.cwd(), 'public/Logo-Kara.jpg'))
  const logoSrc = `data:image/jpeg;base64,${logo.toString('base64')}`
  const common = {
    logoSrc,
    contract: blank ? undefined : { ...detail.record, member },
    memberData: blank ? undefined : member,
    guarantorData: blank ? undefined : guarantor,
    refund: detail.refunds?.[0],
    totalAmountPaid: detail.stats?.totalAmountPaid,
  }
  const component: any =
    module === 'caisse-speciale'
      ? liquidation
        ? CSQuittance
        : CaisseSpecialePDF
      : module === 'caisse-imprevue'
        ? liquidation
          ? CIQuittance
          : CaisseImprevuePDF
        : liquidation
          ? CreditQuittance
          : CreditPDF
  // Credit templates require a record even for a blank version.
  if (module === 'credit-speciale' && blank)
    common.contract = {
      ...detail.record,
      clientFirstName: '',
      clientLastName: '',
      clientContacts: [],
      clientId: '',
      guarantorFirstName: '',
      guarantorLastName: '',
      guarantorId: undefined,
      member: undefined,
    }
  const buffer = await renderToBuffer(createElement<any>(component, common))
  return {
    base64: buffer.toString('base64'),
    mime: 'application/pdf',
    filename: `LE-KARA-${liquidation ? 'quittance' : 'contrat'}-${id}${blank ? '-vierge' : ''}.pdf`,
  }
}
