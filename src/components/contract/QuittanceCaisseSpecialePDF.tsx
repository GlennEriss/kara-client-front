'use client'

import { QuittanceCoverPage, type QuittanceCoverRow } from '@/components/pdf/quittance/QuittanceCoverPage'
import { getNationalityName } from '@/constantes/nationality'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

const ACCENT_BLUE = '#1f4f68'
const BORDER_SOFT = '#cbd5e1'
const TEXT_PRIMARY = '#1f2937'
const TEXT_MUTED = '#475569'

// Styles - basés sur TEMPLATE_REMBOURSEMENT_NORMAL_CS_N.docx
const styles = StyleSheet.create({
  page: {
    // Aligne 1:1 avec `AdhesionCreditSpecialeV2` (page 1)
    fontFamily: 'Times-Roman',
    fontSize: 11,
    paddingLeft: 30,
    paddingRight: 30,
    paddingTop: 50,
    paddingBottom: 40,
    lineHeight: 1.45,
    color: TEXT_PRIMARY,
  },
  pageContainer: {
    width: '100%',
    height: '100%',
    border: '1px solid #94a3b8',
    borderRadius: 2,
    position: 'relative',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
  },
  logo: {
    width: 70,
    height: 70,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    border: '1px solid #1f4f68',
    backgroundColor: ACCENT_BLUE,
    color: 'white',
    paddingVertical: 5,
  },
  section: {
    border: '1px solid black',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    borderBottom: '1px solid #ccc',
    padding: 5,
  },
  cell: {
    flex: 1,
    fontSize: 11,
  },
  bold: {
    fontWeight: 'bold',
  },
  articleText: {
    marginBottom: 7,
    lineHeight: 1.45,
    textAlign: 'justify',
    color: TEXT_PRIMARY,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 26,
    minHeight: 120,
    border: `1px solid ${BORDER_SOFT}`,
    backgroundColor: '#f8fafc',
    padding: 15,
  },
  signatureBlock: {
    width: '48%',
    justifyContent: 'space-between',
  },
  signatureBlockRight: {
    width: '48%',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  signatureTitle: {
    fontWeight: 'bold',
    color: TEXT_PRIMARY,
  },
  signatureTitleRight: {
    fontWeight: 'bold',
    color: TEXT_PRIMARY,
    textAlign: 'right',
  },
  dateText: {
    fontSize: 9,
    marginTop: 12,
    color: TEXT_MUTED,
  },
  signatureImage: {
    width: 185,
    height: 56,
    objectFit: 'contain',
    marginTop: 12,
  },
  signaturePlaceholder: {
    width: 185,
    height: 56,
    marginTop: 12,
    border: '1px dashed #94a3b8',
    backgroundColor: '#ffffff',
  },
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

// PDF basé sur TEMPLATE_REMBOURSEMENT_NORMAL_CS_N.docx
export interface QuittanceCaisseSpecialePdfFillData {
  refundDelayDays: string
  secretarySignature: string | null
  secretaryDate: string
  memberSignature: string | null
  memberDate: string
}

const DEFAULT_FILL_DATA: QuittanceCaisseSpecialePdfFillData = {
  refundDelayDays: '',
  secretarySignature: null,
  secretaryDate: '',
  memberSignature: null,
  memberDate: '',
}

const QuittanceCaisseSpecialePDF = ({ contract, fillData }: { contract?: any; fillData?: QuittanceCaisseSpecialePdfFillData }) => {
  const resolvedFillData = fillData ?? DEFAULT_FILL_DATA

  const formatDate = (date: any) => {
    if (!date) return '—'
    try {
      const dateObj = date?.toDate ? date.toDate() : new Date(date)
      return dateObj.toLocaleDateString('fr-FR')
    } catch {
      return '—'
    }
  }

  const numberToWords = (num: number) => {
    if (num === 0) return 'zéro'

    const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']

    const convertHundreds = (n: number) => {
      let result = ''

      if (n >= 100) {
        const hundredDigit = Math.floor(n / 100)
        if (hundredDigit === 1) {
          result += 'cent'
        } else {
          result += ones[hundredDigit] + ' cent'
        }
        if (n % 100 !== 0) result += ' '
        n %= 100
      }

      if (n >= 20) {
        const tenDigit = Math.floor(n / 10)
        if (tenDigit === 7) {
          result += 'soixante'
          n += 10
        } else if (tenDigit === 9) {
          result += 'quatre-vingt'
          n += 10
        } else {
          result += tens[tenDigit]
        }

        if (n % 10 !== 0) {
          if (tenDigit === 8 && n % 10 === 1) {
            result += '-un'
          } else {
            result += '-' + ones[n % 10]
          }
        } else if (tenDigit === 8) {
          result += 's'
        }
      } else if (n > 0) {
        result += ones[n]
      }

      return result
    }

    if (num < 1000) {
      return convertHundreds(num)
    } else if (num < 1000000) {
      const thousands = Math.floor(num / 1000)
      const remainder = num % 1000
      let result = ''

      if (thousands === 1) {
        result = 'mille'
      } else {
        result = convertHundreds(thousands) + ' mille'
      }

      if (remainder > 0) {
        result += ' ' + convertHundreds(remainder)
      }

      return result
    } else {
      const millions = Math.floor(num / 1000000)
      const remainder = num % 1000000
      let result = ''

      if (millions === 1) {
        result = 'un million'
      } else {
        result = convertHundreds(millions) + ' millions'
      }

      if (remainder > 0) {
        if (remainder < 1000) {
          result += ' ' + convertHundreds(remainder)
        } else {
          const thousands = Math.floor(remainder / 1000)
          const lastPart = remainder % 1000
          if (thousands > 0) {
            if (thousands === 1) {
              result += ' mille'
            } else {
              result += ' ' + convertHundreds(thousands) + ' mille'
            }
          }
          if (lastPart > 0) {
            result += ' ' + convertHundreds(lastPart)
          }
        }
      }

      return result
    }
  }

  const formatInputDate = (dateValue: string) => {
    if (!dateValue) return '____/____/________'
    const [year, month, day] = dateValue.split('-')
    if (!year || !month || !day) return '____/____/________'
    return `${day}/${month}/${year}`
  }

  const formatAmountWithSpaces = (amount: unknown) => {
    const numericValue = Number(amount ?? 0)
    if (!Number.isFinite(numericValue)) return '0'
    return Math.trunc(numericValue)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  }

  const refundDelayDaysLabel =
    resolvedFillData.refundDelayDays.trim() ||
    (contract?.refundDelayDays != null ? String(contract.refundDelayDays) : '.......')
  const secretaryDateLabel = formatInputDate(resolvedFillData.secretaryDate)
  const memberDateLabel = formatInputDate(resolvedFillData.memberDate)

  const memberRows: QuittanceCoverRow[] = [
    {
      kind: 'pair',
      left: { label: 'MATRICULE', value: contract?.memberId || '—' },
      right: { label: 'MEMBRE', value: '' },
    },
    { kind: 'single', label: 'NOM', value: (contract?.member?.lastName || '—').toUpperCase() },
    { kind: 'single', label: 'PRÉNOM', value: contract?.member?.firstName || '—' },
    {
      kind: 'pair',
      left: { label: 'LIEU / NAISSANCE', value: contract?.member?.birthPlace || '—' },
      right: { label: 'DATE / NAISSANCE', value: formatDate(contract?.member?.birthDate) },
    },
    {
      kind: 'pair',
      left: { label: 'TYPE DE PIÈCE', value: contract?.member?.identityDocument || '—' },
      right: { label: 'N° DE PIÈCE', value: contract?.member?.identityDocumentNumber || '—' },
    },
    {
      kind: 'pair',
      left: { label: 'TÉLÉPHONE 1', value: contract?.member?.contacts?.[0] || '—' },
      right: { label: 'TÉLÉPHONE 2', value: contract?.member?.contacts?.[1] || '—' },
    },
    {
      kind: 'pair',
      left: { label: 'SEXE', value: contract?.member?.gender || '—' },
      right: { label: 'QUARTIER', value: contract?.member?.address?.district || '—' },
    },
    {
      kind: 'single',
      label: 'NATIONALITÉ',
      value: getNationalityName(contract?.member?.nationality) || '—' ,
    },
  ]

  const emergencyRows: QuittanceCoverRow[] = [
    { kind: 'pair', left: { label: 'NOM', value: (contract?.emergencyContact?.lastName || '—').toUpperCase() }, right: { label: 'PRÉNOM', value: contract?.emergencyContact?.firstName || '—' } },
    { kind: 'single', label: 'TÉLÉPHONE', value: contract?.emergencyContact?.phone1 || '—' },
    { kind: 'single', label: 'LIENS', value: contract?.emergencyContact?.relationship || '—' },
  ]

  return (
    <Document>
      {/* PAGE 1 - Informations personnelles et contact urgent (template) */}
      <Page size="A4" style={styles.page}>
        <QuittanceCoverPage
          memberSectionTitle="Informations Personnelles du Membre"
          memberRows={memberRows}
          secondarySectionTitle="Informations Concernant le Contact Urgent"
          secondaryRows={emergencyRows}
        />
        <Text
          style={styles.pageNumber}
          fixed
        >
          Page 1 / 2
        </Text>
      </Page>

      {/* PAGE 2 - Quittance de paiement (template) */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageContainer}>
          <Text style={styles.title}>QUITTANCE DE PAIEMENT</Text>

          <Text style={styles.articleText}>
            L'Association LE KARA, ayant son siège social à Awoungou/Owendo, immatriculée au registre du
            Ministère de l'Intérieur, sous le numéro n° 0650/MIS/SG/DGELP/DPPALC/KMOG, atteste avoir
            procédé au remboursement du nominal de l'épargnant :
          </Text>

          <Text style={[styles.articleText, styles.bold]}>
            {contract?.member?.firstName || '—'} {contract?.member?.lastName?.toUpperCase() || '—'}
          </Text>

          <Text style={styles.articleText}>
            Souscrit en date du <Text style={styles.bold}>{formatDate(contract?.firstPaymentDate)}</Text> et intervenant suite à :
          </Text>

          {(contract?.status === 'CLOSED' || contract?.status === 'FINAL_REFUND_PENDING') && (
            <>
              <Text style={styles.articleText}>• L'arrivée du terme du contrat</Text>
              <Text style={styles.articleText}>
                Ce remboursement a été réalisé <Text style={styles.bold}>{refundDelayDaysLabel}</Text> jours après la notification de la demande de résiliation.
              </Text>
            </>
          )}

          {(contract?.status === 'RESCINDED' || contract?.status === 'EARLY_REFUND_PENDING' || contract?.status === 'EARLY_WITHDRAW_REQUESTED') && (
            <>
              <Text style={styles.articleText}>• Demande unilatérale de résiliation</Text>
              <Text style={styles.articleText}>
                Ce remboursement a été réalisé <Text style={styles.bold}>{refundDelayDaysLabel}</Text> jours après la notification de la demande de résiliation.
              </Text>
            </>
          )}

          <Text style={styles.articleText}>
            Le nominal remboursé s'élève à <Text style={styles.bold}>{formatAmountWithSpaces(contract?.nominalPaid)} FCFA</Text> (chiffres),
            <Text style={styles.bold}> {numberToWords(contract?.nominalPaid || 0)} francs CFA</Text> (lettres).
          </Text>

          <Text style={[styles.articleText, { marginTop: 8 }]}>
            Cette quittance est libératoire de tout engagement de l'Association KARA vis-à-vis de l'épargnant.
            Elle est établie pour faire valoir ce que de droit.
          </Text>

          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureTitle}>Signature du Secrétaire exécutif</Text>
              {resolvedFillData.secretarySignature ? (
                <Image src={resolvedFillData.secretarySignature} style={styles.signatureImage} cache={false} />
              ) : (
                <View style={styles.signaturePlaceholder} />
              )}
              <Text style={styles.dateText}>Date : {secretaryDateLabel}</Text>
            </View>
            <View style={styles.signatureBlockRight}>
              <Text style={styles.signatureTitleRight}>
                Signature de l'épargnant (Précédée de la mention Lu et Approuvé)
              </Text>
              {resolvedFillData.memberSignature ? (
                <Image src={resolvedFillData.memberSignature} style={styles.signatureImage} cache={false} />
              ) : (
                <View style={styles.signaturePlaceholder} />
              )}
              <Text style={styles.dateText}>Date : {memberDateLabel}</Text>
            </View>
          </View>
        </View>
        <Text
          style={styles.pageNumber}
          fixed
        >
          Page 2 / 2
        </Text>
      </Page>
    </Document>
  )
}

export default QuittanceCaisseSpecialePDF
