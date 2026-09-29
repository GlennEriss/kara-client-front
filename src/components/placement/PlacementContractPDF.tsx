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
  numberToWords,
  readField,
  toDate,
  type DocumentCompletion,
  type DocumentField,
  type FieldRow,
} from '@/components/pdf/mutuelle/MutuelleDocumentKit'
import { getNationalityName } from '@/constantes/nationality'
import type { Placement, User } from '@/types/types'
import { Document, Page, Text } from '@react-pdf/renderer'
import React from 'react'

/**
 * Contrat d'adhésion au volet Bienfaiteur (placement).
 *
 * Même gabarit que les contrats Caisse Imprévue et Caisse Spéciale (modèle
 * LIQUIDATION.docx) : une page, quatre sections et une double signature. Les
 * règles du volet relèvent du Règlement intérieur, auquel le contrat renvoie.
 */

const PAYOUT_MODE_LABELS: Record<Placement['payoutMode'], string> = {
  MonthlyCommission_CapitalEnd: 'Commission mensuelle, capital à la fin',
  CapitalPlusCommission_End: 'Capital et commissions à la fin',
}

type PlacementContractInput = { placement: Placement; member: User | null | undefined }

/** Champs du contrat, partagés avec la modale pour la saisie des informations manquantes. */
export const buildPlacementContractFields = ({ placement, member }: PlacementContractInput) => {
  const optionalDate = (value: unknown) => (toDate(value) ? formatDate(value) : '')
  const contacts = member?.contacts?.filter(Boolean) ?? []
  const phones = contacts.length > 0 ? contacts.join(' / ') : placement.benefactorPhone ?? ''
  const address = member?.address?.district || member?.address?.arrondissement || member?.address?.city || ''
  const amount = Math.round(Number(placement.amount || 0))
  const urgent = placement.urgentContact

  return {
    member: [
      [
        field('member.lastName', 'Nom(s) :', String(member?.lastName ?? '').toUpperCase() || placement.benefactorName),
        field('member.firstName', 'Prénom(s) :', member?.firstName),
      ],
      [field('member.matricule', 'Matricule / N° d’adhérent :', member?.matricule || placement.benefactorId), field('placement.id', 'Référence du placement :', placement.id)],
      [field('member.birthDate', 'Date de naissance :', optionalDate(member?.birthDate), 'date'), field('member.birthPlace', 'Lieu de naissance :', member?.birthPlace)],
      [
        field('member.identityDocumentNumber', 'N° CNI/Passeport :', member?.identityDocumentNumber),
        field('member.nationality', 'Nationalité :', member?.nationality ? getNationalityName(member.nationality) : ''),
      ],
      [field('member.address', 'Adresse / Quartier :', address), field('member.profession', 'Profession / Employeur :', member?.profession || member?.companyName)],
      [field('member.phones', 'Téléphone / WhatsApp :', phones), field('member.email', 'Email :', member?.email)],
    ] as FieldRow[],
    engagements: [
      [
        field('placement.amountDigits', 'Montant mis à disposition :', amount > 0 ? `${formatAmount(amount)} FCFA` : ''),
        field('placement.amountWords', 'En lettres :', amount > 0 ? `${numberToWords(amount)} francs CFA` : ''),
      ],
      [
        field('placement.period', 'Durée de l’engagement :', placement.periodMonths ? `${placement.periodMonths} mois` : ''),
        field('placement.rate', 'Taux de commission :', placement.rate != null ? `${placement.rate} %` : ''),
      ],
      [field('placement.startDate', 'Date de début :', optionalDate(placement.startDate), 'date'), field('placement.endDate', 'Date de fin prévue :', optionalDate(placement.endDate), 'date')],
      [
        field('placement.payoutMode', 'Versement des commissions :', PAYOUT_MODE_LABELS[placement.payoutMode]),
        field('placement.handoverDate', 'Remise des fonds :', optionalDate(placement.handoverDate), 'date'),
      ],
    ] as FieldRow[],
    emergency: [
      [field('emergency.name', 'Nom(s) :', String(urgent?.name ?? '').toUpperCase()), field('emergency.firstName', 'Prénom(s) :', urgent?.firstName)],
      [
        field('emergency.relationship', 'Lien avec le membre :', urgent?.relationship),
        field('emergency.phone', 'Téléphone :', [urgent?.phone, urgent?.phone2].filter(Boolean).join(' / ')),
      ],
      [field('emergency.typeId', 'Type de pièce :', urgent?.typeId), field('emergency.idNumber', 'N° de pièce :', urgent?.idNumber)],
    ] as FieldRow[],
    signedAt: field('signedAt', 'Date de signature', optionalDate(placement.handoverDate ?? placement.startDate ?? placement.createdAt), 'date'),
  }
}

