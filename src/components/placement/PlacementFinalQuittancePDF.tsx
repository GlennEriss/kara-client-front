'use client'

import { QuittanceCoverPage, type QuittanceCoverRow } from '@/components/pdf/quittance/QuittanceCoverPage'
import type { CommissionPaymentPlacement, Placement, User } from '@/types/types'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const ACCENT = '#234D65'
const SUCCESS = '#16a34a'
const BORDER = '#cfd8e3'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    color: '#1f2937',
    lineHeight: 1.4,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    color: '#ffffff',
    backgroundColor: ACCENT,
    paddingVertical: 8,
  },
  subtitle: {
    fontSize: 11,
    textAlign: 'center',
    color: '#ffffff',
    backgroundColor: ACCENT,
    paddingBottom: 8,
    marginBottom: 18,
  },
  statusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: SUCCESS,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: ACCENT,
    marginBottom: 6,
  },
  // Tableau des commissions : React-PDF n'a pas de primitive de tableau,
  // on le reconstruit en flexbox (l'équivalent de jspdf-autotable).
  table: { marginBottom: 18 },
  tableHeadRow: { flexDirection: 'row', backgroundColor: ACCENT },
  tableHeadCell: {
    color: '#ffffff',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    padding: 6,
    textAlign: 'center',
  },
  tableRow: { flexDirection: 'row', borderBottom: `1px solid ${BORDER}` },
  tableRowAlt: { backgroundColor: '#f7f9fc' },
  tableCell: { fontSize: 9, padding: 6, textAlign: 'center' },
  cellRight: { textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  colIndex: { width: '10%' },
  colDue: { width: '25%' },
  colAmount: { width: '27%' },
  colStatus: { width: '18%' },
  colPaid: { width: '20%' },

  recapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  recapTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    marginTop: 4,
    borderTop: `1px solid ${BORDER}`,
  },
  bold: { fontFamily: 'Helvetica-Bold' },
  words: { fontSize: 9, marginTop: 6, fontStyle: 'italic' },
  signatures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  signatureBlock: { width: '45%' },
  signaturePlaceholder: {
    width: 170,
    height: 48,
    marginTop: 6,
    border: '1px dashed #94a3b8',
  },
  // Même largeur que le cadre pour être centré dessous.
  unsignedSignerName: { width: 170, marginTop: 4, fontSize: 9, textAlign: 'center', color: '#475569' },
  signatureSubtitle: { fontSize: 8, color: '#475569' },
  dateLine: { marginTop: 24 },
})

const formatAmount = (amount: number): string =>
  amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

const formatDate = (value?: Date | string | null): string => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : format(d, 'dd/MM/yyyy', { locale: fr })
}

export type PlacementFinalQuittancePdfProps = {
  placement: Placement
  member?: User | null
  commissions: CommissionPaymentPlacement[]
  /** Montant total en toutes lettres (calculé par l'appelant). */
  amountInWords: string
  /** Ville d'émission. */
  city?: string
}

