'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { getNationalityName } from '@/constantes/nationality'

// Styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 11,
    padding: 25,
    lineHeight: 1.4,
    position: 'relative',
  },
  pageContainer: {
    width: '100%',
    height: '100%',
    border: '2px solid #265169',
    position: 'relative',
    padding: 15,
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
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    border: '1px solid #265169',
    backgroundColor: '#234D65',
    color: 'white',
    padding: 5
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
    marginBottom: 6,
    textAlign: 'justify',
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

// Calculer l'âge à partir de la date de naissance
const calculateAge = (birthDate: string | Date | null | undefined) => {
  if (!birthDate) return '—'
  try {
    const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate instanceof Date ? birthDate : new Date(birthDate)
    const today = new Date()
    if (isNaN(birth.getTime())) return '—'
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age.toString()
  } catch {
    return '—'
  }
}

const RemboursementCIPDF = ({ contract, refund, memberData, totalAmountPaid }: { contract?: any; refund?: any; memberData?: any; totalAmountPaid?: number }) => {
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

  const formatAmount = (amount: number) => {
    if (!amount) return '0'
    // Convertir en string et ajouter des espaces tous les 3 chiffres
    const numStr = Math.floor(amount).toString()
    const parts = []
    for (let i = numStr.length; i > 0; i -= 3) {
      parts.unshift(numStr.slice(Math.max(0, i - 3), i))
    }
    return parts.join(' ')
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

  const age = calculateAge(member.birthDate)
  const emergencyContact = contract?.emergencyContact || {}
  // Utiliser le montant nominal du remboursement actif, sinon le montant total versé (somme des targetAmount)
  const nominalAmount = refund?.amountNominal || totalAmountPaid || 0
  const membershipDate = contract?.createdAt || contract?.firstPaymentDate

  return (
    <Document>
      {/* PAGE 1 - Informations Personnelles du Membre */}
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

          <Text style={styles.title}>Informations Personnelles du Membre</Text>

          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.cellLabel}>MATRICULE</Text>
              <Text style={styles.cellValue}>{member.matricule}</Text>
              <Text style={styles.cellLabel}>MEMBRE</Text>
              <Text style={styles.cellValue}>{member.membershipType}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cellLabel}>NOM</Text>
              <Text style={styles.cellValue}>{member.lastName.toUpperCase()}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cellLabel}>PRÉNOM</Text>
              <Text style={styles.cellValue}>{member.firstName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cellLabel}>LIEU / NAISSANCE</Text>
              <Text style={styles.cellValue}>{member.birthPlace}</Text>
              <Text style={styles.cellLabel}>DATE / NAISSANCE</Text>
              <Text style={styles.cellValue}>{formatDate(member.birthDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cellLabel}>NATIONALITÉ</Text>
              <Text style={styles.cellValue}>{getNationalityName(member.nationality)}</Text>
              <Text style={styles.cellLabel}>N°CNI/PASS/CS</Text>
              <Text style={styles.cellValue}>{member.identityDocumentNumber || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cellLabel}>TÉLÉPHONE 1</Text>
              <Text style={styles.cellValue}>{member.contacts?.[0] || '—'}</Text>
              <Text style={styles.cellLabel}>TÉLÉPHONE 2</Text>
              <Text style={styles.cellValue}>{member.contacts?.[1] || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cellLabel}>SEXE</Text>
              <Text style={styles.cellValue}>{member.gender || '—'}</Text>
              <Text style={styles.cellLabel}>ÂGE</Text>
              <Text style={styles.cellValue}>{age}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cellLabel}>QUARTIER</Text>
              <Text style={styles.cellValue}>{member.address?.district || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cellLabel}>PROFESSION</Text>
              <Text style={styles.cellValue}>{member.profession || '—'}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* PAGE 2 - Informations Concernant Le Contact Urgent */}
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

          <Text style={styles.title}>Informations Concernant Le Contact Urgent</Text>

          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.cellLabel}>NOM</Text>
              <Text style={styles.cellValue}>{emergencyContact.lastName?.toUpperCase() || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cellLabel}>PRÉNOM</Text>
              <Text style={styles.cellValue}>{emergencyContact.firstName || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cellLabel}>LIENS</Text>
              <Text style={styles.cellValue}>{emergencyContact.relationship || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cellLabel}>TÉLÉPHONE</Text>
              <Text style={styles.cellValue}>{emergencyContact.phone1 || '—'}</Text>
            </View>
          </View>
        </View>
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
          <Text style={[styles.title, { fontSize: 14, marginTop: 10, marginBottom: 20 }]}>VOLET ENTRAIDE</Text>

          <Text style={styles.articleText}>
            L'association LE KARA, ayant son siège social à Awoungou/Owendo, immatriculée au régistre du Ministère de l'Intérieur, sous le numéro n° 0650/MIS/SG/DGELP/DPPALC/KMOG, atteste avoir procédé au remboursement de la totalité des versements du membre , {member.firstName} {member.lastName.toUpperCase()}
          </Text>

          <Text style={styles.articleText}>
            En vertu de son adhésion à LE KARA en date du {formatDate(membershipDate)}
          </Text>

          <Text style={[styles.articleText, { marginTop: 15, marginBottom: 10 }]}>
            Le nominal remboursé s'élève à
          </Text>

          <Text style={[styles.articleText, { marginLeft: 20, marginBottom: 5 }]}>
            {formatAmount(nominalAmount)} FCFA (chiffres),
          </Text>

          <Text style={[styles.articleText, { marginLeft: 20, marginBottom: 15 }]}>
            {numberToWords(nominalAmount)} FCFA (lettres).
          </Text>

          <Text style={[styles.articleText, { marginTop: 20 }]}>
            Cette quittance est libératoire de tout engagement de l'Association Kara vis-à-vis du membre. Elle est établie pour faire valoir ce que de droit.
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 50, alignItems: 'flex-start' }}>
            <Text style={styles.bold}>Signature du Secrétaire exécutif.</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.bold}>Signature de l'épargnant</Text>
              <Text style={{ fontSize: 11, marginTop: 5 }}>(Précédée de la mention Lu et Approuvé)</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default RemboursementCIPDF

