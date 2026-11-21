// Modèle membre : kara-members-front/features/caisse-imprevue/components/pdf/RecognitionDocumentPDF.tsx.
// Police Times PDF intégrée pour le rendu serveur ; contenu et tableau conservés.
'use client'

import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import type { ContractCI } from '@/types/types'

const s = StyleSheet.create({
  page: { fontFamily: 'Times-Roman', fontSize: 11, padding: 40, color: '#111' },
  center: { textAlign: 'center', marginBottom: 4 },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  para: { marginBottom: 8, lineHeight: 1.5 },
  bold: { fontWeight: 'bold' },
  sectionTitle: { fontWeight: 'bold', marginBottom: 6, marginTop: 12 },
  table: { marginBottom: 12 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#888' },
  rowHighlight: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#888',
    backgroundColor: '#dbeafe',
  },
  thead: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderBottomWidth: 1,
    borderColor: '#888',
  },
  cell: { borderRightWidth: 0.5, borderColor: '#888', padding: '3 4', flex: 1 },
  cellRight: {
    borderRightWidth: 0.5,
    borderColor: '#888',
    padding: '3 4',
    flex: 1,
    textAlign: 'right',
  },
  cellLast: { padding: '3 4', flex: 1, textAlign: 'right' },
  forfaitNote: { fontSize: 10, marginBottom: 24 },
  signatureRow: { flexDirection: 'row', marginTop: 48, gap: 40 },
  signatureBlock: { flex: 1 },
  signatureLabel: { fontSize: 9, color: '#555', marginBottom: 4 },
  signatureLine: {
    borderTopWidth: 0.5,
    borderColor: '#555',
    marginTop: 32,
    paddingTop: 2,
  },
  signatureLineName: { fontSize: 9, color: '#555' },
})

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n)
}

const STANDARD_FORFAITS = [
  {
    code: 'A',
    montant: 10000,
    nominal: 120000,
    supportMin: 30000,
    supportMax: 100000,
  },
  {
    code: 'B',
    montant: 20000,
    nominal: 240000,
    supportMin: 60000,
    supportMax: 200000,
  },
  {
    code: 'C',
    montant: 30000,
    nominal: 360000,
    supportMin: 90000,
    supportMax: 300000,
  },
  {
    code: 'D',
    montant: 40000,
    nominal: 480000,
    supportMin: 120000,
    supportMax: 400000,
  },
  {
    code: 'E',
    montant: 50000,
    nominal: 600000,
    supportMin: 150000,
    supportMax: 500000,
  },
]

type Props = {
  contract: ContractCI
  datePriseAide: Date
  dateProchaineEcheance: Date
}

export function RecognitionDocumentPDF({
  contract,
  datePriseAide,
  dateProchaineEcheance,
}: Props) {
  const memberName =
    [contract.memberFirstName, contract.memberLastName]
      .filter(Boolean)
      .join(' ') || '—'

  const isStandard = STANDARD_FORFAITS.some(
    (f) => f.code === contract.subscriptionCICode,
  )
  const dynamicForfait = !isStandard
    ? {
        code: `${contract.subscriptionCICode} - ${fmt(contract.subscriptionCIAmountPerMonth)}`,
        nominal: contract.subscriptionCINominal,
        supportMin: contract.subscriptionCISupportMin,
        supportMax: contract.subscriptionCISupportMax,
      }
    : null

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>ASSOCIATION LE KARA — CAISSE IMPRÉVUE</Text>
        <Text style={s.subtitle}>Reconnaissance d&apos;accompagnement</Text>

        <Text style={s.para}>
          Je soussigné(e), <Text style={s.bold}>{memberName}</Text>, matricule{' '}
          <Text style={s.bold}>{contract.memberId}</Text>, sollicite par la
          présente une aide financière au titre de mon contrat Caisse Imprévue{' '}
          <Text style={s.bold}>{contract.id}</Text>, en date du{' '}
          <Text style={s.bold}>
            {format(datePriseAide, 'd MMMM yyyy', { locale: fr })}
          </Text>
          .
        </Text>

        <Text style={s.para}>
          Je m&apos;engage à effectuer le paiement de la prochaine contribution
          prévu en date du{' '}
          <Text style={s.bold}>
            {format(dateProchaineEcheance, 'd MMMM yyyy', { locale: fr })}
          </Text>
          , et à respecter le calendrier de remboursement convenu avec
          l&apos;association.
        </Text>

        <Text style={s.para}>
          Je reconnais que le montant de l&apos;aide accordé sera déduit des
          trois (3) derniers mois de mon contrat conformément aux conditions de
          la Caisse Imprévue de l&apos;association LE KARA.
        </Text>

        <Text style={s.sectionTitle}>Type d&apos;accompagnement sollicité</Text>

        <View style={s.table}>
          <View style={s.thead}>
            <Text style={s.cell}>Forfait</Text>
            <Text style={s.cellRight}>Nominal</Text>
            <Text style={s.cellRight}>Appui min.</Text>
            <Text style={s.cellLast}>Appui max.</Text>
          </View>
          {STANDARD_FORFAITS.map((f) => {
            const highlighted = f.code === contract.subscriptionCICode
            return (
              <View key={f.code} style={highlighted ? s.rowHighlight : s.row}>
                <Text style={[s.cell, highlighted ? s.bold : {}]}>
                  {f.code} — {fmt(f.montant)} FCFA / mois
                </Text>
                <Text style={[s.cellRight, highlighted ? s.bold : {}]}>
                  {fmt(f.nominal)}
                </Text>
                <Text style={[s.cellRight, highlighted ? s.bold : {}]}>
                  {fmt(f.supportMin)}
                </Text>
                <Text style={[s.cellLast, highlighted ? s.bold : {}]}>
                  {fmt(f.supportMax)}
                </Text>
              </View>
            )
          })}
          {dynamicForfait && (
            <View style={s.rowHighlight}>
              <Text style={[s.cell, s.bold]}>{dynamicForfait.code}</Text>
              <Text style={[s.cellRight, s.bold]}>
                {fmt(dynamicForfait.nominal)}
              </Text>
              <Text style={[s.cellRight, s.bold]}>
                {fmt(dynamicForfait.supportMin)}
              </Text>
              <Text style={[s.cellLast, s.bold]}>
                {fmt(dynamicForfait.supportMax)}
              </Text>
            </View>
          )}
        </View>

        <Text style={s.forfaitNote}>
          <Text style={s.bold}>Forfait sélectionné : </Text>
          {contract.subscriptionCICode}
          {contract.subscriptionCILabel
            ? ` — ${contract.subscriptionCILabel}`
            : ''}
        </Text>

        <View style={s.signatureRow}>
          <View style={s.signatureBlock}>
            <Text style={s.signatureLabel}>Fait à _______________</Text>
            <Text style={s.signatureLabel}>
              Le {format(datePriseAide, 'd MMMM yyyy', { locale: fr })}
            </Text>
          </View>
          <View style={s.signatureBlock}>
            <Text style={s.signatureLabel}>Signature du membre :</Text>
            <View style={s.signatureLine}>
              <Text style={s.signatureLineName}>{memberName}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
