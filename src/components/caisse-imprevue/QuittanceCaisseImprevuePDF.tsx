'use client'

import { QuittanceCoverPage, type QuittanceCoverRow } from '@/components/pdf/quittance/QuittanceCoverPage'
import { getNationalityName } from '@/constantes/nationality'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

const ACCENT_BLUE = '#1f4f68'
const BORDER_SOFT = '#cbd5e1'
const BORDER_MEDIUM = '#94a3b8'
const TEXT_PRIMARY = '#1f2937'
const TEXT_MUTED = '#475569'

// Styles
const styles = StyleSheet.create({
  page: {
    // Aligne 1:1 avec `AdhesionCreditSpecialeV2` (page 1)
    fontFamily: 'Times-Roman',
    fontSize: 11,
    padding: 50,
    paddingTop: 40,
    paddingBottom: 40,
    lineHeight: 1.45,
    color: TEXT_PRIMARY,
  },
  pageContainer: {
    width: '100%',
    height: '100%',
    border: `1px solid ${BORDER_MEDIUM}`,
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
    border: `1px solid ${ACCENT_BLUE}`,
    backgroundColor: ACCENT_BLUE,
    color: 'white',
    paddingVertical: 5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
    color: ACCENT_BLUE,
    textTransform: 'uppercase',
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
  cellLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: 'bold',
  },
  cellValue: {
    flex: 1,
    fontSize: 11,
  },
  bold: {
    fontWeight: 'bold',
  },
  articleText: {
    marginBottom: 7,
    textAlign: 'justify',
    lineHeight: 1.45,
    color: TEXT_PRIMARY,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 26,
    minHeight: 120,
    border: `1px solid ${BORDER_SOFT}`,
    backgroundColor: '#f8fafc',
    padding: 14,
    alignItems: 'flex-start',
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
  signatureSubtitle: {
    fontSize: 10,
    marginTop: 4,
    color: TEXT_MUTED,
    textAlign: 'right',
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
    border: `1px dashed ${BORDER_MEDIUM}`,
    backgroundColor: '#ffffff',
  },
  unsignedSignerName: {
    // Légende sous le cadre : même largeur que la zone de signature (185)
    // pour être réellement centrée sous elle malgré alignItems:'flex-end'.
    width: 185,
    marginTop: 4,
    fontSize: 9,
    textAlign: 'center',
    color: TEXT_MUTED,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    color: TEXT_MUTED,
  },
})

// Fonction pour convertir un nombre en lettres
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
      const unitDigit = n % 10
      
      if (tenDigit === 7) {
        // 70-79 : soixante-dix, soixante-et-onze, etc.
        if (unitDigit === 0) {
          result += 'soixante-dix'
        } else if (unitDigit === 1) {
          result += 'soixante-et-onze'
        } else {
          result += 'soixante-' + ones[10 + unitDigit]
        }
      } else if (tenDigit === 9) {
        // 90-99 : quatre-vingt-dix, quatre-vingt-onze, etc.
        if (unitDigit === 0) {
          result += 'quatre-vingt-dix'
        } else if (unitDigit === 1) {
          result += 'quatre-vingt-onze'
        } else {
          result += 'quatre-vingt-' + ones[10 + unitDigit]
        }
      } else {
        // 20-69, 80-89
        result += tens[tenDigit]
        if (unitDigit !== 0) {
          if (tenDigit === 8 && unitDigit === 1) {
            result += '-un'
          } else if (tenDigit === 2 && unitDigit === 1) {
            result += '-et-un'
          } else {
            result += '-' + ones[unitDigit]
          }
        } else if (tenDigit === 8) {
          result += 's'
        }
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

export interface QuittanceCaisseImprevuePdfFillData {
  secretarySignature: string | null
  memberSignature: string | null
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
  contract?: any
  refund?: any
  memberData?: any
  totalAmountPaid?: number
  fillData?: QuittanceCaisseImprevuePdfFillData
}) => {
  const resolvedFillData = fillData ?? DEFAULT_FILL_DATA

  // Fonctions utilitaires pour formater les données
  const formatDate = (date: any) => {
    if (!date) return '—'
    try {
      const dateObj = date?.toDate ? date.toDate() : new Date(date)
      return dateObj.toLocaleDateString('fr-FR')
    } catch {
      return '—'
    }
  }

  const formatAmountWithSpaces = (amount: unknown) => {
    const numericValue = Number(amount ?? 0)
    if (!Number.isFinite(numericValue)) return '0'
    return Math.trunc(numericValue)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  }

  // Utiliser les données du membre depuis memberData (complet depuis la DB) avec fallback sur le contrat
  // memberData contient toutes les informations complètes du membre récupérées via useMember(contract.memberId)
  const member = {
    matricule: memberData?.matricule || memberData?.id || contract?.memberId || '—',
    lastName: memberData?.lastName || contract?.memberLastName || '—',
    firstName: memberData?.firstName || contract?.memberFirstName || '—',
    birthPlace: memberData?.birthPlace || '—',
    birthDate: memberData?.birthDate || contract?.memberBirthDate || null,
    nationality: memberData?.nationality || contract?.memberNationality || '—',
    identityDocument: memberData?.identityDocument || '—',
    identityDocumentNumber: memberData?.identityDocumentNumber || '—',
    contacts: memberData?.contacts || contract?.memberContacts || [],
    gender: memberData?.gender || contract?.memberGender || '—',
    address: memberData?.address || (contract?.memberAddress ? { district: contract.memberAddress } : null),
    profession: memberData?.profession || contract?.memberProfession || '—',
    membershipType: (memberData?.membershipType && typeof memberData.membershipType === 'string' ? memberData.membershipType.toUpperCase() : null) || '—',
  }
  const memberFullName = [memberData?.lastName || contract?.memberLastName, memberData?.firstName || contract?.memberFirstName]
    .filter(Boolean)
    .join(' ')
    .trim() || member.matricule || 'Membre'

  const emergencyContact = contract?.emergencyContact || {}
  // Utiliser le montant nominal du remboursement actif, sinon le montant total versé (somme des targetAmount)
  const nominalAmount = refund?.amountNominal || totalAmountPaid || 0
  const membershipDate = contract?.createdAt || contract?.firstPaymentDate

  const memberRows: QuittanceCoverRow[] = [
    {
      kind: 'pair',
      left: { label: 'MATRICULE', value: member.matricule },
      right: { label: 'MEMBRE', value: '' },
    },
    { kind: 'single', label: 'NOM', value: member.lastName.toUpperCase() },
    { kind: 'single', label: 'PRÉNOM', value: member.firstName },
    {
      kind: 'pair',
      left: { label: 'LIEU / NAISSANCE', value: member.birthPlace },
      right: { label: 'DATE / NAISSANCE', value: formatDate(member.birthDate) },
    },
    {
      kind: 'pair',
      left: { label: 'TYPE DE PIÈCE', value: member.identityDocument || '—' },
      right: { label: 'N° DE PIÈCE', value: member.identityDocumentNumber || '—' },
    },
    {
      kind: 'pair',
      left: { label: 'TÉLÉPHONE 1', value: member.contacts?.[0] || '—' },
      right: { label: 'TÉLÉPHONE 2', value: member.contacts?.[1] || '—' },
    },
    {
      kind: 'pair',
      left: { label: 'SEXE', value: member.gender || '—' },
      right: { label: 'QUARTIER', value: member.address?.district || '—' },
    },
    {
      kind: 'single',
      label: 'NATIONALITÉ',
      value: getNationalityName(member.nationality) || '—' ,
    },
  ]

  const emergencyRows: QuittanceCoverRow[] = [
    {
      kind: 'pair',
      left: { label: 'NOM', value: emergencyContact.lastName?.toUpperCase() || '—' },
      right: { label: 'PRÉNOM', value: emergencyContact.firstName || '—' },
    },
    { kind: 'single', label: 'TÉLÉPHONE', value: emergencyContact.phone1 || '—' },
    { kind: 'single', label: 'LIENS', value: emergencyContact.relationship || '—' },
  ]

  return (
    <Document>
      {/* PAGE 1 - Informations Personnelles du Membre */}
      <Page size="A4" style={styles.page}>
        <QuittanceCoverPage
          memberSectionTitle="Informations Personnelles du Membre"
          memberRows={memberRows}
          secondarySectionTitle="Informations Concernant le Contact Urgent"
          secondaryRows={emergencyRows}
        />
        <Text style={styles.pageNumber} fixed>
          Page 1 / 2
        </Text>
      </Page>

      {/* PAGE 3 - QUITTANCE DE PAIEMENT */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageContainer}>
          {/* En-tête avec logo */}
          <View style={styles.header}>
            <View style={styles.logo}>
              <Image
                src={window.location.origin + '/Logo-Kara.jpg'}
                style={{ width: 70, height: 70, objectFit: 'cover' }}
                cache={false}
              />
            </View>
            <View style={{ flex: 1 }} />
          </View>

          <Text style={styles.title}>QUITTANCE DE PAIEMENT</Text>
          <Text style={styles.subtitle}>VOLET ENTRAIDE</Text>

          <Text style={styles.articleText}>
            L'association LE KARA, ayant son siège social à Awoungou/Owendo, immatriculée au régistre du Ministère de l'Intérieur, sous le numéro n° 0650/MIS/SG/DGELP/DPPALC/KMOG, atteste avoir procédé au remboursement de la totalité des versements du membre , {member.firstName} {member.lastName.toUpperCase()}
          </Text>

          <Text style={styles.articleText}>
            En vertu de son adhésion à LE KARA en date du <Text style={styles.bold}>{formatDate(membershipDate)}</Text>
          </Text>

          <Text style={[styles.articleText, { marginTop: 15, marginBottom: 10 }]}>
            Le nominal remboursé s'élève à
          </Text>

          <Text style={[styles.articleText, { marginLeft: 20, marginBottom: 5, fontWeight: 'bold', textAlign: 'center' }]}>
            {formatAmountWithSpaces(nominalAmount)} FCFA (chiffres),
          </Text>

          <Text style={[styles.articleText, { marginLeft: 20, marginBottom: 15, fontWeight: 'bold', textAlign: 'center' }]}>
            {numberToWords(nominalAmount)} FCFA (lettres).
          </Text>

          <Text style={[styles.articleText, { marginTop: 20, fontWeight: 'bold' }]}>
            Cette quittance est libératoire de tout engagement de l'Association Kara vis-à-vis du membre. Elle est établie pour faire valoir ce que de droit.
          </Text>

          <View style={styles.signatureRow}>
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureTitle}>Signature du Secrétaire exécutif.</Text>
              {resolvedFillData.secretarySignature ? (
                <Image src={resolvedFillData.secretarySignature} style={styles.signatureImage} cache={false} />
              ) : (
                <View style={styles.signaturePlaceholder} />
              )}
            </View>

            <View style={styles.signatureBlockRight}>
              <Text style={styles.signatureTitleRight}>Signature de l'épargnant</Text>
              <Text style={styles.signatureSubtitle}>(Précédée de la mention Lu et Approuvé)</Text>
              {resolvedFillData.memberSignature ? (
                <Image src={resolvedFillData.memberSignature} style={styles.signatureImage} cache={false} />
              ) : (
                <View style={styles.signaturePlaceholder} />
              )}
              <Text style={styles.unsignedSignerName}>{memberFullName}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.pageNumber} fixed>
          Page 2 / 2
        </Text>
      </Page>
    </Document>
  )
}

export default QuittanceCaisseImprevuePDF
