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
  mutuelleStyles,
  numberToWords,
  readField,
  toDate,
  type DocumentCompletion,
  type DocumentField,
  type FieldRow,
} from '@/components/pdf/mutuelle/MutuelleDocumentKit'
import type { CommissionPaymentPlacement, EarlyExitPlacement, PaymentMode, Placement, User } from '@/types/types'
import { roundFcfa } from '@/utils/placementMoney'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import React from 'react'

/**
 * Procès-verbal de liquidation anticipée d'un placement (volet Bienfaiteur),
 * sur le modèle LIQUIDATION.docx comme les autres documents de clôture. Il
 * constate la restitution du capital et de la commission due lorsque le
 * Bienfaiteur sort avant le terme.
 */

const PAYOUT_MODE_LABELS: Record<Placement['payoutMode'], string> = {
  MonthlyCommission_CapitalEnd: 'Commission mensuelle, capital à la fin',
  CapitalPlusCommission_End: 'Capital et commissions à la fin',
}

const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  airtel_money: 'Airtel Money',
  mobicash: 'Mobicash',
  cash: 'Espèces',
  bank_transfer: 'Virement bancaire',
  other: 'Autre',
}

const commissionStyles = StyleSheet.create({
  headRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderLeft: '1px solid #cbd5e1',
    borderRight: '1px solid #cbd5e1',
    borderBottom: '1px solid #cbd5e1',
  },
  headCell: { flex: 1, paddingVertical: 2, paddingHorizontal: 4, fontSize: 8.3, fontWeight: 'bold' },
  cell: { flex: 1, paddingVertical: 2, paddingHorizontal: 4, fontSize: 8.3 },
  index: { flex: 0.4 },
  amount: { textAlign: 'right' },
  caption: { fontSize: 8.5, fontWeight: 'bold', marginTop: 5, marginBottom: 2 },
})

export type PlacementEarlyExitQuittancePdfProps = {
  placement: Placement
  earlyExit: EarlyExitPlacement
  member?: User | null
  commissions: CommissionPaymentPlacement[]
  completion?: DocumentCompletion | null
}

type EarlyExitInput = Omit<PlacementEarlyExitQuittancePdfProps, 'completion'>

/** Commissions versées avant la demande de sortie, rappelées pour mémoire. */
const commissionsPaidBeforeExit = (commissions: CommissionPaymentPlacement[], earlyExit: EarlyExitPlacement) =>
  commissions.filter(
    (commission) => commission.status === 'Paid' && new Date(commission.dueDate) <= new Date(earlyExit.requestedAt),
  )

/** Champs du procès-verbal, partagés avec la modale pour la saisie des informations manquantes. */
export const buildPlacementEarlyExitFields = ({ placement, earlyExit, member }: EarlyExitInput) => {
  const optionalDate = (value: unknown) => (toDate(value) ? formatDate(value) : '')
  const capitalToReturn = roundFcfa(placement.amount)
  const commissionDue = roundFcfa(earlyExit.commissionDue)
  const payoutAmount = roundFcfa(capitalToReturn + commissionDue)
  const paymentMode = earlyExit.paymentMode === 'other'
    ? earlyExit.paymentMethodOther
    : earlyExit.paymentMode ? PAYMENT_MODE_LABELS[earlyExit.paymentMode] : ''
  const paidDate = field('earlyExit.paidDate', 'Date du règlement :', optionalDate(earlyExit.paymentDate ?? earlyExit.withdrawalDate), 'date')

  return {
    payoutAmount,
    member: [
      [
        field('member.lastName', 'Nom(s) du Bienfaiteur :', String(member?.lastName ?? '').toUpperCase() || placement.benefactorName),
        field('member.firstName', 'Prénom(s) :', member?.firstName),
      ],
      [field('member.matricule', 'Matricule / N° d’Adhérent :', member?.matricule || placement.benefactorId), field('placement.id', 'Référence du placement :', placement.id)],
      [field('placement.amount', 'Capital placé :', `${formatAmount(capitalToReturn)} FCFA`), field('placement.rate', 'Taux de commission :', `${placement.rate} %`)],
      [
        field('placement.startDate', 'Date de début :', optionalDate(placement.startDate ?? placement.createdAt), 'date'),
        field('earlyExit.requestedAt', 'Date de la demande de sortie :', optionalDate(earlyExit.requestedAt), 'date'),
      ],
      [
        field('placement.period', 'Durée prévue :', `${placement.periodMonths} mois`),
        field('placement.payoutMode', 'Versement des commissions :', PAYOUT_MODE_LABELS[placement.payoutMode]),
      ],
    ] as FieldRow[],
    liquidation: [
      [field('earlyExit.type', 'Nature de la liquidation :', 'Sortie anticipée avant le terme du placement'), paidDate],
      [
        field('earlyExit.capital', 'Capital restitué :', `${formatAmount(capitalToReturn)} FCFA`),
        field('earlyExit.commissionDue', 'Commission due :', `${formatAmount(commissionDue)} FCFA`),
      ],
      [
        field('earlyExit.amountDigits', 'Montant remis (en chiffres) :', `${formatAmount(payoutAmount)} FCFA`),
        field('earlyExit.amountWords', 'Montant remis (en lettres) :', `${numberToWords(payoutAmount)} francs CFA`),
      ],
      [field('earlyExit.paymentMode', 'Mode de règlement :', paymentMode), field('earlyExit.reason', 'Motif de la sortie :', earlyExit.reason)],
    ] as FieldRow[],
    paidDate,
  }
}

