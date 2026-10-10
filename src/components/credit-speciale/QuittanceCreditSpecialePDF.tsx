'use client'

import { buildMemberContractRow, buildMemberIdentificationRows } from '@/components/pdf/mutuelle/memberIdentification'
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
import type { CreditContract, User } from '@/types/types'
import { Document, Page, Text } from '@react-pdf/renderer'
import React from 'react'

/**
 * Procès-verbal de liquidation et quittance subrogative d'un crédit (spécial,
 * fixe ou aide), sur le modèle LIQUIDATION.docx comme les caisses. Il constate
 * le remboursement intégral de la créance. Le texte de quittance et la clause
 * de subrogation sont repris à l'identique de l'ancienne quittance : ils
 * portent l'effet juridique du document.
 */

const CREDIT_TYPE_LABELS: Record<CreditContract['creditType'], string> = {
  SPECIALE: 'Crédit spécial',
  FIXE: 'Crédit fixe',
  AIDE: 'Crédit aide',
}

interface QuittanceCreditSpecialePDFProps {
  contract: CreditContract
  guarantorPhone?: string
  memberData?: User | null
  guarantorData?: User | null
  fillData?: QuittanceCreditSpecialeFillData
  completion?: DocumentCompletion | null
}

export interface QuittanceCreditSpecialeFillData {
  memberSignature: string | null
  secretarySignature: string | null
}

export const EMPTY_QUITTANCE_CREDIT_SPECIALE_FILL_DATA: QuittanceCreditSpecialeFillData = {
  memberSignature: null,
  secretarySignature: null,
}

type CreditLiquidationInput = Omit<QuittanceCreditSpecialePDFProps, 'fillData' | 'completion'>

/** Champs du procès-verbal, partagés avec la modale pour la saisie des informations manquantes. */
export const buildCreditLiquidationFields = ({ contract, guarantorPhone, memberData, guarantorData }: CreditLiquidationInput) => {
  const optionalDate = (value: unknown) => (toDate(value) ? formatDate(value) : '')
  // Montants : mêmes sources que l'ancienne quittance.
  const totalAmount = contract.totalAmount || (contract.amount + (contract.amount * (contract.interestRate || 10) / 100))
  const debtAmount = contract.amount || 0
  const guarantorName = [
    String(guarantorData?.lastName || contract.guarantorLastName || '').toUpperCase(),
    guarantorData?.firstName || contract.guarantorFirstName || '',
  ].filter(Boolean).join(' ').trim()
  // Date de la quittance : date de décharge ; à défaut, saisie dans la modale.
  const settledAt = field('contract.settledAt', 'Date du solde :', optionalDate(contract.dischargedAt), 'date')

  return {
    totalAmount,
    debtAmount,
    member: [
      // Identification identique à la fiche d'adhésion, puis le crédit.
      ...buildMemberIdentificationRows({
        lastName: memberData?.lastName || contract.clientLastName,
        firstName: memberData?.firstName || contract.clientFirstName,
        birthDate: memberData?.birthDate,
        birthPlace: memberData?.birthPlace,
        identityDocumentNumber: memberData?.identityDocumentNumber,
        identityDocumentIssuingDate: (memberData as { identityDocumentIssuingDate?: unknown } | undefined)?.identityDocumentIssuingDate,
        address: memberData?.address,
        contacts: memberData?.contacts?.length ? memberData.contacts : contract.clientContacts,
        whatsappNumber: memberData?.whatsappNumber,
        email: memberData?.email,
        profession: memberData?.profession,
        companyName: memberData?.companyName,
      }),
      buildMemberContractRow(memberData?.matricule || contract.clientId, contract.id),
      [
        field('contract.creditType', 'Nature du crédit :', CREDIT_TYPE_LABELS[contract.creditType]),
        field('contract.startDate', 'Date de début :', optionalDate(contract.firstPaymentDate), 'date'),
      ],
      [
        field('guarantor.name', 'Caution solidaire :', guarantorName),
        field('guarantor.phone', 'Téléphone de la caution :', guarantorData?.contacts?.[0] || guarantorPhone),
      ],
    ] as FieldRow[],
    liquidation: [
      [field('contract.debtAmount', 'Montant de la dette :', `${formatAmount(debtAmount)} FCFA`), settledAt],
      [
        field('contract.amountDigits', 'Montant reçu (en chiffres) :', `${formatAmount(totalAmount)} FCFA`),
        field('contract.amountWords', 'Montant reçu (en lettres) :', `${numberToWords(totalAmount)} francs CFA`),
      ],
    ] as FieldRow[],
    settledAt,
  }
}