export const listPlacementContractFields = (input: PlacementContractInput): DocumentField[] =>
  collectDocumentFields(buildPlacementContractFields(input))

export default function PlacementContractPDF({
  placement,
  member,
  completion,
}: PlacementContractInput & { completion?: DocumentCompletion | null }) {
  const fields = buildPlacementContractFields({ placement, member })
  const [[lastNameField, firstNameField]] = fields.member
  const memberName = fullNameFrom(readField(lastNameField, completion), readField(firstNameField, completion))

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <MutuellePageChrome footerLabel="Contrat d’adhésion au volet Bienfaiteur" />
        <MutuelleHeader title="CONTRAT D’ADHÉSION AU VOLET BIENFAITEUR" />

        <Text style={styles.preamble}>
          Le présent acte formalise l’adhésion du membre, dit le Bienfaiteur, au volet Bienfaiteur de
          la Mutuelle. Il précise le soutien financier volontaire mis à la disposition de
          l’Association, sa durée et les modalités de sa restitution. L’Association s’engage à gérer
          les fonds confiés avec rigueur et transparence, et à en assurer la traçabilité.
        </Text>

        <MutuelleSection title="1. IDENTIFICATION DU BIENFAITEUR">
          <FieldTable rows={fields.member} completion={completion} />
        </MutuelleSection>

        <MutuelleSection title="2. ENGAGEMENTS ET CONDITIONS DU PLACEMENT">
          <FieldTable rows={fields.engagements} completion={completion} />
          <Text style={styles.paragraph}>
            Je soussigné(e), nommé(e) ci-dessus, adhère librement au volet Bienfaiteur et mets à la
            disposition de l’Association LE KARA la somme indiquée, pour la durée mentionnée au présent
            contrat.
          </Text>
          <Text style={styles.bullet}>• À l’échéance de l’engagement, l’Association restitue au Bienfaiteur le nominal correspondant aux sommes versées, dans les conditions prévues par le Règlement intérieur.</Text>
          <Text style={styles.bullet}>• Les commissions sont versées selon le mode convenu ci-dessus.</Text>
          <Text style={styles.bullet}>• Toute demande de restitution anticipée est traitée selon les conditions applicables au contrat.</Text>
          <Text style={styles.bullet}>• Les sommes effectivement restituées sont constatées dans un procès-verbal de liquidation distinct.</Text>
        </MutuelleSection>

        <MutuelleSection title="3. PERSONNE À CONTACTER EN CAS D’URGENCE">
          <FieldTable rows={fields.emergency} completion={completion} />
        </MutuelleSection>

        <MutuelleSection title="4. ACCEPTATION DU RÈGLEMENT ET SIGNATURE">
          <Text style={styles.paragraph}>
            Je reconnais avoir pris connaissance des Statuts, du Règlement Intérieur et des conditions
            du volet Bienfaiteur de la Mutuelle d’Entraide et de Secours Mutuel « LE KARA ». Je
            m’engage à les respecter pendant toute la durée du présent contrat.
          </Text>
          <Text style={styles.paragraph}>Fait à {documentPlace(completion)}, le {readField(fields.signedAt, completion) || EMPTY}</Text>
          <Text style={styles.note}>(Inscrire la mention manuscrite « Lu et approuvé, bon pour engagement »)</Text>

          <MutuelleSignatures
            memberTitle="Le Bienfaiteur"
            memberName={memberName}
            memberSignature={null}
            committeeRole="Le Secrétaire Exécutif"
            committeeSignature={null}
          />
        </MutuelleSection>
      </Page>
    </Document>
  )
}
