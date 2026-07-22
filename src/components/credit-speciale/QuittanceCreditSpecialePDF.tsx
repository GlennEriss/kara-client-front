'use client'

import { QuittanceCoverPage, type QuittanceCoverRow } from '@/components/pdf/quittance/QuittanceCoverPage'
import { getNationalityName } from '@/constantes/nationality'
import type { User } from '@/types/types'
import { CreditContract, MEMBERSHIP_TYPE_LABELS } from '@/types/types'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 11,
    padding: 50,
    paddingTop: 40,
    paddingBottom: 40,
    lineHeight: 1.6,
  },
  // Titre principal
  mainTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    textDecoration: 'underline',
    marginTop: 30,
    marginBottom: 20,
  },
  // Corps du document
  paragraph: {
    marginBottom: 8,
    textAlign: 'justify',
    fontSize: 11,
    lineHeight: 1.8,
  },
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  underline: {
    textDecoration: 'underline',
  },
  // Section NB
  nbSection: {
    marginTop: 15,
    marginBottom: 15,
  },
  nbTitle: {
    fontWeight: 'bold',
    textDecoration: 'underline',
  },
  // Date et lieu
  dateSection: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 11,
  },
  signatureNote: {
    textAlign: 'center',
    fontSize: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  // Signatures
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  signatureBox: {
    width: '45%',
  },
  signatureLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    textDecoration: 'underline',
    marginBottom: 10,
  },
  signatureImage: {
    width: 170,
    height: 56,
    objectFit: 'contain',
  },
  signaturePlaceholder: {
    width: 170,
    height: 56,
    borderWidth: 0.5,
    borderColor: '#94a3b8',
    borderStyle: 'dashed',
    backgroundColor: '#f8fafc',
  },
  unsignedSignerName: {
    // Même largeur que le cadre pour être centré dessous.
    width: 170,
    marginTop: 4,
    fontSize: 9,
    textAlign: 'center',
    color: '#334155',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 50,
    right: 50,
    borderTop: '1px solid #000',
    paddingTop: 10,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 9,
    textAlign: 'center',
    marginBottom: 2,
  },
  footerTextBold: {
    fontSize: 9,
    fontWeight: 'bold',
  },
})

// Fonction pour convertir un nombre en lettres
const numberToWords = (num: number): string => {
  if (num === 0) return 'zéro'

  const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']

  const convertHundreds = (n: number): string => {
    let result = ''
    if (n >= 100) {
      const hundredDigit = Math.floor(n / 100)
      result += hundredDigit === 1 ? 'cent' : ones[hundredDigit] + ' cent'
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
        result += tenDigit === 8 && n % 10 === 1 ? '-un' : '-' + ones[n % 10]
      } else if (tenDigit === 8) {
        result += 's'
      }
    } else if (n > 0) {
      result += ones[n]
    }
    return result
  }

  if (num < 1000) return convertHundreds(num)
  if (num < 1000000) {
    const thousands = Math.floor(num / 1000)
    const remainder = num % 1000
    let result = thousands === 1 ? 'mille' : convertHundreds(thousands) + ' mille'
    if (remainder > 0) result += ' ' + convertHundreds(remainder)
    return result
  }
  const millions = Math.floor(num / 1000000)
  const remainder = num % 1000000
  let result = millions === 1 ? 'un million' : convertHundreds(millions) + ' millions'
  if (remainder > 0) {
    if (remainder < 1000) {
      result += ' ' + convertHundreds(remainder)
    } else {
      const thousands = Math.floor(remainder / 1000)
      const lastPart = remainder % 1000
      if (thousands > 0) result += thousands === 1 ? ' mille' : ' ' + convertHundreds(thousands) + ' mille'
      if (lastPart > 0) result += ' ' + convertHundreds(lastPart)
    }
  }
  return result
}

interface QuittanceCreditSpecialePDFProps {
  contract: CreditContract
  guarantorPhone?: string
  memberData?: User | null
  guarantorData?: User | null
  fillData?: QuittanceCreditSpecialeFillData
}

export interface QuittanceCreditSpecialeFillData {
  memberSignature: string | null
  secretarySignature: string | null
}

export const EMPTY_QUITTANCE_CREDIT_SPECIALE_FILL_DATA: QuittanceCreditSpecialeFillData = {
  memberSignature: null,
  secretarySignature: null,
}

