'use client'

import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import React from 'react'

import { REGLEMENT_ENTETE } from '@/constantes/reglement-interieur'

/**
 * Procès-verbal de liquidation du contrat de Caisse Imprévue. Ce document est
 * distinct de la quittance d'allocation de
 * secours : il constate la restitution liée à un contrat arrivé à son terme
 * ou clôturé par retrait anticipé.
 */

// Même repère que le Règlement intérieur : le pied de page est positionné
// depuis le haut car react-pdf gère mal `bottom` avec le line-height hérité.
const A4_HEIGHT = 841.89

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 9.5,
    paddingTop: 24,
    paddingBottom: 34,
    paddingHorizontal: 42,
    lineHeight: 1.3,
    color: '#1f2937',
  },
  pageNumber: {
    position: 'absolute',
    top: A4_HEIGHT - 22,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8.5,
    lineHeight: 1,
    color: '#475569',
  },
  footer: {
    position: 'absolute',
    top: A4_HEIGHT - 34,
    left: 42,
    right: 42,
    fontSize: 7.5,
    lineHeight: 1,
    color: '#475569',
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 52,
    height: 52,
    objectFit: 'cover',
    marginBottom: 5,
  },
  association: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f4f68',
  },
  devise: {
    fontSize: 8.5,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#475569',
    marginTop: 2,
  },
  siege: {
    fontSize: 8,
    textAlign: 'center',
    color: '#475569',
    marginTop: 2,
  },
  docTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f4f68',
    textDecoration: 'underline',
    marginTop: 7,
  },
  preamble: {
    fontSize: 9.2,
    fontStyle: 'italic',
    textAlign: 'justify',
    marginBottom: 6,
    color: '#1f2937',
  },
  section: { marginBottom: 6 },
  sectionTitle: {
    backgroundColor: '#1f4f68',
    color: 'white',
    textAlign: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    fontSize: 9.5,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 2.5,
    paddingHorizontal: 4,
    borderLeft: '1px solid #cbd5e1',
    borderRight: '1px solid #cbd5e1',
    borderBottom: '1px solid #cbd5e1',
  },
  cell: { flex: 1, fontSize: 9, paddingRight: 6 },
  bold: { fontWeight: 'bold' },
  paragraph: { fontSize: 9.2, textAlign: 'justify', lineHeight: 1.28, marginBottom: 4 },
  handwrittenNote: { fontSize: 8.4, fontStyle: 'italic', color: '#334155', marginTop: 1 },
  signatures: { flexDirection: 'row', marginTop: 7 },
  signatureCell: { flex: 1, paddingRight: 16 },
  signatureTitle: { fontSize: 9.2, fontWeight: 'bold', marginBottom: 4 },
  signatureRole: { fontSize: 8.3, color: '#475569', marginBottom: 3 },
  signatureLine: {
    borderBottom: '1px solid #64748b',
    height: 48,
    marginBottom: 4,
    justifyContent: 'flex-end',
  },
  signatureImage: { width: 150, height: 44, objectFit: 'contain' },
  signatureName: { fontSize: 8.5, fontWeight: 'bold', textAlign: 'center', marginBottom: 2 },
  signatureHint: { fontSize: 8, fontStyle: 'italic', textAlign: 'center', color: '#64748b' },
})

const EMPTY = '........................................'

const isPresent = (value?: string | null): value is string => !!value && value.trim().length > 0
const display = (value?: string | null): string => (isPresent(value) ? value : EMPTY)

const formatDate = (value: unknown): string => {
  if (!value) return EMPTY
  try {
    const date = typeof (value as { toDate?: () => Date })?.toDate === 'function'
      ? (value as { toDate: () => Date }).toDate()
      : new Date(value as string | number | Date)
    return Number.isNaN(date.getTime()) ? EMPTY : date.toLocaleDateString('fr-FR')
  } catch {
    return EMPTY
  }
}

const formatAmount = (value: unknown): string => {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount)
    ? Math.trunc(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    : '0'
}

const numberToWords = (value: number): string => {
  const number = Math.trunc(Math.max(0, value))
  if (number === 0) return 'zéro'

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
  const underThousand = (n: number): string => {
    const parts: string[] = []
    const hundreds = Math.floor(n / 100)
    const remainder = n % 100
    if (hundreds) {
      parts.push(hundreds === 1 ? 'cent' : `${units[hundreds]} cent${remainder === 0 && hundreds > 1 ? 's' : ''}`)
    }
    if (remainder < 20) {
      if (remainder) parts.push(units[remainder])
    } else if (remainder < 70) {
      const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante']
      const ten = Math.floor(remainder / 10)
      const unit = remainder % 10
      parts.push(`${tens[ten]}${unit === 1 ? '-et-un' : unit ? `-${units[unit]}` : ''}`)
    } else if (remainder < 80) {
      const unit = remainder - 60
      parts.push(`soixante-${unit === 11 ? 'et-onze' : units[unit]}`)
    } else {
      const unit = remainder - 80
      parts.push(`quatre-vingt${unit === 0 ? 's' : `-${units[unit]}`}`)
    }
    return parts.join(' ')
  }

  const millions = Math.floor(number / 1_000_000)
  const thousands = Math.floor((number % 1_000_000) / 1_000)
  const remainder = number % 1_000
  const parts: string[] = []
  if (millions) parts.push(millions === 1 ? 'un million' : `${underThousand(millions)} millions`)
  if (thousands) parts.push(thousands === 1 ? 'mille' : `${underThousand(thousands)} mille`)
  if (remainder) parts.push(underThousand(remainder))
  return parts.join(' ')
}

