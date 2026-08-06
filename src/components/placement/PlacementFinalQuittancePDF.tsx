'use client'

import { QuittanceCoverPage, type QuittanceCoverRow } from '@/components/pdf/quittance/QuittanceCoverPage'
import type { CommissionPaymentPlacement, Placement, User } from '@/types/types'
import { roundFcfa, sumCommissionAmounts } from '@/utils/placementMoney'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// Charte des quittances KARA — mêmes jetons que QuittanceCaisseSpecialePDF.
const ACCENT_BLUE = '#1f4f68'
const BORDER_SOFT = '#cbd5e1'
const TEXT_PRIMARY = '#1f2937'
const TEXT_MUTED = '#475569'
const SUCCESS = '#16a34a'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 11,
    paddingLeft: 30,
    paddingRight: 30,
    paddingTop: 50,
    paddingBottom: 40,
    color: TEXT_PRIMARY,
  },
  // Cadre de page : signature visuelle des quittances de l'association.
  pageContainer: {
    width: '100%',
    height: '100%',
    border: '1px solid #94a3b8',
    borderRadius: 2,
    position: 'relative',
    padding: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    border: `1px solid ${ACCENT_BLUE}`,
    backgroundColor: ACCENT_BLUE,
    color: '#ffffff',
    paddingVertical: 5,
  },
  subtitle: {
    fontSize: 11,
    textAlign: 'center',
    color: '#ffffff',
    backgroundColor: ACCENT_BLUE,
    borderLeft: `1px solid ${ACCENT_BLUE}`,
    borderRight: `1px solid ${ACCENT_BLUE}`,
    borderBottom: `1px solid ${ACCENT_BLUE}`,
    paddingBottom: 6,
    marginBottom: 16,
  },
  statusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: SUCCESS,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: ACCENT_BLUE,
    marginBottom: 6,
  },
  // Tableau des reversements : React-PDF n'a pas de primitive de tableau,
  // on le reconstruit en flexbox (l'équivalent de jspdf-autotable).
  table: { marginBottom: 16 },
  tableHeadRow: { flexDirection: 'row', backgroundColor: ACCENT_BLUE },
  tableHeadCell: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
    padding: 6,
    textAlign: 'center',
  },
  tableRow: { flexDirection: 'row', borderBottom: `1px solid ${BORDER_SOFT}` },
  tableRowAlt: { backgroundColor: '#f8fafc' },
  tableCell: { fontSize: 9, padding: 6, textAlign: 'center', color: TEXT_PRIMARY },
  cellRight: { textAlign: 'right', fontWeight: 'bold' },
  colIndex: { width: '10%' },
  colDue: { width: '25%' },
  colAmount: { width: '27%' },
  colStatus: { width: '18%' },
  colPaid: { width: '20%' },

  recapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    lineHeight: 1.45,
  },
  recapTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    marginTop: 4,
    borderTop: `1px solid ${BORDER_SOFT}`,
  },
  bold: { fontWeight: 'bold' },
  words: { fontSize: 9, marginTop: 6, fontStyle: 'italic', color: TEXT_MUTED },
  historicalNote: {
    fontSize: 8,
    marginTop: 7,
    padding: 6,
    color: TEXT_MUTED,
    backgroundColor: '#f8fafc',
    border: `1px solid ${BORDER_SOFT}`,
  },
  // Panneau de signatures encadré, comme la quittance caisse spéciale.
  signatures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 26,
    minHeight: 120,
    border: `1px solid ${BORDER_SOFT}`,
    backgroundColor: '#f8fafc',
    padding: 15,
  },
  signatureBlock: { width: '48%', justifyContent: 'space-between' },
  signatureBlockRight: { width: '48%', justifyContent: 'space-between', alignItems: 'flex-end' },
  signatureTitle: { fontWeight: 'bold', color: TEXT_PRIMARY },
  signatureTitleRight: { fontWeight: 'bold', color: TEXT_PRIMARY, textAlign: 'right' },
  signatureSubtitle: { fontSize: 8, color: TEXT_MUTED },
  signaturePlaceholder: {
    width: 185,
    height: 56,
    marginTop: 12,
    border: '1px dashed #94a3b8',
    backgroundColor: '#ffffff',
  },
  // Même largeur que le cadre pour être centré dessous.
  unsignedSignerName: {
    width: 185,
    marginTop: 4,
    fontSize: 9,
    textAlign: 'center',
    color: TEXT_MUTED,
  },
  dateText: { fontSize: 9, marginTop: 12, color: TEXT_MUTED },
  dateLine: { marginTop: 20, lineHeight: 1.45 },
  pageNumber: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    color: TEXT_MUTED,
  },
})

