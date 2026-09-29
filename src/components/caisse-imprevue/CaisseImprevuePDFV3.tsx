'use client'

import {
  EMPTY,
  FieldTable,
  MutuelleHeader,
  MutuellePageChrome,
  MutuelleSection,
  MutuelleSignatures,
  collectDocumentFields,
  documentPlace,
  field,
  formatAmount,
  formatDate,
  fullNameFrom,
  mutuelleStyles as styles,
  readField,
  toDate,
  type DocumentCompletion,
  type DocumentField,
  type FieldRow,
} from '@/components/pdf/mutuelle/MutuelleDocumentKit'
import type { ContractCI } from '@/types/types'
import { getContractEndDate } from '@/utils/caisse-imprevue-utils'
import { Document, Page, Text } from '@react-pdf/renderer'
import React from 'react'

/**
 * Contrat d'adhésion à la Caisse Imprévue.
 *
 * Il reprend la structure de l'engagement d'adhésion fourni par la Mutuelle,
 * avec des clauses et des données propres à la Caisse Imprévue. Il est
 * distinct du procès-verbal de liquidation, qui n'est établi qu'au règlement.
 */

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

const paymentDayLabel = (contract: Record<string, unknown>): string => {
  if (contract.paymentFrequency === 'DAILY') return 'Chaque jour'

  const firstPaymentDate = toDate(contract.firstPaymentDate)
  return firstPaymentDate
    ? `Le ${String(firstPaymentDate.getDate()).padStart(2, '0')} de chaque mois`
    : ''
}

export interface CaisseImprevuePdfFillData {
  memberSignature: string | null
  secretarySignature: string | null
}

const DEFAULT_FILL_DATA: CaisseImprevuePdfFillData = {
  memberSignature: null,
  secretarySignature: null,
}

/** Champs du contrat, partagés avec la modale pour la saisie des informations manquantes. */
export const buildCaisseImprevueContractFields = (inputContract?: ContractCI | null) => {
  const contract = (inputContract ?? {}) as Record<string, any>
  const member = (contract?.member ?? {}) as Record<string, unknown>
  const emergencyContact = (contract?.emergencyContact ?? {}) as Record<string, unknown>
  // Même source que le contrat Caisse Spéciale : le PDF reçoit d'abord la
  // fiche `member` complète, enrichie dans la modale avant son rendu.
  // Les champs dénormalisés du contrat ne servent que de secours pour les
  // contrats historiques dont la fiche membre est introuvable.
  const lastName = String(member.lastName || contract?.memberLastName || '')
  const firstName = String(member.firstName || contract?.memberFirstName || '')
  const contacts = Array.isArray(member.contacts) && member.contacts.length > 0
    ? member.contacts
    : Array.isArray(contract?.memberContacts) ? contract.memberContacts : []
  const memberAddress = member.address && typeof member.address === 'object'
    ? (member.address as Record<string, unknown>).district
      ?? (member.address as Record<string, unknown>).arrondissement
      ?? (member.address as Record<string, unknown>).city
    : member.address
  const optionalDate = (value: unknown) => (toDate(value) ? formatDate(value) : '')
  const periodicAmount = Number(contract?.subscriptionCIAmountPerMonth ?? 0)
  const nominal = Number(contract?.subscriptionCINominal ?? 0)
  const duration = Number(contract?.subscriptionCIDuration ?? 0)

  return {
    member: [
      [field('member.lastName', 'Nom(s) :', lastName.toUpperCase()), field('member.firstName', 'Prénom(s) :', firstName)],
      [field('member.matricule', 'Matricule / N° d’adhérent :', contract?.memberId), field('contract.id', 'Référence du contrat :', contract?.id)],
      [
        field('member.birthDate', 'Date de naissance :', optionalDate(member.birthDate || contract?.memberBirthDate), 'date'),
        field('member.birthPlace', 'Lieu de naissance :', member.birthPlace ?? contract?.memberBirthPlace),
      ],
      [
        field('member.identityDocumentNumber', 'N° CNI/Passeport :', member.identityDocumentNumber ?? contract?.memberIdentityDocumentNumber),
        field('member.nationality', 'Nationalité :', member.nationality || contract?.memberNationality),
      ],
      [
        field('member.address', 'Adresse / Quartier :', memberAddress || contract?.memberAddress),
        field('member.profession', 'Profession / Employeur :', member.profession || member.companyName || contract?.memberProfession),
      ],
      [
        field('member.phones', 'Téléphone / WhatsApp :', contacts.filter(Boolean).join(' / ')),
        field('member.email', 'Email :', member.email || contract?.memberEmail),
      ],
    ] as FieldRow[],
    engagements: [
      [
        field('contract.formula', 'Formule souscrite :', contract?.subscriptionCILabel ?? contract?.subscriptionCICode),
        field('contract.frequency', 'Fréquence de versement :', frequencyLabel(contract?.paymentFrequency)),
      ],
      [
        field('contract.periodicAmount', 'Montant prévu par période :', `${formatAmount(periodicAmount)} FCFA`),
        field('contract.nominal', 'Nominal contractuel :', `${formatAmount(nominal)} FCFA`),
      ],
      [
        field('contract.duration', 'Durée du contrat :', duration > 0 ? `${duration} mois` : ''),
        field('contract.paymentDay', 'Jour convenu de versement :', paymentDayLabel(contract)),
      ],
      [
        field('contract.startDate', 'Date de début :', optionalDate(contract?.firstPaymentDate ?? contract?.contractStartAt), 'date'),
        field('contract.endDate', 'Date de fin prévue :', optionalDate(contractEndDate(contract)), 'date'),
      ],
    ] as FieldRow[],
    emergency: [
      [
        field('emergency.lastName', 'Nom(s) :', String(emergencyContact.lastName ?? '').toUpperCase()),
        field('emergency.firstName', 'Prénom(s) :', emergencyContact.firstName),
      ],
      [
        field('emergency.relationship', 'Lien avec le membre :', emergencyContact.relationship),
        field('emergency.phone', 'Téléphone :', emergencyContact.phone1 ?? emergencyContact.phone),
      ],
      [
        field('emergency.idNumber', 'N° CNI/Passeport :', emergencyContact.idNumber),
        field('emergency.address', 'Adresse / Quartier :', emergencyContact.address),
      ],
    ] as FieldRow[],
    signedAt: field('signedAt', 'Date de signature', optionalDate(contract?.createdAt ?? contract?.firstPaymentDate), 'date'),
  }
}

