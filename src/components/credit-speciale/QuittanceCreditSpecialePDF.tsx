'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { CreditContract } from '@/types/types'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 11,
    padding: 50,
    paddingTop: 40,
    paddingBottom: 60,
    lineHeight: 1.6,
  },
  // Header avec logo
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  tiersSubrogeSection: {
    flex: 1,
  },
  tiersSubrogeTitle: {
    fontSize: 11,
    fontStyle: 'italic',
    textDecoration: 'underline',
    marginBottom: 15,
  },
  tiersSubrogeInfo: {
    fontSize: 11,
    marginBottom: 5,
  },
  logo: {
    width: 100,
    height: 100,
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
    marginBottom: 50,
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
}

const QuittanceCreditSpecialePDF = ({ contract, guarantorPhone: guarantorPhoneProp }: QuittanceCreditSpecialePDFProps) => {
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

  // Montants
  const totalAmount = contract.totalAmount || (contract.amount + (contract.amount * (contract.interestRate || 10) / 100))
  const amountInWords = numberToWords(Math.round(totalAmount))
  const debtAmount = contract.amount || 0
  const debtAmountInWords = numberToWords(Math.round(debtAmount))

  // Date de la quittance (date de décharge ou aujourd'hui)
  const quittanceDate = contract.dischargedAt ? formatDate(contract.dischargedAt) : formatDate(new Date())

  // Lieu (Libreville par défaut)
  const place = 'Libreville'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header : Tiers subrogé + Logo */}
        <View style={styles.headerSection}>
          <View style={styles.tiersSubrogeSection}>
            <Text style={styles.tiersSubrogeTitle}>Tiers subrogé</Text>
            <Text style={styles.tiersSubrogeInfo}>
              <Text style={styles.bold}>Nom</Text> : {contract.guarantorLastName || '—'}
            </Text>
            <Text style={styles.tiersSubrogeInfo}>
              <Text style={styles.bold}>Prénom</Text> : {contract.guarantorFirstName || '—'}
            </Text>
            <Text style={styles.tiersSubrogeInfo}>
              <Text style={styles.bold}>Tél</Text> : {guarantorPhone}
            </Text>
          </View>
          <Image
            src={typeof window !== 'undefined' ? window.location.origin + '/Logo-Kara.jpg' : '/Logo-Kara.jpg'}
            style={styles.logo}
            cache={false}
          />
        </View>

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
            <Text style={styles.signatureLabel}>LE KARA</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={[styles.signatureLabel, { textAlign: 'right' }]}>LE MEMBRE</Text>
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