const QuittanceCreditSpecialePDF = ({
  contract,
  guarantorPhone: guarantorPhoneProp,
  memberData,
  guarantorData,
  fillData,
}: QuittanceCreditSpecialePDFProps) => {
  const formatDate = (date: Date | any) => {
    if (!date) return '../../....'
    try {
      const dateObj = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date))
      return format(dateObj, 'dd/MM/yyyy', { locale: fr })
    } catch {
      return '../../....'
    }
  }

  const formatAmount = (amount: number) => {
    if (!amount) return '0'
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  }

  // Données du membre (débiteur)
  const clientName = `${contract.clientLastName || ''} ${contract.clientFirstName || ''}`.trim() || '—'
  const clientPhone = contract.clientContacts?.[0] || '—'

  // Données du garant (tiers subrogé)
  const guarantorName = `${contract.guarantorLastName || ''} ${contract.guarantorFirstName || ''}`.trim() || '—'
  const guarantorPhone = guarantorPhoneProp || '—'

  const formatAddress = (address: any): string => {
    if (!address) return '—'
    if (typeof address === 'string') return address
    if (typeof address === 'object') {
      const parts: string[] = []
      if (address.district) parts.push(address.district)
      if (address.city) parts.push(address.city)
      if (address.arrondissement) parts.push(address.arrondissement)
      if (address.province) parts.push(address.province)
      if (address.additionalInfo) parts.push(address.additionalInfo)
      return parts.length > 0 ? parts.join(', ') : '—'
    }
    return '—'
  }

  const getGenderLabel = (gender?: string) => {
    if (!gender) return '—'
    const g = String(gender).toLowerCase()
    if (g === 'm' || g === 'male' || g === 'homme') return 'Masculin'
    if (g === 'f' || g === 'female' || g === 'femme') return 'Féminin'
    return gender
  }

  const getIdentityDocumentLabel = (doc?: string) => {
    if (!doc) return '—'
    const d = String(doc).toUpperCase()
    if (d.includes('CNI')) return 'CNI'
    if (d.includes('PASS') || d.includes('PASSEPORT')) return 'Passeport'
    if (d.includes('CS')) return 'Carte de séjour'
    return doc
  }

  const member = {
    matricule: memberData?.matricule || contract.clientId || '—',
    membershipType: memberData?.membershipType
      ? MEMBERSHIP_TYPE_LABELS[memberData.membershipType as keyof typeof MEMBERSHIP_TYPE_LABELS] || memberData.membershipType
      : '—',
    lastName: memberData?.lastName || contract.clientLastName || '—',
    firstName: memberData?.firstName || contract.clientFirstName || '—',
    birthPlace: memberData?.birthPlace || '—',
    birthDate: memberData?.birthDate ? formatDate(memberData.birthDate) : '—',
    identityDocument: getIdentityDocumentLabel(memberData?.identityDocument),
    identityDocumentNumber: memberData?.identityDocumentNumber || '—',
    phone1: memberData?.contacts?.[0] || contract.clientContacts?.[0] || '—',
    phone2: memberData?.contacts?.[1] || contract.clientContacts?.[1] || '—',
    gender: getGenderLabel(memberData?.gender),
    quarter: formatAddress(memberData?.address) || '—',
    nationality: getNationalityName(memberData?.nationality || '') || '—',
    association: 'LE KARA',
  }

  const guarantor = {
    lastName: guarantorData?.lastName || contract.guarantorLastName || '—',
    firstName: guarantorData?.firstName || contract.guarantorFirstName || '—',
    phone: guarantorData?.contacts?.[0] || guarantorPhoneProp || '—',
    identityDocument: getIdentityDocumentLabel(guarantorData?.identityDocument),
    identityDocumentNumber: guarantorData?.identityDocumentNumber || '—',
  }

  const memberRows: QuittanceCoverRow[] = [
    {
      kind: 'pair',
      left: { label: 'MATRICULE', value: member.matricule },
      right: { label: 'MEMBRE', value: member.membershipType },
    },
    { kind: 'single', label: 'NOM', value: member.lastName.toUpperCase() },
    { kind: 'single', label: 'PRÉNOM', value: member.firstName },
    {
      kind: 'pair',
      left: { label: 'LIEU / NAISSANCE', value: member.birthPlace },
      right: { label: 'DATE / NAISSANCE', value: member.birthDate },
    },
    {
      kind: 'pair',
      left: { label: 'TYPE DE PIÈCE', value: member.identityDocument },
      right: { label: 'N° DE PIÈCE', value: member.identityDocumentNumber },
    },
    {
      kind: 'pair',
      left: { label: 'TÉLÉPHONE 1', value: member.phone1 },
      right: { label: 'TÉLÉPHONE 2', value: member.phone2 },
    },
    {
      kind: 'pair',
      left: { label: 'SEXE', value: member.gender },
      right: { label: 'QUARTIER', value: member.quarter },
    },
    {
      kind: 'single',
      label: 'NATIONALITÉ',
      value: member.nationality ,
    },
  ]

  const guarantorRows: QuittanceCoverRow[] = [
    {
      kind: 'pair',
      left: { label: 'NOM', value: guarantor.lastName.toUpperCase() },
      right: { label: 'PRÉNOM', value: guarantor.firstName },
    },
    { kind: 'single', label: 'TÉLÉPHONE', value: guarantor.phone },
    {
      kind: 'pair',
      left: { label: 'TYPE DE PIÈCE', value: guarantor.identityDocument },
      right: { label: 'N° DE PIÈCE', value: guarantor.identityDocumentNumber },
    },
  ]

  // Montants
  const totalAmount = contract.totalAmount || (contract.amount + (contract.amount * (contract.interestRate || 10) / 100))
  const amountInWords = numberToWords(Math.round(totalAmount))
  const debtAmount = contract.amount || 0
  const debtAmountInWords = numberToWords(Math.round(debtAmount))

  // Date de la quittance (date de décharge ou aujourd'hui)
  const quittanceDate = contract.dischargedAt ? formatDate(contract.dischargedAt) : formatDate(new Date())

  // Lieu (Libreville par défaut)
  const place = 'Libreville'
  const resolvedFillData = { ...EMPTY_QUITTANCE_CREDIT_SPECIALE_FILL_DATA, ...fillData }

  const renderSignatureCapture = (signature: string | null, signerName?: string) => (
    <>
      {signature ? (
        <Image src={signature} style={styles.signatureImage} cache={false} />
      ) : (
        <View style={styles.signaturePlaceholder} />
      )}
      {signerName ? <Text style={styles.unsignedSignerName}>{signerName}</Text> : null}
    </>
  )

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <QuittanceCoverPage
          memberSectionTitle="Informations Personnelles du Membre"
          memberRows={memberRows}
          secondarySectionTitle="Information Concernant le Garant"
          secondaryRows={guarantorRows}
        />

        {/* Titre */}
        <Text style={styles.mainTitle}>QUITTANCE SUBROGATIVE</Text>

        {/* Corps du document */}
        <Text style={styles.paragraph}>
          L'Association LE KARA, <Text style={styles.italic}>ayant</Text> son siège social à Awoungou/Owendo, immatriculée au registre du Ministère de l'Intérieur, sous le numéro n° <Text style={styles.bold}>0650/MIS/SG/DGELP/DPPALC/KMOG</Text>, reconnaît avoir reçu de M/Mme/Mlle <Text style={styles.bold}>{clientName}</Text>, la somme de <Text style={styles.bold}>{amountInWords}</Text> FCFA (lettre) <Text style={styles.bold}>{formatAmount(totalAmount)}</Text> FCFA (chiffre), le <Text style={styles.bold}>{quittanceDate}</Text>, en paiement de la dette de <Text style={styles.bold}>{formatAmount(debtAmount)}</Text> FCFA, consentie avec le cautionnement de M/Mme/Mlle <Text style={styles.bold}>{guarantorName}</Text>, au profit de l'Association LE KARA.
        </Text>

        <Text style={styles.paragraph}>
          En conséquence, l'Association LE KARA, subroge par la présente tous les droits, actions et privilèges qu'elle détient sur Mme/M/Mlle <Text style={styles.bold}>{clientName}</Text> <Text style={styles.italic}>(débitrice)</Text> ou ses cautions.
        </Text>

        {/* Note NB */}
        <View style={styles.nbSection}>
          <Text style={styles.paragraph}>
            <Text style={styles.nbTitle}>NB</Text> : Cette quittance tient lieu d'annulation intégrale de la créance, il revient à souhait au débiteur de renouveler ou non sa présence à l'Association LE KARA.
          </Text>
        </View>

        {/* Date et lieu */}
        <Text style={styles.dateSection}>
          Fait à <Text style={styles.bold}>{place}</Text>       Le <Text style={styles.bold}>{quittanceDate}</Text>
        </Text>

        <Text style={styles.signatureNote}>
          Noms, signatures suivies de la mention lu et approuvé
        </Text>

        {/* Signatures */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Signature du Secrétaire exécutif</Text>
            {renderSignatureCapture(resolvedFillData.secretarySignature)}
          </View>
          <View style={styles.signatureBox}>
            <Text style={[styles.signatureLabel, { textAlign: 'right' }]}>
              Signature de l'épargnant (Précédée de la mention Lu et Approuvé)
            </Text>
            <View style={{ alignItems: 'flex-end' }}>
              {renderSignatureCapture(resolvedFillData.memberSignature, clientName)}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            l'Association LE KARA. Intégrité – Solidarité – Dynamisme, Siege : <Text style={styles.underline}>Awoungou</Text>, <Text style={styles.underline}>Owendo</Text>,
          </Text>
          <Text style={styles.footerText}>
            R.D n° <Text style={styles.footerTextBold}>0650/MIS/SG/DGELP/DPPALC/KMOG</Text>, E-mail : mutuellekara@gmail.com
          </Text>
          <Text style={styles.footerText}>
            Tél : 066 95 13 14 / 074 36 97 29
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export default QuittanceCreditSpecialePDF
