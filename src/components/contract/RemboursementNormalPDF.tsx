'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

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
  sectionHeader: {
    backgroundColor: '#234D65',
    color: 'white',
    textAlign: 'center',
    padding: 5,
    fontSize: 13,
    fontWeight: 'bold',
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
    marginBottom: 6,
    textAlign: 'justify',
  },
})

// PDF identique au modèle "REMBOURSEMENT NORMAL NOUVEAU"
const RemboursementNormalPDF = ({ contract }: { contract?: any }) => {
  console.log(contract)
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
    return amount ? amount.toLocaleString('fr-FR') : '0'
  }

  const getContractTypeLabel = (type: string) => {
    switch (type) {
      case 'STANDARD': return 'Standard'
      case 'JOURNALIERE': return 'Journalière'
      case 'LIBRE': return 'Libre'
      default: return type || 'Standard'
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
  return (
    <Document>
      {/* PAGE 1 - Informations personnelles et contact urgent */}
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
              <Text style={styles.cell}>MATRICULE :</Text>
              <Text style={styles.cell}>{contract?.memberId || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>MEMBRE :</Text>
              <Text style={styles.cell}>{contract?.member?.membershipType?.toUpperCase() || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>NOM :</Text>
              <Text style={styles.cell}>{contract?.member?.lastName?.toUpperCase() || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>PRÉNOM :</Text>
              <Text style={styles.cell}>{contract?.member?.firstName || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>LIEU / NAISSANCE :</Text>
              <Text style={styles.cell}>{contract?.member?.birthPlace || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>DATE / NAISSANCE :</Text>
              <Text style={styles.cell}>{formatDate(contract?.member?.birthDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>NATIONALITÉ :</Text>
              <Text style={styles.cell}>{contract?.member?.nationality || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>N°CNI / PASS / CS :</Text>
              <Text style={styles.cell}>{contract?.member?.identityDocument + ' ' + contract?.member?.identityDocumentNumber || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>TÉLÉPHONE 1 :</Text>
              <Text style={styles.cell}>{contract?.member?.contacts?.[0] || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>TÉLÉPHONE 2 :</Text>
              <Text style={styles.cell}>{contract?.member?.contacts?.[1] || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>SEXE :</Text>
              <Text style={styles.cell}>{contract?.member?.gender || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>ÂGE :</Text>
              <Text style={styles.cell}>{contract?.member?.age || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>QUARTIER :</Text>
              <Text style={styles.cell}>{contract?.member?.address?.district || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>PROFESSION :</Text>
              <Text style={styles.cell}>{contract?.member?.profession || '—'}</Text>
            </View>
          </View>

          <Text style={styles.title}>Informations Concernant le Contact Urgent</Text>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.cell}>NOM URGENT :</Text>
              <Text style={styles.cell}>{contract?.emergencyContact?.lastName || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>PRÉNOM URGENT :</Text>
              <Text style={styles.cell}>{contract?.emergencyContact?.firstName || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>TÉLÉPHONE :</Text>
              <Text style={styles.cell}>{contract?.emergencyContact?.phone1 || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>LIEN :</Text>
              <Text style={styles.cell}>{contract?.emergencyContact?.relationship || '—'}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* PAGE 2 - Informations Concernant la Caisse Spéciale */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageContainer}>
          <Text style={styles.title}>Informations Concernant la Caisse Spéciale</Text>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.cell}>DURÉE / MOIS :</Text>
              <Text style={styles.cell}>{contract?.monthsPlanned || '—'} mois</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>TYPE.CAI.SPE :</Text>
              <Text style={styles.cell}>{getContractTypeLabel(contract?.caisseType)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>DÉBUT CAI.SPE :</Text>
              <Text style={styles.cell}>{formatDate(contract?.firstPaymentDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>MONTANT / MOIS :</Text>
              <Text style={styles.cell}>{formatAmount(contract?.monthlyAmount || 0)} FCFA</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>DATE REMISE :</Text>
              <Text style={styles.cell}>{formatDate(contract?.createdAt)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>FIN CAI.SPE :</Text>
              <Text style={styles.cell}>{formatDate(contract?.lastPaymentDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>ABANDON :</Text>
              <Text style={styles.cell}>
                {contract?.status === 'RESCINDED' || 
                 contract?.status === 'EARLY_WITHDRAW_REQUESTED' || 
                 contract?.status === 'EARLY_REFUND_PENDING' ? 'OUI' : 'NON'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>DATE / ABAN :</Text>
              <Text style={styles.cell}>
                {contract?.rescindedAt ? formatDate(contract.rescindedAt) : 
                 (contract?.status === 'EARLY_WITHDRAW_REQUESTED' || 
                  contract?.status === 'EARLY_REFUND_PENDING') ? formatDate(new Date()) : '—'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>N. VERSEMENT :</Text>
              <Text style={styles.cell}>{contract?.payments?.length || 0} / {contract?.monthsPlanned || 12}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>CAUSE :</Text>
              <Text style={styles.cell}>{contract?.rescindedReason || '—'}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* PAGE 3 - Quittance de paiement */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageContainer}>
          <Text style={styles.title}>QUITTANCE DE PAIEMENT</Text>

          <Text style={styles.articleText}>
            L'association LE KARA, ayant son siège social à Awoungou/Owendo, immatriculée au registre du
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
                Ce remboursement a été réalisé <Text style={styles.bold}>{contract?.refundDelayDays || '.......'}</Text> jours après la notification de la demande.
              </Text>
            </>
          )}

          {(contract?.status === 'RESCINDED' || contract?.status === 'EARLY_REFUND_PENDING' || contract?.status === 'EARLY_WITHDRAW_REQUESTED') && (
            <>
              <Text style={styles.articleText}>• Demande unilatérale de résiliation</Text>
              <Text style={styles.articleText}>
                Ce remboursement a été réalisé <Text style={styles.bold}>{contract?.refundDelayDays || '—'}</Text> jours après la demande.
              </Text>
            </>
          )}

          <Text style={styles.articleText}>
            Le nominal remboursé s'élève à <Text style={styles.bold}>{formatAmount(contract?.nominalPaid || 0)} FCFA</Text> (chiffres),
            <Text style={styles.bold}> {numberToWords(contract?.nominalPaid || 0)} francs CFA</Text> (lettres).
          </Text>

          <Text style={{ marginTop: 15 }}>
            Cette quittance est libératoire de tout engagement de l'association Kara vis-à-vis de l'épargnant.
            Elle est établie pour faire valoir ce que de droit.
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 }}>
            <Text style={styles.bold}>Signature du Secrétaire exécutif</Text>
            <Text style={styles.bold}>
              Signature de l'épargnant (précédée de la mention "Lu et approuvé")
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default RemboursementNormalPDF