const formatAmount = (amount: number): string =>
  roundFcfa(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

const formatDate = (value?: Date | string | null): string => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : format(d, 'dd/MM/yyyy', { locale: fr })
}

export type PlacementFinalQuittancePdfProps = {
  placement: Placement
  member?: User | null
  commissions: CommissionPaymentPlacement[]
  /** Cumul historique (capital restitué + commissions payées) en toutes lettres. */
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

  const paidCommissions = commissions.filter((commission) => commission.status === 'Paid')
  const capitalRestituted = roundFcfa(placement.amount)
  const paidCommissionsTotal = sumCommissionAmounts(
    paidCommissions.map((commission) => ({
      ...commission,
      amount: roundFcfa(commission.paidAmount ?? commission.amount),
    })),
  )
  const historicalTotalPaid = roundFcfa(capitalRestituted + paidCommissionsTotal)

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
      left: { label: 'Capital placé', value: `${formatAmount(capitalRestituted)} FCFA` },
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
        <View style={styles.pageContainer}>
        <Text style={styles.title}>QUITTANCE FINALE</Text>
        <Text style={styles.subtitle}>Placement — KARA</Text>

        <QuittanceCoverPage
          memberSectionTitle="INFORMATIONS DU PLACEMENT"
          memberRows={memberRows}
        />

        <View style={styles.statusBanner}>
          <Text style={styles.statusText}>CAPITAL RESTITUÉ</Text>
          <Text style={styles.statusText}>{formatAmount(capitalRestituted)} FCFA</Text>
        </View>

        {paidCommissions.length > 0 && (
          <View style={styles.table}>
            <Text style={styles.sectionTitle}>COMMISSIONS PAYÉES — CUMUL HISTORIQUE</Text>
            <View style={styles.tableHeadRow}>
              <Text style={[styles.tableHeadCell, styles.colIndex]}>#</Text>
              <Text style={[styles.tableHeadCell, styles.colDue]}>Échéance</Text>
              <Text style={[styles.tableHeadCell, styles.colAmount]}>Montant</Text>
              <Text style={[styles.tableHeadCell, styles.colStatus]}>Statut</Text>
              <Text style={[styles.tableHeadCell, styles.colPaid]}>Payée le</Text>
            </View>
            {paidCommissions.map((commission, index) => (
              <View
                key={commission.id ?? index}
                style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}
                wrap={false}
              >
                <Text style={[styles.tableCell, styles.colIndex]}>{index + 1}</Text>
                <Text style={[styles.tableCell, styles.colDue]}>{formatDate(commission.dueDate)}</Text>
                <Text style={[styles.tableCell, styles.colAmount, styles.cellRight]}>
                  {formatAmount(commission.paidAmount ?? commission.amount)} FCFA
                </Text>
                <Text style={[styles.tableCell, styles.colStatus]}>Payée</Text>
                <Text style={[styles.tableCell, styles.colPaid]}>{formatDate(commission.paidAt)}</Text>
              </View>
            ))}
          </View>
        )}

        <View wrap={false}>
          <Text style={styles.sectionTitle}>RÉCAPITULATIF</Text>
          <View style={styles.recapRow}>
            <Text>Capital restitué</Text>
            <Text>{formatAmount(capitalRestituted)} FCFA</Text>
          </View>
          <View style={styles.recapRow}>
            <Text>Commissions payées cumulées</Text>
            <Text>{formatAmount(paidCommissionsTotal)} FCFA</Text>
          </View>
          <View style={styles.recapTotal}>
            <Text style={styles.bold}>Cumul historique versé</Text>
            <Text style={styles.bold}>{formatAmount(historicalTotalPaid)} FCFA</Text>
          </View>
          <Text style={styles.words}>Montant en lettres : {amountInWords} francs CFA</Text>
          <Text style={styles.historicalNote}>
            Ce cumul historique additionne le capital restitué et les commissions payées antérieurement.
            Il ne correspond pas au seul versement final.
          </Text>

          <Text style={styles.dateLine}>
            Fait à {city}, le {format(new Date(), 'dd MMMM yyyy', { locale: fr })}
          </Text>

          <View style={styles.signatures}>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureTitle}>Signature du Secrétaire exécutif</Text>
              <View style={styles.signaturePlaceholder} />
              <Text style={styles.dateText}>Date : ____________________</Text>
            </View>
            <View style={styles.signatureBlockRight}>
              <Text style={styles.signatureTitleRight}>
                Signature du Bienfaiteur (Précédée de la mention Lu et Approuvé)
              </Text>
              <View style={styles.signaturePlaceholder} />
              <Text style={styles.unsignedSignerName}>{memberName}</Text>
              <Text style={styles.dateText}>Date : ____________________</Text>
            </View>
          </View>
        </View>
        </View>
        <Text style={styles.pageNumber} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  )
}
