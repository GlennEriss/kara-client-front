'use client'

import { Document, Page, Text } from '@react-pdf/renderer'
import React from 'react'

import {
  EMPTY,
  FieldTable,
  MutuelleHeader,
  MutuellePageChrome,
  MutuelleSection,
  MutuelleSignatures,
  display,
  documentPlace,
  field,
  formatAmount,
  formatDate,
  fullNameFrom,
  mutuelleStyles as styles,
  numberToWords,
  toDate,
  type FieldRow,
} from './MutuelleDocumentKit'

/**
 * Demande de remboursement d'un contrat de caisse, signée au moment de la
 * demande (remboursement final ou retrait anticipé), sur le modèle
 * LIQUIDATION.docx.
 *
 * Elle ne vaut pas quittance : le membre n'a encore rien reçu. Les sommes
 * effectivement remises sont constatées ensuite dans le procès-verbal de
 * liquidation, établi par l'admin une fois le remboursement réglé.
 *
 * Même document côté admin et côté membre (copie dans kara-members-front,
 * shared/pdf/DemandeRemboursementPDF.tsx).
 */

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  airtel_money: 'Airtel Money',
  mobicash: 'Mobicash',
  cash: 'Espèces',
  bank_transfer: 'Virement bancaire',
}

export interface RefundRequestPdfData {
  /** « Caisse Imprévue », « Caisse Spéciale »… */
  productLabel: string
  type: 'FINAL' | 'EARLY'
  member: {
    lastName?: string
    firstName?: string
    matricule?: string
    identityDocumentNumber?: string
    phone?: string
  }
  contract: {
    id?: string
    /** Formule (CI) ou type de caisse (CS). */
    formula?: string
    durationMonths?: number
    startDate?: unknown
    endDate?: unknown
  }
  request: {
    amount?: number
    /** Libellé du mode de règlement souhaité. */
    paymentMode?: string
    reason?: string
    requestedAt?: unknown
  }
}

const optionalDate = (value: unknown) => (toDate(value) ? formatDate(value) : '')

export default function DemandeRemboursementPDF({ data }: { data: RefundRequestPdfData }) {
  const isEarly = data.type === 'EARLY'
  const product = data.productLabel
  const amount = Number(data.request.amount ?? 0)
  const memberName = fullNameFrom(data.member.lastName ?? '', data.member.firstName ?? '')
  const title = isEarly
    ? `DEMANDE DE RETRAIT ANTICIPÉ — CONTRAT DE ${product.toUpperCase()}`
    : `DEMANDE DE REMBOURSEMENT FINAL — CONTRAT DE ${product.toUpperCase()}`

  const identification: FieldRow[] = [
    [
      field('member.lastName', 'Nom(s) du membre :', String(data.member.lastName ?? '').toUpperCase()),
      field('member.firstName', 'Prénom(s) du membre :', data.member.firstName),
    ],
    [field('member.matricule', 'Matricule / N° d’Adhérent :', data.member.matricule), field('contract.id', 'Référence du contrat :', data.contract.id)],
    [
      field('contract.formula', `Formule de ${product} :`, data.contract.formula),
      field('contract.duration', 'Durée du contrat :', data.contract.durationMonths ? `${data.contract.durationMonths} mois` : ''),
    ],
    [field('contract.startDate', 'Date de début :', optionalDate(data.contract.startDate)), field('contract.endDate', 'Date de fin :', optionalDate(data.contract.endDate))],
    [field('member.identityDocumentNumber', 'N° CNI/Passeport :', data.member.identityDocumentNumber), field('member.phone', 'Téléphone :', data.member.phone)],
  ]
  const request: FieldRow[] = [
    [
      field('request.type', 'Nature de la demande :', isEarly ? 'Retrait anticipé avant le terme' : 'Remboursement final à l’échéance'),
      field('request.date', 'Date de la demande :', optionalDate(data.request.requestedAt)),
    ],
    [
      field('request.amountDigits', 'Montant demandé (en chiffres) :', amount > 0 ? `${formatAmount(amount)} FCFA` : ''),
      field('request.amountWords', 'Montant demandé (en lettres) :', amount > 0 ? `${numberToWords(amount)} francs CFA` : ''),
    ],
    [field('request.paymentMode', 'Mode de règlement souhaité :', data.request.paymentMode), field('request.reason', 'Motif :', data.request.reason)],
  ]

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <MutuellePageChrome footerLabel={`Demande de remboursement — contrat de ${product}`} />
        <MutuelleHeader title={title} />

        <Text style={styles.preamble}>
          Le présent document formalise la demande du membre relative au contrat de {product}{' '}
          identifié ci-dessous. Il ne vaut pas quittance : les sommes effectivement remises seront
          constatées dans un procès-verbal de liquidation, établi après le règlement.
        </Text>

        <MutuelleSection title="1. IDENTIFICATION DU MEMBRE ET DU CONTRAT">
          <FieldTable rows={identification} />
        </MutuelleSection>

        <MutuelleSection title="2. OBJET DE LA DEMANDE">
          <FieldTable rows={request} />
        </MutuelleSection>

        <MutuelleSection title="3. DÉCLARATION ET SIGNATURE">
          <Text style={styles.paragraph}>
            Je soussigné(e), <Text style={styles.bold}>{display(memberName)}</Text>, sollicite auprès de
            l’Association de Secours Mutuel LE KARA {isEarly ? 'le retrait anticipé' : 'le remboursement'}{' '}
            des sommes versées au titre de mon contrat de {product}, dans les conditions prévues par le
            Règlement intérieur et par le contrat.
          </Text>
          <Text style={styles.paragraph}>
            Je reconnais que la présente demande ne constitue pas une quittance et que le versement
            n’est acquis qu’après son règlement effectif, constaté par procès-verbal de liquidation.
          </Text>
          <Text style={styles.paragraph}>
            Fait à {documentPlace()}, le {optionalDate(data.request.requestedAt) || EMPTY}
          </Text>
          <Text style={styles.note}>(Inscrire la mention manuscrite « Lu et approuvé »)</Text>

          <MutuelleSignatures
            memberTitle="Le Membre demandeur"
            memberName={memberName}
            memberSignature={null}
            committeeRole="Visa du Secrétaire Exécutif (réception de la demande)"
            committeeSignature={null}
          />
        </MutuelleSection>
      </Page>
    </Document>
  )
}