export default function PlacementFinalQuittancePDF({
  placement,
  member,
  commissions,
  amountInWords,
  city = 'Libreville',
}: PlacementFinalQuittancePdfProps) {
  const memberName = member
    ? `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim()
    : `Bienfaiteur #${placement.benefactorId.slice(0, 8)}`

  const totalCommissions = commissions.reduce((sum, c) => sum + c.amount, 0)
  const totalPaid = placement.amount + totalCommissions

  const payoutModeLabel =
    placement.payoutMode === 'MonthlyCommission_CapitalEnd'
      ? 'Commission mensuelle + Capital à la fin'
      : 'Capital + Commissions à la fin'

  const startDate = formatDate(placement.startDate ?? placement.createdAt)
  const endDate = formatDate(placement.endDate)

  const memberRows: QuittanceCoverRow[] = [
    {
      kind: 'pair',
      left: { label: 'Bienfaiteur', value: memberName },
      right: { label: 'N° Placement', value: placement.id.slice(-8).toUpperCase() },
    },
    {
      kind: 'pair',
      left: { label: 'Montant placé', value: `${formatAmount(placement.amount)} FCFA` },
      right: { label: 'Taux', value: `${placement.rate}%` },
    },
    {
      kind: 'pair',
      left: { label: 'Date de début', value: startDate },
      right: { label: 'Date de fin', value: endDate },
    },
    {
      kind: 'pair',
      left: { label: 'Période', value: `${placement.periodMonths} mois` },
      right: { label: 'Mode', value: payoutModeLabel },
    },
  ]

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>QUITTANCE FINALE</Text>
        <Text style={styles.subtitle}>Placement — KARA</Text>

        <QuittanceCoverPage
          memberSectionTitle="INFORMATIONS DU PLACEMENT"
          memberRows={memberRows}
        />

        <View style={styles.statusBanner}>
          <Text style={styles.statusText}>PLACEMENT TERMINÉ</Text>
          <Text style={styles.statusText}>{formatAmount(totalPaid)} FCFA</Text>
        </View>

        {commissions.length > 0 && (
          <View style={styles.table}>
            <Text style={styles.sectionTitle}>DÉTAILS DES COMMISSIONS</Text>
            <View style={styles.tableHeadRow}>
              <Text style={[styles.tableHeadCell, styles.colIndex]}>#</Text>
              <Text style={[styles.tableHeadCell, styles.colDue]}>Échéance</Text>
              <Text style={[styles.tableHeadCell, styles.colAmount]}>Montant</Text>
              <Text style={[styles.tableHeadCell, styles.colStatus]}>Statut</Text>
              <Text style={[styles.tableHeadCell, styles.colPaid]}>Payée le</Text>
            </View>
            {commissions.map((commission, index) => (
              <View
                key={commission.id ?? index}
                style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}
                wrap={false}
              >
                <Text style={[styles.tableCell, styles.colIndex]}>{index + 1}</Text>
                <Text style={[styles.tableCell, styles.colDue]}>{formatDate(commission.dueDate)}</Text>
                <Text style={[styles.tableCell, styles.colAmount, styles.cellRight]}>
                  {formatAmount(commission.amount)} FCFA
                </Text>
                <Text style={[styles.tableCell, styles.colStatus]}>
                  {commission.status === 'Paid' ? 'Payée' : 'Due'}
                </Text>
                <Text style={[styles.tableCell, styles.colPaid]}>{formatDate(commission.paidAt)}</Text>
              </View>
            ))}
          </View>
        )}

        <View wrap={false}>
          <Text style={styles.sectionTitle}>RÉCAPITULATIF</Text>
          <View style={styles.recapRow}>
            <Text>Capital placé</Text>
            <Text>{formatAmount(placement.amount)} FCFA</Text>
          </View>
          <View style={styles.recapRow}>
            <Text>Total commissions</Text>
            <Text>{formatAmount(totalCommissions)} FCFA</Text>
          </View>
          <View style={styles.recapTotal}>
            <Text style={styles.bold}>Montant total restitué</Text>
            <Text style={styles.bold}>{formatAmount(totalPaid)} FCFA</Text>
          </View>
          <Text style={styles.words}>Montant en lettres : {amountInWords} francs CFA</Text>

          <Text style={styles.dateLine}>
            Fait à {city}, le {format(new Date(), 'dd MMMM yyyy', { locale: fr })}
          </Text>

          <View style={styles.signatures}>
            <View style={styles.signatureBlock}>
              <Text style={styles.bold}>Signature du Secrétaire exécutif</Text>
              <View style={styles.signaturePlaceholder} />
            </View>
            <View style={styles.signatureBlock}>
              <Text style={styles.bold}>Signature du Bienfaiteur</Text>
              <Text style={styles.signatureSubtitle}>(Précédée de la mention Lu et approuvé)</Text>
              <View style={styles.signaturePlaceholder} />
              <Text style={styles.unsignedSignerName}>{memberName}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