export const listCaisseImprevueContractFields = (contract?: ContractCI | null): DocumentField[] =>
  collectDocumentFields(buildCaisseImprevueContractFields(contract))

const CaisseImprevuePDFV3 = ({
  contract,
  fillData,
  completion,
}: {
  contract?: ContractCI | null
  fillData?: CaisseImprevuePdfFillData
  completion?: DocumentCompletion | null
}) => {
  const resolvedFillData = fillData ?? DEFAULT_FILL_DATA
  const fields = buildCaisseImprevueContractFields(contract)
  const [[lastNameField, firstNameField]] = fields.member
  const memberName = fullNameFrom(readField(lastNameField, completion), readField(firstNameField, completion))

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <MutuellePageChrome footerLabel="Contrat d’adhésion à la Caisse Imprévue" />
        <MutuelleHeader title="CONTRAT D’ADHÉSION À LA CAISSE IMPRÉVUE" />

        <Text style={styles.preamble}>
          Le présent acte formalise l’adhésion du membre à la Caisse Imprévue de la Mutuelle. Il
          précise la formule souscrite, les engagements de versement et les conditions applicables
          pendant la durée du contrat. Il ne constitue ni un crédit ni un prêt accordé au membre.
        </Text>

        <MutuelleSection title="1. IDENTIFICATION DU MEMBRE ADHÉRENT">
          <FieldTable rows={fields.member} completion={completion} />
        </MutuelleSection>

        <MutuelleSection title="2. ENGAGEMENTS ET CONDITIONS DE LA CAISSE IMPRÉVUE">
          <FieldTable rows={fields.engagements} completion={completion} />
          <Text style={styles.paragraph}>
            Je soussigné(e), nommé(e) ci-dessus, adhère librement à la Caisse Imprévue et m’engage à
            effectuer les versements correspondant à la formule souscrite, selon la fréquence et la
            durée mentionnées au présent contrat.
          </Text>
          <Text style={styles.bullet}>• Les versements sont enregistrés dans l’échéancier du contrat.</Text>
          <Text style={styles.bullet}>• Toute demande de retrait anticipé est traitée selon les conditions applicables au contrat.</Text>
          <Text style={styles.bullet}>• À l’échéance ou après un règlement anticipé, les sommes effectivement remises sont constatées dans un document de liquidation distinct.</Text>
        </MutuelleSection>

        <MutuelleSection title="3. PERSONNE À CONTACTER EN CAS D’URGENCE">
          <FieldTable rows={fields.emergency} completion={completion} />
        </MutuelleSection>

        <MutuelleSection title="4. ACCEPTATION DU RÈGLEMENT ET SIGNATURE">
          <Text style={styles.paragraph}>
            Je reconnais avoir pris connaissance des Statuts, du Règlement Intérieur et des conditions
            de la Caisse Imprévue de la Mutuelle d’Entraide et de Secours Mutuel « LE KARA ». Je
            m’engage à les respecter pendant toute la durée du présent contrat.
          </Text>
          <Text style={styles.paragraph}>
            Fait à {documentPlace(completion)}, le {readField(fields.signedAt, completion) || EMPTY}
          </Text>
          <Text style={styles.note}>
            (Inscrire la mention manuscrite « Lu et approuvé, bon pour engagement »)
          </Text>

          <MutuelleSignatures
            memberTitle="Le Membre Adhérent"
            memberName={memberName}
            memberSignature={resolvedFillData.memberSignature}
            committeeRole="Le Secrétaire Exécutif"
            committeeSignature={resolvedFillData.secretarySignature}
          />
        </MutuelleSection>
      </Page>
    </Document>
  )
}

export default CaisseImprevuePDFV3
