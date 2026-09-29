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
import { getNationalityName } from '@/constantes/nationality'
import { resolveContractEndAt } from '@/services/caisse/contractDates'
import { Document, Page, Text } from '@react-pdf/renderer'
import React from 'react'

/**
 * Contrat d'adhésion à la Caisse Spéciale.
 *
 * Même gabarit que le contrat Caisse Imprévue (modèle LIQUIDATION.docx) : une
 * page, quatre sections et une double signature. Les règles de fonctionnement
 * relèvent du Règlement intérieur, auquel le contrat renvoie. Il est distinct
 * du procès-verbal de liquidation, qui n'est établi qu'au règlement.
 */

const CAISSE_TYPE_LABELS: Record<string, string> = {
  STANDARD: 'Standard',
  JOURNALIERE: 'Journalière',
  LIBRE: 'Libre',
  STANDARD_CHARITABLE: 'Standard charitable',
  JOURNALIERE_CHARITABLE: 'Journalière charitable',
  LIBRE_CHARITABLE: 'Libre charitable',
}

const CHANGEABLE_TYPES = new Set(['LIBRE', 'JOURNALIERE', 'LIBRE_CHARITABLE', 'JOURNALIERE_CHARITABLE'])
const DAILY_TYPES = new Set(['JOURNALIERE', 'JOURNALIERE_CHARITABLE'])

export interface CaisseSpecialePdfFillData {
  memberSignature: string | null
  secretarySignature: string | null
}

const DEFAULT_FILL_DATA: CaisseSpecialePdfFillData = {
  memberSignature: null,
  secretarySignature: null,
}

/**
 * Champs du contrat, dans l'ordre des tableaux. Partagés avec la modale, qui
 * propose à la saisie ceux qui manquent dans les données.
 */
export const buildCaisseSpecialeContractFields = (inputContract?: any) => {
  const contract = (inputContract ?? {}) as Record<string, any>
  // La modale enrichit le contrat avec la fiche `member` complète.
  const member = (contract.member ?? {}) as Record<string, any>
  const emergencyContact = (contract.emergencyContact ?? {}) as Record<string, any>
  const contacts: string[] = Array.isArray(member.contacts) ? member.contacts.filter(Boolean) : []
  const memberAddress = member.address && typeof member.address === 'object'
    ? member.address.district ?? member.address.arrondissement ?? member.address.city
    : member.address

  const caisseType = String(contract.caisseType ?? '')
  const isChangeable = CHANGEABLE_TYPES.has(caisseType)
  const monthlyAmount = Number(contract.monthlyAmount ?? 0)
  const durationMonths = Number(contract.monthsPlanned ?? 0)
  // Une seule définition du terme : celle de la plateforme. Les contrats
  // journaliers sont en périodes de 30 jours et les autres en mois calendaires.
  const startDate = contract.contractStartAt ?? contract.firstPaymentDate
  const endDate = resolveContractEndAt(contract)
  const contractDate = contract.createdAt ?? startDate
  const startDay = toDate(startDate)
  const paymentDayLabel = DAILY_TYPES.has(caisseType)
    ? 'Chaque jour'
    : startDay ? `Le ${String(startDay.getDate()).padStart(2, '0')} de chaque mois` : ''
  const optionalDate = (value: unknown) => (toDate(value) ? formatDate(value) : '')

  return {
    member: [
      [field('member.lastName', 'Nom(s) :', String(member.lastName ?? '').toUpperCase()), field('member.firstName', 'Prénom(s) :', member.firstName)],
      [field('member.matricule', 'Matricule / N° d’adhérent :', member.matricule || contract.memberId), field('contract.id', 'Référence du contrat :', contract.id)],
      [field('member.birthDate', 'Date de naissance :', optionalDate(member.birthDate), 'date'), field('member.birthPlace', 'Lieu de naissance :', member.birthPlace)],
      [
        field('member.identityDocumentNumber', 'N° CNI/Passeport :', member.identityDocumentNumber),
        field('member.nationality', 'Nationalité :', member.nationality ? getNationalityName(member.nationality) : ''),
      ],
      [field('member.address', 'Adresse / Quartier :', memberAddress), field('member.profession', 'Profession / Employeur :', member.profession || member.companyName)],
      [field('member.phones', 'Téléphone / WhatsApp :', contacts.join(' / ')), field('member.email', 'Email :', member.email)],
    ] as FieldRow[],
    engagements: [
      [
        field('contract.caisseType', 'Type de caisse :', CAISSE_TYPE_LABELS[caisseType] ?? caisseType),
        field('contract.formula', 'Formule :', isChangeable ? 'Changeable' : 'Non changeable'),
      ],
      [
        field(
          'contract.monthlyAmount',
          'Montant mensuel :',
          isChangeable ? 'Variable selon la formule changeable' : monthlyAmount > 0 ? `${formatAmount(monthlyAmount)} FCFA` : '',
        ),
        field('contract.rhythm', 'Rythme des échéances :', DAILY_TYPES.has(caisseType) ? 'Périodes de 30 jours' : 'Mensuel'),
      ],
      [
        field('contract.duration', 'Durée du contrat :', durationMonths > 0 ? `${durationMonths} mois` : ''),
        field('contract.paymentDay', 'Jour convenu de versement :', paymentDayLabel),
      ],
      [field('contract.startDate', 'Date de début :', optionalDate(startDate), 'date'), field('contract.endDate', 'Date de fin prévue :', optionalDate(endDate), 'date')],
    ] as FieldRow[],
    emergency: [
      [field('emergency.lastName', 'Nom(s) :', String(emergencyContact.lastName ?? '').toUpperCase()), field('emergency.firstName', 'Prénom(s) :', emergencyContact.firstName)],
      [
        field('emergency.relationship', 'Lien avec le membre :', emergencyContact.relationship),
        field('emergency.phone', 'Téléphone :', emergencyContact.phone1 ?? emergencyContact.phone),
      ],
      [field('emergency.idNumber', 'N° CNI/Passeport :', emergencyContact.idNumber), field('emergency.address', 'Adresse / Quartier :', emergencyContact.address)],
    ] as FieldRow[],
    signedAt: field('signedAt', 'Date de signature', optionalDate(contractDate), 'date'),
  }
}

