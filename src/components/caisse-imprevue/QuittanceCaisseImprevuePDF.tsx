'use client'

import { buildMemberContractRow, buildMemberIdentificationRows, type MemberIdentitySource } from '@/components/pdf/mutuelle/memberIdentification'
import { Document, Page, Text } from '@react-pdf/renderer'
import React from 'react'

import {
  EMPTY,
  FieldTable,
  MutuelleHeader,
  MutuellePageChrome,
  MutuelleSection,
  MutuelleSignatures,
  collectDocumentFields,
  display,
  documentPlace,
  field,
  formatAmount,
  formatDate,
  mutuelleStyles as styles,
  numberToWords,
  readField,
  toDate,
  type DocumentCompletion,
  type DocumentField,
  type FieldRow,
} from '@/components/pdf/mutuelle/MutuelleDocumentKit'
import { getContractEndDate } from '@/utils/caisse-imprevue-utils'

/**
 * Procès-verbal de liquidation du contrat de Caisse Imprévue. Ce document est
 * distinct de la quittance d'allocation de
 * secours : il constate la restitution liée à un contrat arrivé à son terme
 * ou clôturé par retrait anticipé.
 */

const paymentModeLabel = (refund?: Record<string, unknown>): string => {
  if (typeof refund?.paymentMethodOther === 'string' && refund.paymentMethodOther.trim()) {
    return refund.paymentMethodOther.trim()
  }

  switch (refund?.withdrawalMode) {
    case 'cash': return 'Espèces'
    case 'bank_transfer': return 'Virement bancaire'
    case 'airtel_money': return 'Airtel Money'
    case 'mobicash': return 'Mobicash'
    default: return ''
  }
}

const contractEndDate = (contract: Record<string, unknown>): Date | null =>
  getContractEndDate({
    firstPaymentDate: contract.firstPaymentDate,
    paymentFrequency: typeof contract.paymentFrequency === 'string' ? contract.paymentFrequency : null,
    subscriptionCIDuration: typeof contract.subscriptionCIDuration === 'number'
      ? contract.subscriptionCIDuration
      : Number(contract.subscriptionCIDuration ?? 0),
  })

const frequencyLabel = (frequency?: unknown): string =>
  frequency === 'DAILY' ? 'Quotidienne' : frequency === 'MONTHLY' ? 'Mensuelle' : ''

export interface QuittanceCaisseImprevuePdfFillData {
  secretarySignature: string | null
  memberSignature: string | null
}

interface LiquidationMemberData extends MemberIdentitySource {
  id?: string
  matricule?: string
  lastName?: string
  firstName?: string
  contacts?: string[]
  identityDocumentNumber?: string
}

const DEFAULT_FILL_DATA: QuittanceCaisseImprevuePdfFillData = {
  secretarySignature: null,
  memberSignature: null,
}

type CaisseImprevueLiquidationInput = {
  contract?: Record<string, unknown>
  refund?: Record<string, unknown>
  memberData?: LiquidationMemberData | null
  totalAmountPaid?: number
}

/** Champs du procès-verbal, partagés avec la modale pour la saisie des informations manquantes. */
export const buildCaisseImprevueLiquidationFields = ({
  contract: inputContract,
  refund,
  memberData,
  totalAmountPaid,
}: CaisseImprevueLiquidationInput) => {
  const contract = (inputContract ?? {}) as Record<string, unknown>
  const contacts = Array.isArray(memberData?.contacts)
    ? memberData.contacts
    : Array.isArray(contract.memberContacts) ? contract.memberContacts : []
  const optionalDate = (value: unknown) => (toDate(value) ? formatDate(value) : '')
  const nominal = Number(refund?.amountNominal ?? totalAmountPaid ?? 0)
  // Le procès-verbal ne porte que le montant nominal : le bonus n'y figure pas.
  const amountPaid = nominal
  const liquidationType = refund?.type === 'EARLY' ? 'Retrait anticipé et clôture du contrat' : 'Remboursement final à l’échéance'
  const paidDate = field(
    'refund.paidDate',
    'Date du règlement :',
    optionalDate(refund?.paidAt ?? refund?.withdrawalDate ?? refund?.processedAt),
    'date',
  )

  return {
    amountPaid,
    member: [
      // Identification identique à la fiche d'adhésion, puis le contrat.
      ...buildMemberIdentificationRows({
        lastName: memberData?.lastName ?? (contract.memberLastName as string),
        firstName: memberData?.firstName ?? (contract.memberFirstName as string),
        birthDate: memberData?.birthDate,
        birthPlace: memberData?.birthPlace,
        identityDocumentNumber: memberData?.identityDocumentNumber,
        identityDocumentIssuingDate: memberData?.identityDocumentIssuingDate,
        address: memberData?.address,
        contacts: contacts as string[],
        whatsappNumber: memberData?.whatsappNumber,
        email: memberData?.email,
        profession: memberData?.profession,
        companyName: memberData?.companyName,
      }),
      buildMemberContractRow(memberData?.matricule ?? memberData?.id ?? contract.memberId, contract.id),
      [
        field('contract.formula', 'Formule de Caisse Imprévue :', contract.subscriptionCILabel ?? contract.subscriptionCICode),
        field('contract.frequency', 'Fréquence de cotisation :', frequencyLabel(contract.paymentFrequency)),
      ],
      [
        field('contract.startDate', 'Date de début :', optionalDate(contract.firstPaymentDate), 'date'),
        field('contract.endDate', 'Date de fin :', optionalDate(contractEndDate(contract)), 'date'),
      ],
      [
        field('contract.duration', 'Durée du contrat :', contract.subscriptionCIDuration ? `${contract.subscriptionCIDuration} mois` : ''),
        field('signer.role', 'Qualité du signataire :', 'Membre / Réceptionnaire'),
      ],
    ] as FieldRow[],
    liquidation: [
      [field('refund.type', 'Nature de la liquidation :', liquidationType), paidDate],
      [
        field('contract.totalPaid', 'Total des cotisations enregistrées :', `${formatAmount(totalAmountPaid ?? nominal)} FCFA`),
        field('refund.paymentMode', 'Mode de règlement :', paymentModeLabel(refund)),
      ],
      [
        field('refund.amountDigits', 'Montant nominal remis au membre (en chiffres) :', `${formatAmount(amountPaid)} FCFA`),
        field('refund.amountWords', 'Montant nominal remis au membre (en lettres) :', `${numberToWords(amountPaid)} francs CFA`),
      ],
    ] as FieldRow[],
    paidDate,
  }
}

