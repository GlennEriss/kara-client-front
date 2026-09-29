'use client'

import {
  DEFAULT_DOCUMENT_PLACE,
  EMPTY,
  FieldTable,
  MutuelleHeader,
  MutuellePageChrome,
  MutuelleSection,
  MutuelleSignatures,
  collectDocumentFields,
  display,
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
import type { CommissionPaymentPlacement, Placement, User } from '@/types/types'
import { roundFcfa, sumCommissionAmounts } from '@/utils/placementMoney'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import React from 'react'

/**
 * Procès-verbal de liquidation du placement (volet Bienfaiteur), sur le modèle
 * LIQUIDATION.docx comme les caisses. Il constate la restitution du capital au
 * terme du placement ; les commissions déjà versées sont rappelées pour
 * mémoire, avec leur détail.
 */

const PAYOUT_MODE_LABELS: Record<Placement['payoutMode'], string> = {
  MonthlyCommission_CapitalEnd: 'Commission mensuelle, capital à la fin',
  CapitalPlusCommission_End: 'Capital et commissions à la fin',
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

export type PlacementFinalQuittancePdfProps = {
  placement: Placement
  member?: User | null
  commissions: CommissionPaymentPlacement[]
  /** Cumul historique (capital restitué + commissions payées) en toutes lettres. */
  amountInWords: string
  /** Ville d'émission par défaut, remplacée par le lieu saisi dans la modale. */
  city?: string
  completion?: DocumentCompletion | null
}

type PlacementLiquidationInput = Pick<PlacementFinalQuittancePdfProps, 'placement' | 'member' | 'commissions' | 'amountInWords'>

/** Champs du procès-verbal, partagés avec la modale pour la saisie des informations manquantes. */
export const buildPlacementLiquidationFields = ({ placement, member, commissions, amountInWords }: PlacementLiquidationInput) => {
  const optionalDate = (value: unknown) => (toDate(value) ? formatDate(value) : '')
  const paidCommissions = commissions.filter((commission) => commission.status === 'Paid')
  const capitalRestituted = roundFcfa(placement.capitalRepaidAmount ?? placement.amount)
  const paidCommissionsTotal = sumCommissionAmounts(
    paidCommissions.map((commission) => ({
      ...commission,
      amount: roundFcfa(commission.paidAmount ?? commission.amount),
    })),
  )
  const historicalTotalPaid = roundFcfa(capitalRestituted + paidCommissionsTotal)
  const paidDate = field('placement.paidDate', 'Date du règlement :', optionalDate(placement.capitalRepaidAt ?? placement.endDate), 'date')

  return {
    paidCommissions,
    capitalRestituted,
    member: [
      [
        field('member.lastName', 'Nom(s) du Bienfaiteur :', String(member?.lastName ?? '').toUpperCase() || placement.benefactorName),
        field('member.firstName', 'Prénom(s) :', member?.firstName),
      ],
      [field('member.matricule', 'Matricule / N° d’Adhérent :', member?.matricule || placement.benefactorId), field('placement.id', 'Référence du placement :', placement.id)],
      [field('placement.amount', 'Capital placé :', `${formatAmount(placement.amount)} FCFA`), field('placement.rate', 'Taux de commission :', `${placement.rate} %`)],
      [
        field('placement.startDate', 'Date de début :', optionalDate(placement.startDate ?? placement.createdAt), 'date'),
        field('placement.endDate', 'Date de fin :', optionalDate(placement.endDate), 'date'),
      ],
      [
        field('placement.period', 'Durée :', `${placement.periodMonths} mois`),
        field('placement.payoutMode', 'Versement des commissions :', PAYOUT_MODE_LABELS[placement.payoutMode]),
      ],
    ] as FieldRow[],
    liquidation: [
      [field('placement.liquidationType', 'Nature de la liquidation :', 'Restitution du capital au terme du placement'), paidDate],
      [
        field('placement.capitalDigits', 'Capital restitué (en chiffres) :', `${formatAmount(capitalRestituted)} FCFA`),
        field('placement.capitalWords', 'Capital restitué (en lettres) :', `${numberToWords(capitalRestituted)} francs CFA`),
      ],
      [
        field('placement.commissionsPaid', 'Commissions versées antérieurement :', `${formatAmount(paidCommissionsTotal)} FCFA`),
        field('placement.historicalTotal', 'Cumul historique versé :', `${formatAmount(historicalTotalPaid)} FCFA (${amountInWords} francs CFA)`),
      ],
    ] as FieldRow[],
    paidDate,
  }
}

export const listPlacementLiquidationFields = (input: PlacementLiquidationInput): DocumentField[] => {
  const { member, liquidation } = buildPlacementLiquidationFields(input)
  return collectDocumentFields({ member, liquidation })
}

export default function PlacementFinalQuittancePDF({
  placement,
  member,
  commissions,
  amountInWords,
  city = DEFAULT_DOCUMENT_PLACE,
  completion,
}: PlacementFinalQuittancePdfProps) {
  const fields = buildPlacementLiquidationFields({ placement, member, commissions, amountInWords })
  const [[lastNameField, firstNameField]] = fields.member
  const memberName = fullNameFrom(readField(lastNameField, completion), readField(firstNameField, completion))
  const { paidCommissions, capitalRestituted } = fields
  const paidDate = readField(fields.paidDate, completion) || EMPTY
  const place = completion?.place?.trim() || city

  return (
    <Document>
      <Page size="A4" style={mutuelleStyles.page}>
        <MutuellePageChrome footerLabel="Procès-verbal de liquidation du placement" />
        <MutuelleHeader title="PROCÈS-VERBAL DE LIQUIDATION DU PLACEMENT (VOLET BIENFAITEUR)" />

        <Text style={mutuelleStyles.preamble}>
          Ce document constate la liquidation du placement identifié ci-dessous et la restitution au
          Bienfaiteur du capital mis à la disposition de l’Association. Conformément à la loi n°35/62
          du 10 décembre 1962 relative aux associations, aux statuts de LE KARA et aux conditions du
          contrat, ce règlement atteste des sommes effectivement remises au membre.
        </Text>

        <MutuelleSection title="1. IDENTIFICATION DU BIENFAITEUR ET DU PLACEMENT">
          <FieldTable rows={fields.member} completion={completion} />
        </MutuelleSection>

        <MutuelleSection title="2. LIQUIDATION FINANCIÈRE DU PLACEMENT">
          <Text style={mutuelleStyles.paragraph}>
            Le Comité Exécutif certifie avoir vérifié les versements enregistrés et arrêté la
            liquidation suivante :
          </Text>
          <FieldTable rows={fields.liquidation} completion={completion} />

          {paidCommissions.length > 0 && (
            <>
              <Text style={commissionStyles.caption}>Détail des commissions versées</Text>
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
            avoir reçu de l’Association de Secours Mutuel LE KARA le capital indiqué ci-dessus au titre
            de la liquidation de mon placement, les commissions ayant été perçues aux dates rappelées.
          </Text>
          <Text style={mutuelleStyles.paragraph}>
            Je confirme que ce règlement correspond aux sommes effectivement remises et que le présent
            procès-verbal atteste de la clôture financière du placement, conformément aux conditions
            contractuelles et aux statuts de LE KARA.
          </Text>
          <Text style={mutuelleStyles.paragraph}>Fait à {place}, le {paidDate}</Text>
          <Text style={mutuelleStyles.note}>
            (Inscrire la mention manuscrite « Reçu la somme de {formatAmount(capitalRestituted)} FCFA au
            titre de la liquidation du placement pour solde de tout compte »)
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