export const listCaisseSpecialeContractFields = (contract?: any): DocumentField[] =>
  collectDocumentFields(buildCaisseSpecialeContractFields(contract))

const CaisseSpecialePDFV3 = ({
  contract,
  fillData,
  completion,
}: {
  contract?: any
  fillData?: CaisseSpecialePdfFillData
  completion?: DocumentCompletion | null
}) => {
  const signatures = fillData ?? DEFAULT_FILL_DATA
  const fields = buildCaisseSpecialeContractFields(contract)
  const [[lastNameField, firstNameField]] = fields.member
  const memberName = fullNameFrom(readField(lastNameField, completion), readField(firstNameField, completion))

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <MutuellePageChrome footerLabel="Contrat d’adhésion à la Caisse Spéciale" />
        <MutuelleHeader title="CONTRAT D’ADHÉSION À LA CAISSE SPÉCIALE" />

        <Text style={styles.preamble}>
          Le présent acte formalise l’adhésion du membre, dit l’épargnant, à la Caisse Spéciale de la
          Mutuelle. Il précise la formule souscrite, les engagements de versement et les conditions
          applicables pendant la durée du contrat. Il ne constitue ni un crédit ni un prêt accordé au
          membre.
        </Text>

        <MutuelleSection title="1. IDENTIFICATION DU MEMBRE ÉPARGNANT">
          <FieldTable rows={fields.member} completion={completion} />
        </MutuelleSection>

        <MutuelleSection title="2. ENGAGEMENTS ET CONDITIONS DE LA CAISSE SPÉCIALE">
          <FieldTable rows={fields.engagements} completion={completion} />
          <Text style={styles.paragraph}>
            Je soussigné(e), nommé(e) ci-dessus, adhère librement à la Caisse Spéciale et m’engage à
            effectuer les versements correspondant à la formule souscrite, selon le rythme et la durée
            mentionnés au présent contrat.
          </Text>
          <Text style={styles.bullet}>• Les versements sont enregistrés dans l’échéancier du contrat.</Text>
          <Text style={styles.bullet}>• À la date de fin du contrat, LE KARA restitue à l’épargnant le nominal correspondant aux sommes versées, dans les conditions prévues par le Règlement intérieur.</Text>
          <Text style={styles.bullet}>• Toute demande de retrait anticipé est traitée selon les conditions applicables au contrat.</Text>
          <Text style={styles.bullet}>• À l’échéance ou après un règlement anticipé, les sommes effectivement remises sont constatées dans un procès-verbal de liquidation distinct.</Text>
        </MutuelleSection>

        <MutuelleSection title="3. PERSONNE À CONTACTER EN CAS D’URGENCE">
          <FieldTable rows={fields.emergency} completion={completion} />
        </MutuelleSection>

        <MutuelleSection title="4. ACCEPTATION DU RÈGLEMENT ET SIGNATURE">
          <Text style={styles.paragraph}>
            Je reconnais avoir pris connaissance des Statuts, du Règlement Intérieur et des conditions
            de la Caisse Spéciale de la Mutuelle d’Entraide et de Secours Mutuel « LE KARA ». Je
            m’engage à les respecter pendant toute la durée du présent contrat.
          </Text>
          <Text style={styles.paragraph}>Fait à {documentPlace(completion)}, le {readField(fields.signedAt, completion) || EMPTY}</Text>
          <Text style={styles.note}>(Inscrire la mention manuscrite « Lu et approuvé, bon pour engagement »)</Text>

          <MutuelleSignatures
            memberTitle="L’Épargnant"
            memberName={memberName}
            memberSignature={signatures.memberSignature}
            committeeRole="Le Secrétaire Exécutif"
            committeeSignature={signatures.secretarySignature}
          />
        </MutuelleSection>
      </Page>
    </Document>
  )
}

export default CaisseSpecialePDFV3