export const listPlacementEarlyExitFields = (input: EarlyExitInput): DocumentField[] => {
  const { member, liquidation } = buildPlacementEarlyExitFields(input)
  return collectDocumentFields({ member, liquidation })
}

export default function PlacementEarlyExitQuittancePDF({
  placement,
  earlyExit,
  member,
  commissions,
  completion,
}: PlacementEarlyExitQuittancePdfProps) {
  const fields = buildPlacementEarlyExitFields({ placement, earlyExit, member, commissions })
  const [[lastNameField, firstNameField]] = fields.member
  const memberName = fullNameFrom(readField(lastNameField, completion), readField(firstNameField, completion))
  const paidDate = readField(fields.paidDate, completion) || EMPTY
  const paidCommissions = commissionsPaidBeforeExit(commissions, earlyExit)

  return (
    <Document>
      <Page size="A4" style={mutuelleStyles.page}>
        <MutuellePageChrome footerLabel="Procès-verbal de liquidation anticipée du placement" />
        <MutuelleHeader title="PROCÈS-VERBAL DE LIQUIDATION ANTICIPÉE DU PLACEMENT (VOLET BIENFAITEUR)" />

        <Text style={mutuelleStyles.preamble}>
          Ce document constate la liquidation anticipée du placement identifié ci-dessous, à la
          demande du Bienfaiteur et avant le terme convenu. Conformément à la loi n°35/62 du 10
          décembre 1962 relative aux associations, aux statuts de LE KARA et aux conditions du
          contrat, ce règlement atteste des sommes effectivement remises au membre.
        </Text>

        <MutuelleSection title="1. IDENTIFICATION DU BIENFAITEUR ET DU PLACEMENT">
          <FieldTable rows={fields.member} completion={completion} />
        </MutuelleSection>

        <MutuelleSection title="2. LIQUIDATION FINANCIÈRE ANTICIPÉE">
          <Text style={mutuelleStyles.paragraph}>
            Le Comité Exécutif certifie avoir vérifié les versements enregistrés et arrêté la
            liquidation suivante. Si au moins un mois s’est écoulé depuis le début du placement, la
            commission d’un mois est due ; sinon, aucune commission n’est due.
          </Text>
          <FieldTable rows={fields.liquidation} completion={completion} />

          {paidCommissions.length > 0 && (
            <>
              <Text style={commissionStyles.caption}>Commissions déjà versées avant la demande</Text>
              <View style={mutuelleStyles.table}>
                <View style={commissionStyles.headRow}>
                  <Text style={[commissionStyles.headCell, commissionStyles.index]}>#</Text>
                  <Text style={commissionStyles.headCell}>Échéance</Text>
                  <Text style={[commissionStyles.headCell, commissionStyles.amount]}>Montant</Text>
                  <Text style={commissionStyles.headCell}>Versée le</Text>
                </View>
                {paidCommissions.map((commission, index) => (
                  <View key={commission.id} style={mutuelleStyles.row}>
                    <Text style={[commissionStyles.cell, commissionStyles.index]}>{index + 1}</Text>
                    <Text style={commissionStyles.cell}>{formatDate(commission.dueDate)}</Text>
                    <Text style={[commissionStyles.cell, commissionStyles.amount]}>
                      {formatAmount(commission.paidAmount ?? commission.amount)} FCFA
                    </Text>
                    <Text style={commissionStyles.cell}>{formatDate(commission.paidAt)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </MutuelleSection>

        <MutuelleSection title="3. DÉCLARATION DE DÉCHARGE ET D’ACQUITTEMENT">
          <Text style={mutuelleStyles.paragraph}>
            Je soussigné(e), <Text style={mutuelleStyles.bold}>{display(memberName)}</Text>, reconnais
            avoir reçu de l’Association de Secours Mutuel LE KARA la somme indiquée ci-dessus au titre
            de la liquidation anticipée de mon placement.
          </Text>
          <Text style={mutuelleStyles.paragraph}>
            Je confirme que ce règlement correspond aux sommes effectivement remises et que le présent
            procès-verbal atteste de la clôture financière du placement, conformément aux conditions
            contractuelles et aux statuts de LE KARA.
          </Text>
          <Text style={mutuelleStyles.paragraph}>Fait à {documentPlace(completion)}, le {paidDate}</Text>
          <Text style={mutuelleStyles.note}>
            (Inscrire la mention manuscrite « Reçu la somme de {formatAmount(fields.payoutAmount)} FCFA au
            titre de la liquidation anticipée du placement pour solde de tout compte »)
          </Text>

          <MutuelleSignatures
            memberTitle="Le Bienfaiteur / Réceptionnaire"
            memberName={memberName}
            memberSignature={null}
            committeeRole="Le Financier Général / Le Secrétaire Exécutif"
            committeeSignature={null}
          />
        </MutuelleSection>
      </Page>
    </Document>
  )
}