const paymentModeLabel = (refund?: Record<string, unknown>): string => {
  if (typeof refund?.paymentMethodOther === 'string' && refund.paymentMethodOther.trim()) {
    return refund.paymentMethodOther.trim()
  }

  switch (refund?.withdrawalMode) {
    case 'cash': return 'Espèces'
    case 'bank_transfer': return 'Virement bancaire'
    case 'airtel_money': return 'Airtel Money'
    case 'mobicash': return 'Mobicash'
    default: return EMPTY
  }
}

const contractEndDate = (contract?: Record<string, unknown>): string => {
  if (contract?.contractEndAt) return formatDate(contract.contractEndAt)
  if (!contract?.firstPaymentDate || !contract?.subscriptionCIDuration) return EMPTY

  const start = new Date(contract.firstPaymentDate as string)
  if (Number.isNaN(start.getTime())) return EMPTY
  start.setMonth(start.getMonth() + Number(contract.subscriptionCIDuration))
  start.setDate(start.getDate() - 1)
  return start.toLocaleDateString('fr-FR')
}

const frequencyLabel = (frequency?: unknown): string =>
  frequency === 'DAILY' ? 'Quotidienne' : frequency === 'MONTHLY' ? 'Mensuelle' : EMPTY

const Pair = ({ leftLabel, leftValue, rightLabel, rightValue }: {
  leftLabel: string
  leftValue?: string | null
  rightLabel: string
  rightValue?: string | null
}) => (
  <View style={styles.row}>
    <Text style={styles.cell}><Text style={styles.bold}>{leftLabel} </Text>{display(leftValue)}</Text>
    <Text style={styles.cell}><Text style={styles.bold}>{rightLabel} </Text>{display(rightValue)}</Text>
  </View>
)

export interface QuittanceCaisseImprevuePdfFillData {
  secretarySignature: string | null
  memberSignature: string | null
}

interface LiquidationMemberData {
  id?: string
  matricule?: string
  lastName?: string
  firstName?: string
  contacts?: string[]
  identityDocumentNumber?: string
}

const DEFAULT_FILL_DATA: QuittanceCaisseImprevuePdfFillData = {
  secretarySignature: null,
  memberSignature: null,
}

