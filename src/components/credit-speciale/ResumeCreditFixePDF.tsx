'use client'

/**
 * Composant PDF « Résumé de versement – Partie fixe » pour le crédit fixe.
 * Document administratif / comptable, sobre, imprimable, format A4.
 * Uniquement la partie fixe (pas aide compte 1 / compte 2).
 */
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer'

// Enregistrer une police sobre si besoin (optionnel, Helvetica par défaut)
const fontFamily = 'Helvetica'

export interface FixedCreditPayment {
  echeance: string
  dateRemise: string
  montantActuel: string
  montantRemis: string
  montantRestant: string
  heureRemis: string
  moyenTransaction: string
  agent: string
  remarque: string
}

export interface FixedCreditSummary {
  reference?: string
  libelle?: string
  montantFixeInitial: number
  taux: number
  montantTotal: number
  totalVerse: number
  soldeRestant: number
  dateEdition?: string
}

export interface FixedCreditPaymentsPdfProps {
  summary: FixedCreditSummary
  payments: FixedCreditPayment[]
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 28,
    fontFamily,
    fontSize: 9,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 8,
    color: '#555',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryBlock: {
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: '#999',
    padding: 10,
    backgroundColor: '#fafafa',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontWeight: 'bold',
    color: '#333',
    width: '40%',
  },
  summaryValue: {
    color: '#1a1a1a',
    width: '58%',
    textAlign: 'right',
  },
  tableTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  table: {
    width: '100%',
    borderWidth: 0.25,
    borderColor: '#999',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e8e8e8',
    borderBottomWidth: 0.5,
    borderBottomColor: '#999',
    fontWeight: 'bold',
    fontSize: 7,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.25,
    borderBottomColor: '#ccc',
    minHeight: 22,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#f5f5f5',
  },
  cellEcheance: { width: '14%', padding: 4, borderRightWidth: 0.25, borderRightColor: '#ccc' },
  cellDateRemise: { width: '11%', padding: 4, borderRightWidth: 0.25, borderRightColor: '#ccc' },
  cellMontantActuel: { width: '10%', padding: 4, borderRightWidth: 0.25, borderRightColor: '#ccc', textAlign: 'right' },
  cellMontantRemis: { width: '10%', padding: 4, borderRightWidth: 0.25, borderRightColor: '#ccc', textAlign: 'right' },
  cellMontantRestant: { width: '10%', padding: 4, borderRightWidth: 0.25, borderRightColor: '#ccc', textAlign: 'right' },
  cellHeure: { width: '7%', padding: 4, borderRightWidth: 0.25, borderRightColor: '#ccc' },
  cellMoyen: { width: '12%', padding: 4, borderRightWidth: 0.25, borderRightColor: '#ccc' },
  cellAgent: { width: '13%', padding: 4, borderRightWidth: 0.25, borderRightColor: '#ccc' },
  cellRemarque: { width: '13%', padding: 4 },
  footerBlock: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#999',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerLabel: {
    fontWeight: 'bold',
    color: '#333',
  },
  footerValue: {
    color: '#1a1a1a',
  },
})

function formatAmount(n: number): string {
  if (typeof n !== 'number' || isNaN(n)) return '0'
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function formatTaux(n: number): string {
  if (typeof n !== 'number' || isNaN(n)) return '0 %'
  return `${n} %`
}

export function ResumeCreditFixePDF({ summary, payments }: FixedCreditPaymentsPdfProps) {
  const totalVerse = summary.totalVerse
  const soldeRestant = summary.soldeRestant

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>RÉSUMÉ DE VERSEMENT – PARTIE FIXE</Text>
        {summary.reference && (
          <Text style={styles.subtitle}>
            Réf. {summary.reference}
            {summary.dateEdition ? ` — Édition du ${summary.dateEdition}` : ''}
          </Text>
        )}

        <View style={styles.summaryBlock}>
          {summary.libelle && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Libellé / Motif</Text>
              <Text style={styles.summaryValue}>{summary.libelle}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Montant fixe initial</Text>
            <Text style={styles.summaryValue}>{formatAmount(summary.montantFixeInitial)} FCFA</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Taux défini</Text>
            <Text style={styles.summaryValue}>{formatTaux(summary.taux)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Montant total</Text>
            <Text style={styles.summaryValue}>{formatAmount(summary.montantTotal)} FCFA</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total déjà versé</Text>
            <Text style={styles.summaryValue}>{formatAmount(summary.totalVerse)} FCFA</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Solde restant</Text>
            <Text style={styles.summaryValue}>{formatAmount(summary.soldeRestant)} FCFA</Text>
          </View>
        </View>

        <Text style={styles.tableTitle}>VERSEMENTS</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.cellEcheance, { fontWeight: 'bold' }]}>ÉCHÉANCE</Text>
            <Text style={[styles.cellDateRemise, { fontWeight: 'bold' }]}>DATE DE REMISE</Text>
            <Text style={[styles.cellMontantActuel, { fontWeight: 'bold' }]}>MONTANT ACTUEL</Text>
            <Text style={[styles.cellMontantRemis, { fontWeight: 'bold' }]}>MONTANT REMIS</Text>
            <Text style={[styles.cellMontantRestant, { fontWeight: 'bold' }]}>MONTANT RESTANT</Text>
            <Text style={[styles.cellHeure, { fontWeight: 'bold' }]}>HEURE REMIS</Text>
            <Text style={[styles.cellMoyen, { fontWeight: 'bold' }]}>MOYEN DE TRANSACTION</Text>
            <Text style={[styles.cellAgent, { fontWeight: 'bold' }]}>AGENT</Text>
            <Text style={[styles.cellRemarque, { fontWeight: 'bold' }]}>REMARQUE</Text>
          </View>
          {payments.map((row, index) => (
            <View
              key={index}
              style={[styles.tableRow, ...(index % 2 === 1 ? [styles.tableRowAlt] : [])]}
            >
              <Text style={styles.cellEcheance}>{row.echeance || '—'}</Text>
              <Text style={styles.cellDateRemise}>{row.dateRemise || '—'}</Text>
              <Text style={styles.cellMontantActuel}>{row.montantActuel || '—'}</Text>
              <Text style={styles.cellMontantRemis}>{row.montantRemis || '—'}</Text>
              <Text style={styles.cellMontantRestant}>{row.montantRestant || '—'}</Text>
              <Text style={styles.cellHeure}>{row.heureRemis || '—'}</Text>
              <Text style={styles.cellMoyen}>{row.moyenTransaction || '—'}</Text>
              <Text style={styles.cellAgent}>{row.agent || '—'}</Text>
              <Text style={styles.cellRemarque}>{row.remarque || '—'}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footerBlock}>
          <Text style={styles.footerLabel}>Total versé</Text>
          <Text style={styles.footerValue}>{formatAmount(totalVerse)} FCFA</Text>
        </View>
        <View style={[styles.footerBlock, { marginTop: 2 }]}>
          <Text style={styles.footerLabel}>Solde restant</Text>
          <Text style={styles.footerValue}>{formatAmount(soldeRestant)} FCFA</Text>
        </View>
      </Page>
    </Document>
  )
}

export default ResumeCreditFixePDF
