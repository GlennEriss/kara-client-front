'use client'

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
  fullNameFrom,
  mutuelleStyles as styles,
  numberToWords,
  readField,
  toDate,
  type DocumentCompletion,
  type DocumentField,
  type FieldRow,
} from '@/components/pdf/mutuelle/MutuelleDocumentKit'
import { resolveContractEndAt } from '@/services/caisse/contractDates'
import { Document, Page, Text } from '@react-pdf/renderer'
import React from 'react'

/**
 * Procès-verbal de liquidation du contrat de Caisse Spéciale (modèle
 * LIQUIDATION.docx, comme la Caisse Imprévue). Il constate la restitution liée
 * à un contrat arrivé à son terme ou clôturé par retrait anticipé, et n'est
 * établi qu'une fois le remboursement réglé.
 */

const CAISSE_TYPE_LABELS: Record<string, string> = {
  STANDARD: 'Standard',
  JOURNALIERE: 'Journalière',
  LIBRE: 'Libre',
  STANDARD_CHARITABLE: 'Standard charitable',
  JOURNALIERE_CHARITABLE: 'Journalière charitable',
  LIBRE_CHARITABLE: 'Libre charitable',
}

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

export interface QuittanceCaisseSpecialePdfFillData {
  secretarySignature: string | null
  memberSignature: string | null
}

const DEFAULT_FILL_DATA: QuittanceCaisseSpecialePdfFillData = {
  secretarySignature: null,
  memberSignature: null,
}

type CaisseSpecialeLiquidationInput = {
  /** Contrat enrichi par la modale : fiche `member` et `nominalPaid`. */
  contract?: any
  refund?: Record<string, unknown> | null
}

/** Champs du procès-verbal, partagés avec la modale pour la saisie des informations manquantes. */
export const buildCaisseSpecialeLiquidationFields = ({ contract: inputContract, refund }: CaisseSpecialeLiquidationInput) => {
  const contract = (inputContract ?? {}) as Record<string, any>
  const member = (contract.member ?? {}) as Record<string, any>
  const contacts: string[] = Array.isArray(member.contacts) ? member.contacts.filter(Boolean) : []
  const caisseType = String(contract.caisseType ?? '')
  const durationMonths = Number(contract.monthsPlanned ?? 0)
  const startDate = contract.contractStartAt ?? contract.firstPaymentDate
  const endDate = resolveContractEndAt(contract)
  const optionalDate = (value: unknown) => (toDate(value) ? formatDate(value) : '')

  const totalPaid = Number(contract.nominalPaid ?? refund?.amountNominal ?? 0)
  const nominal = Number(refund?.amountNominal ?? totalPaid)
  // Le montant effectivement remis reste celui enregistré lors du règlement ;
  // le bonus n'est pas détaillé comme ligne autonome.
  const amountPaid = Number(refund?.withdrawalAmount ?? (nominal + Number(refund?.amountBonus ?? 0)))
  const liquidationType = refund?.type === 'EARLY'
    ? 'Retrait anticipé et clôture du contrat'
    : 'Remboursement final à l’échéance'
  const paidDate = field('refund.paidDate', 'Date du règlement :', optionalDate(refund?.paidAt ?? refund?.withdrawalDate ?? refund?.processedAt), 'date')

  return {
    amountPaid,
    member: [
      [field('member.lastName', 'Nom(s) du membre :', String(member.lastName ?? '').toUpperCase()), field('member.firstName', 'Prénom(s) du membre :', member.firstName)],
      [field('member.matricule', 'Matricule / N° d’Adhérent :', member.matricule || contract.memberId), field('contract.id', 'Référence du contrat :', contract.id)],
      [
        field('contract.caisseType', 'Type de Caisse Spéciale :', CAISSE_TYPE_LABELS[caisseType] ?? caisseType),
        field('contract.duration', 'Durée du contrat :', durationMonths > 0 ? `${durationMonths} mois` : ''),
      ],
      [field('contract.startDate', 'Date de début :', optionalDate(startDate), 'date'), field('contract.endDate', 'Date de fin :', optionalDate(endDate), 'date')],
      [field('member.identityDocumentNumber', 'N° CNI/Passeport :', member.identityDocumentNumber), field('member.phone', 'Téléphone :', contacts[0])],
    ] as FieldRow[],
    liquidation: [
      [field('refund.type', 'Nature de la liquidation :', liquidationType), paidDate],
      [
        field('contract.totalPaid', 'Total des versements enregistrés :', `${formatAmount(totalPaid)} FCFA`),
        field('refund.paymentMode', 'Mode de règlement :', paymentModeLabel(refund ?? undefined)),
      ],
      [
        field('refund.amountDigits', 'Montant remis (en chiffres) :', `${formatAmount(amountPaid)} FCFA`),
        field('refund.amountWords', 'Montant remis (en lettres) :', `${numberToWords(amountPaid)} francs CFA`),
      ],
    ] as FieldRow[],
    paidDate,
  }
}

export const listCaisseSpecialeLiquidationFields = (input: CaisseSpecialeLiquidationInput): DocumentField[] => {
  const { member, liquidation } = buildCaisseSpecialeLiquidationFields(input)
  return collectDocumentFields({ member, liquidation })
}

const QuittanceCaisseSpecialePDF = ({
  contract,
  refund,
  fillData,
  completion,
}: CaisseSpecialeLiquidationInput & {
  fillData?: QuittanceCaisseSpecialePdfFillData
  completion?: DocumentCompletion | null
}) => {
  const signatures = fillData ?? DEFAULT_FILL_DATA
  const fields = buildCaisseSpecialeLiquidationFields({ contract, refund })
  const [[lastNameField, firstNameField]] = fields.member
  const memberName = fullNameFrom(readField(lastNameField, completion), readField(firstNameField, completion))
  const paidDate = readField(fields.paidDate, completion) || EMPTY
  const amountPaid = fields.amountPaid

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <MutuellePageChrome footerLabel="Procès-verbal de liquidation du contrat de Caisse Spéciale" />
        <MutuelleHeader title="PROCÈS-VERBAL DE LIQUIDATION DU CONTRAT DE CAISSE SPÉCIALE" />

        <Text style={styles.preamble}>
          Ce document constate la liquidation du contrat de Caisse Spéciale identifié ci-dessous et
          le versement à l’épargnant du montant arrêté. Conformément à la loi n°35/62 du 10 décembre
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
            la liquidation de mon contrat de Caisse Spéciale.
          </Text>
          <Text style={styles.paragraph}>
            Je confirme que ce règlement correspond aux sommes effectivement remises et que le
            présent procès-verbal atteste de la clôture financière du contrat, conformément aux
            conditions contractuelles et aux statuts de LE KARA.
          </Text>
          <Text style={styles.paragraph}>Fait à {documentPlace(completion)}, le {paidDate}</Text>
          <Text style={styles.note}>
            (Inscrire la mention manuscrite « Reçu la somme de {formatAmount(amountPaid)} FCFA au
            titre de la liquidation du contrat de Caisse Spéciale pour solde de tout compte »)
          </Text>

          <MutuelleSignatures
            memberTitle="L’Épargnant / Réceptionnaire"
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

export default QuittanceCaisseSpecialePDF