const QuittanceCaisseImprevuePDF = ({
  contract,
  refund,
  memberData,
  totalAmountPaid,
  fillData,
}: {
  contract?: Record<string, unknown>
  refund?: Record<string, unknown>
  memberData?: LiquidationMemberData | null
  totalAmountPaid?: number
  fillData?: QuittanceCaisseImprevuePdfFillData
}) => {
  const signatures = fillData ?? DEFAULT_FILL_DATA
  const lastName = String(memberData?.lastName ?? contract?.memberLastName ?? '')
  const firstName = String(memberData?.firstName ?? contract?.memberFirstName ?? '')
  const memberName = [lastName.toUpperCase(), firstName].filter(Boolean).join(' ').trim()
  const matricule = String(memberData?.matricule ?? memberData?.id ?? contract?.memberId ?? '')
  const contacts = Array.isArray(memberData?.contacts)
    ? memberData.contacts
    : Array.isArray(contract?.memberContacts) ? contract.memberContacts : []
  const identityNumber = String(memberData?.identityDocumentNumber ?? '')
  const contractReference = String(contract?.id ?? '')
  const nominal = Number(refund?.amountNominal ?? totalAmountPaid ?? 0)
  // Le montant effectivement remis reste celui enregistré lors du règlement ;
  // la bonification n'est simplement plus détaillée comme ligne autonome.
  const amountPaid = Number(refund?.withdrawalAmount ?? (nominal + Number(refund?.amountBonus ?? 0)))
  const liquidationType = refund?.type === 'EARLY' ? 'Retrait anticipé et clôture du contrat' : 'Remboursement final à l’échéance'
  const paidDate = formatDate(refund?.paidAt ?? refund?.withdrawalDate ?? refund?.processedAt)
  const contractLabel = String(contract?.subscriptionCILabel ?? contract?.subscriptionCICode ?? '')
  const duration = contract?.subscriptionCIDuration ? `${contract.subscriptionCIDuration} mois` : EMPTY

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text
          fixed
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
        />
        <Text fixed style={styles.footer}>
          {REGLEMENT_ENTETE.association} — Procès-verbal de liquidation du contrat de Caisse Imprévue
        </Text>

        <View style={styles.header}>
          <Image src={window.location.origin + '/Logo-Kara.jpg'} style={styles.logo} cache={false} />
          <Text style={styles.association}>{REGLEMENT_ENTETE.association}</Text>
          <Text style={styles.devise}>{REGLEMENT_ENTETE.devise}</Text>
          <Text style={styles.siege}>{REGLEMENT_ENTETE.siege}</Text>
          <Text style={styles.docTitle}>PROCÈS-VERBAL DE LIQUIDATION DU CONTRAT DE CAISSE IMPRÉVUE</Text>
        </View>

        <Text style={styles.preamble}>
          Ce document constate la liquidation du contrat de Caisse Imprévue identifié ci-dessous et
          le versement au membre du montant arrêté. Conformément à la loi n°35/62 du 10 décembre
          1962 relative aux associations, aux statuts de LE KARA et aux conditions du contrat, ce
          règlement atteste des sommes effectivement remises au membre.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. IDENTIFICATION DU MEMBRE ET DU CONTRAT</Text>
          <Pair
            leftLabel="Nom(s) du membre :"
            leftValue={lastName.toUpperCase()}
            rightLabel="Prénom(s) du membre :"
            rightValue={firstName}
          />
          <Pair
            leftLabel="Matricule / N° d’Adhérent :"
            leftValue={matricule}
            rightLabel="Référence du contrat :"
            rightValue={contractReference}
          />
          <Pair
            leftLabel="Formule de Caisse Imprévue :"
            leftValue={contractLabel}
            rightLabel="Fréquence de cotisation :"
            rightValue={frequencyLabel(contract?.paymentFrequency)}
          />
          <Pair
            leftLabel="Date de début :"
            leftValue={formatDate(contract?.firstPaymentDate)}
            rightLabel="Date de fin :"
            rightValue={contractEndDate(contract)}
          />
          <Pair
            leftLabel="Durée du contrat :"
            leftValue={duration}
            rightLabel="Téléphone :"
            rightValue={String(contacts[0] ?? '')}
          />
          <Pair
            leftLabel="N° CNI/Passeport :"
            leftValue={identityNumber}
            rightLabel="Qualité du signataire :"
            rightValue="Membre / Réceptionnaire"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. LIQUIDATION FINANCIÈRE DU CONTRAT</Text>
          <Text style={styles.paragraph}>
            Le Comité Exécutif certifie avoir vérifié les versements enregistrés et arrêté la
            liquidation suivante :
          </Text>
          <Pair
            leftLabel="Nature de la liquidation :"
            leftValue={liquidationType}
            rightLabel="Date du règlement :"
            rightValue={paidDate}
          />
          <Pair
            leftLabel="Total des cotisations enregistrées :"
            leftValue={`${formatAmount(totalAmountPaid ?? nominal)} FCFA`}
            rightLabel="Mode de règlement :"
            rightValue={paymentModeLabel(refund)}
          />
          <Pair
            leftLabel="Montant remis au membre (en chiffres) :"
            leftValue={`${formatAmount(amountPaid)} FCFA`}
            rightLabel="Montant remis au membre (en lettres) :"
            rightValue={`${numberToWords(amountPaid)} francs CFA`}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. DÉCLARATION DE DÉCHARGE ET D’ACQUITTEMENT</Text>
          <Text style={styles.paragraph}>
            Je soussigné(e), <Text style={styles.bold}>{display(memberName)}</Text>, reconnais avoir
            reçu de l’Association de Secours Mutuel LE KARA la somme indiquée ci-dessus au titre de
            la liquidation de mon contrat de Caisse Imprévue.
          </Text>
          <Text style={styles.paragraph}>
            Je confirme que ce règlement correspond aux sommes effectivement remises et que le
            présent procès-verbal atteste de la clôture financière du contrat, conformément aux
            conditions contractuelles et aux statuts de LE KARA.
          </Text>
          <Text style={styles.paragraph}>Fait à Owendo, le {paidDate}</Text>
          <Text style={styles.handwrittenNote}>
            (Inscrire la mention manuscrite « Reçu la somme de {formatAmount(amountPaid)} FCFA au
            titre de la liquidation du contrat de Caisse Imprévue pour solde de tout compte »)
          </Text>

          <View style={styles.signatures}>
            <View style={styles.signatureCell}>
              <Text style={styles.signatureTitle}>Le Membre / Réceptionnaire</Text>
              <View style={styles.signatureLine}>
                {signatures.memberSignature && (
                  <Image src={signatures.memberSignature} style={styles.signatureImage} cache={false} />
                )}
              </View>
              <Text style={styles.signatureName}>{display(memberName)}</Text>
              <Text style={styles.signatureHint}>(Signature précédée de la mention « Lu et approuvé »)</Text>
            </View>
            <View style={styles.signatureCell}>
              <Text style={styles.signatureTitle}>Pour le Comité Exécutif</Text>
              <Text style={styles.signatureRole}>Le Financier Général / Le Secrétaire Exécutif</Text>
              <View style={styles.signatureLine}>
                {signatures.secretarySignature && (
                  <Image src={signatures.secretarySignature} style={styles.signatureImage} cache={false} />
                )}
              </View>
              <Text style={styles.signatureHint}>(Signature et cachet)</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default QuittanceCaisseImprevuePDF
