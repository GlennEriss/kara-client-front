import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 32 },
  title: { fontSize: 18, marginBottom: 12 },
  section: { marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 },
  label: { color: '#555' },
  value: { fontWeight: 700 },
})

export function PaymentReceiptDoc({ contract, payment }: { contract: any; payment: any }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Reçu de paiement — Caisse Spéciale</Text>
        <View style={styles.section}>
          <View style={styles.row}><Text style={styles.label}>Contrat</Text><Text style={styles.value}>#{String(contract.id).slice(-6)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Membre</Text><Text style={styles.value}>{contract.memberId}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Mensualité</Text><Text style={styles.value}>{(contract.monthlyAmount||0).toLocaleString('fr-FR')} FCFA</Text></View>
        </View>
        <View style={styles.section}>
          <View style={styles.row}><Text style={styles.label}>Mois payé</Text><Text style={styles.value}>M{(payment.dueMonthIndex||0)+1}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Échéance</Text><Text style={styles.value}>{payment.dueAt ? new Date(payment.dueAt).toLocaleDateString('fr-FR') : '—'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Payé le</Text><Text style={styles.value}>{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('fr-FR') : '—'}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Montant</Text><Text style={styles.value}>{(payment.amount||contract.monthlyAmount||0).toLocaleString('fr-FR')} FCFA</Text></View>
          {payment.penaltyApplied ? (
            <View style={styles.row}><Text style={styles.label}>Pénalité</Text><Text style={styles.value}>{payment.penaltyApplied.toLocaleString('fr-FR')} FCFA</Text></View>
          ) : null}
        </View>
        <Text style={{ fontSize: 10, color: '#666', marginTop: 16 }}>Document généré automatiquement — Kara</Text>
      </Page>
    </Document>
  )
}

export function RefundAttestationDoc({ contract, refund }: { contract: any; refund: any }) {
  const total = (refund.amountNominal||0) + (refund.amountBonus||0)
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Attestation de remboursement — Caisse Spéciale</Text>
        <View style={styles.section}>
          <View style={styles.row}><Text style={styles.label}>Contrat</Text><Text style={styles.value}>#{String(contract.id).slice(-6)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Membre</Text><Text style={styles.value}>{contract.memberId}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Type</Text><Text style={styles.value}>{refund.type}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Statut</Text><Text style={styles.value}>{refund.status}</Text></View>
        </View>
        <View style={styles.section}>
          <View style={styles.row}><Text style={styles.label}>Nominal</Text><Text style={styles.value}>{(refund.amountNominal||0).toLocaleString('fr-FR')} FCFA</Text></View>
          <View style={styles.row}><Text style={styles.label}>Bonus</Text><Text style={styles.value}>{(refund.amountBonus||0).toLocaleString('fr-FR')} FCFA</Text></View>
          <View style={styles.row}><Text style={styles.label}>Total</Text><Text style={styles.value}>{total.toLocaleString('fr-FR')} FCFA</Text></View>
          <View style={styles.row}><Text style={styles.label}>Date</Text><Text style={styles.value}>{new Date().toLocaleDateString('fr-FR')}</Text></View>
        </View>
        <Text style={{ fontSize: 10, color: '#666', marginTop: 16 }}>Document généré automatiquement — Kara</Text>
      </Page>
    </Document>
  )
}