export const listCaisseImprevueLiquidationFields = (input: CaisseImprevueLiquidationInput): DocumentField[] => {
  const { member, liquidation } = buildCaisseImprevueLiquidationFields(input)
  return collectDocumentFields({ member, liquidation })
}

const QuittanceCaisseImprevuePDF = ({
  contract,
  refund,
  memberData,
  totalAmountPaid,
  fillData,
  completion,
}: CaisseImprevueLiquidationInput & {
  fillData?: QuittanceCaisseImprevuePdfFillData
  completion?: DocumentCompletion | null
}) => {
  const signatures = fillData ?? DEFAULT_FILL_DATA
  const fields = buildCaisseImprevueLiquidationFields({ contract, refund, memberData, totalAmountPaid })
  const memberName = readField(fields.member[0][0], completion)
  const paidDate = readField(fields.paidDate, completion) || EMPTY
  const amountPaid = fields.amountPaid

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <MutuellePageChrome footerLabel="Procès-verbal de liquidation du contrat de Caisse Imprévue" />
        <MutuelleHeader title="PROCÈS-VERBAL DE LIQUIDATION DU CONTRAT DE CAISSE IMPRÉVUE" />

        <Text style={styles.preamble}>
          Ce document constate la liquidation du contrat de Caisse Imprévue identifié ci-dessous et
          le versement au membre du montant arrêté. Conformément à la loi n°35/62 du 10 décembre
          1962 relative aux associations, aux statuts de LE KARA et aux conditions du contrat, ce
          règlement atteste des sommes effectivement remises au membre.
        </Text>

        <MutuelleSection title="1. IDENTIFICATION DU MEMBRE ET DU CONTRAT">
          <FieldTable rows={fields.member} completion={completion} />
        </MutuelleSection>

        <MutuelleSection title="2. LIQUIDATION FINANCIÈRE DU CONTRAT">
          <Text style={styles.paragraph}>
            Le Comité Exécutif certifie avoir vérifié les versements enregistrés et arrêté la
            liquidation suivante :
          </Text>
          <FieldTable rows={fields.liquidation} completion={completion} />
        </MutuelleSection>

        <MutuelleSection title="3. DÉCLARATION DE DÉCHARGE ET D’ACQUITTEMENT">
          <Text style={styles.paragraph}>
            Je soussigné(e), <Text style={styles.bold}>{display(memberName)}</Text>, reconnais avoir
            reçu de l’Association de Secours Mutuel LE KARA la somme indiquée ci-dessus au titre de
            la liquidation de mon contrat de Caisse Imprévue.
          </Text>
          <Text style={styles.paragraph}>
            Je confirme que ce règlement correspond aux sommes effectivement remises et que le
            présent procès-verbal atteste de la clôture financière du contrat, conformément aux
            conditions contractuelles et aux statuts de LE KARA.
          </Text>
          <Text style={styles.paragraph}>Fait à {documentPlace(completion)}, le {paidDate}</Text>
          <Text style={styles.note}>
            (Inscrire la mention manuscrite « Reçu la somme de {formatAmount(amountPaid)} FCFA au
            titre de la liquidation du contrat de Caisse Imprévue pour solde de tout compte »)
          </Text>

          <MutuelleSignatures
            memberTitle="Le Membre / Réceptionnaire"
            memberName={memberName}
            memberSignature={signatures.memberSignature}
            committeeRole="Le Financier Général / Le Secrétaire Exécutif"
            committeeSignature={signatures.secretarySignature}
          />
        </MutuelleSection>
      </Page>
    </Document>
  )
}

export default QuittanceCaisseImprevuePDF