export const listCreditLiquidationFields = (input: CreditLiquidationInput): DocumentField[] => {
  const { member, liquidation } = buildCreditLiquidationFields(input)
  return collectDocumentFields({ member, liquidation })
}

const QuittanceCreditSpecialePDF = ({
  contract,
  guarantorPhone,
  memberData,
  guarantorData,
  fillData,
  completion,
}: QuittanceCreditSpecialePDFProps) => {
  const signatures = { ...EMPTY_QUITTANCE_CREDIT_SPECIALE_FILL_DATA, ...fillData }
  const fields = buildCreditLiquidationFields({ contract, guarantorPhone, memberData, guarantorData })
  const clientName = readField(fields.member[0][0], completion)
  const guarantorName = readField(fields.member.flat().find((f) => f.key === 'guarantor.name')!, completion)
  const { totalAmount, debtAmount } = fields
  const quittanceDate = readField(fields.settledAt, completion) || EMPTY

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <MutuellePageChrome footerLabel="Procès-verbal de liquidation et quittance subrogative du crédit" />
        <MutuelleHeader title="PROCÈS-VERBAL DE LIQUIDATION ET QUITTANCE SUBROGATIVE DU CRÉDIT" />

        <Text style={styles.preamble}>
          Ce document constate le remboursement intégral du crédit identifié ci-dessous et
          l’extinction de la créance détenue par l’Association. Conformément à la loi n°35/62 du 10
          décembre 1962 relative aux associations, aux statuts de LE KARA et aux conditions du
          contrat, il vaut quittance au profit du membre.
        </Text>

        <MutuelleSection title="1. IDENTIFICATION DU MEMBRE ET DU CRÉDIT">
          <FieldTable rows={fields.member} completion={completion} />
        </MutuelleSection>

        <MutuelleSection title="2. LIQUIDATION DE LA CRÉANCE">
          <Text style={styles.paragraph}>
            Le Comité Exécutif certifie avoir vérifié les remboursements enregistrés et arrêté la
            liquidation suivante :
          </Text>
          <FieldTable rows={fields.liquidation} completion={completion} />
        </MutuelleSection>

        <MutuelleSection title="3. QUITTANCE ET SUBROGATION">
          <Text style={styles.paragraph}>
            L’Association LE KARA, ayant son siège social à Awoungou/Owendo, immatriculée au registre du
            Ministère de l’Intérieur, sous le numéro n° 0650/MIS/SG/DGELP/DPPALC/KMOG, reconnaît avoir reçu
            de M/Mme/Mlle <Text style={styles.bold}>{display(clientName)}</Text>, la somme de{' '}
            <Text style={styles.bold}>{numberToWords(totalAmount)}</Text> FCFA (lettre){' '}
            <Text style={styles.bold}>{formatAmount(totalAmount)}</Text> FCFA (chiffre), le {quittanceDate}, en
            paiement de la dette de <Text style={styles.bold}>{formatAmount(debtAmount)} FCFA</Text>,
            consentie avec le cautionnement de M/Mme/Mlle <Text style={styles.bold}>{display(guarantorName)}</Text>,
            au profit de l’Association LE KARA.
          </Text>
          <Text style={styles.paragraph}>
            En conséquence, l’Association LE KARA, subroge par la présente tous les droits, actions et
            privilèges qu’elle détient sur Mme/M/Mlle <Text style={styles.bold}>{display(clientName)}</Text>{' '}
            (débitrice) ou ses cautions.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>NB</Text> : Cette quittance tient lieu d’annulation intégrale de la
            créance, il revient à souhait au débiteur de renouveler ou non sa présence à l’Association LE KARA.
          </Text>
          <Text style={styles.paragraph}>Fait à {documentPlace(completion)}, le {quittanceDate}</Text>
          <Text style={styles.note}>(Inscrire la mention manuscrite « Lu et approuvé »)</Text>

          <MutuelleSignatures
            memberTitle="Le Membre / Débiteur"
            memberName={clientName}
            memberSignature={signatures.memberSignature}
            committeeRole="Le Secrétaire Exécutif"
            committeeSignature={signatures.secretarySignature}
          />
        </MutuelleSection>
      </Page>
    </Document>
  )
}

export default QuittanceCreditSpecialePDF
