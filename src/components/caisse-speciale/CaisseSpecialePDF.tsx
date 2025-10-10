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
  articleTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  articleText: {
    marginBottom: 6,
    textAlign: 'justify',
  },
  bulletList: {
    marginBottom: 6,
    paddingLeft: 0,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bulletSymbol: {
    width: 15,
    marginRight: 5,
  },
  bulletText: {
    flex: 1,
    textAlign: 'justify',
  },
  definitionList: {
    marginBottom: 6,
  },
  definitionItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  definitionSymbol: {
    width: 15,
    marginRight: 5,
  },
  definitionText: {
    flex: 1,
    textAlign: 'justify',
  },
  subBulletList: {
    marginLeft: 20,
    marginTop: 4,
  },
  subBulletItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  subBulletSymbol: {
    width: 15,
    marginRight: 5,
  },
  subBulletText: {
    flex: 1,
    textAlign: 'justify',
  },
  checkboxContainer: {
    flexDirection: 'row',
    marginVertical: 8,
    alignItems: 'center',
  },
  checkbox: {
    width: 15,
    height: 15,
    border: '1px solid black',
    marginRight: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxText: {
    fontSize: 11,
  },
  blankLine: {
    borderBottom: '1px solid black',
    minWidth: 100,
    height: 12,
    marginHorizontal: 5,
  },
  formSection: {
    marginVertical: 10,
  },
  table: {
    width: '100%',
    border: '1px solid black',
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    flex: 1,
    borderRight: '1px solid black',
    borderBottom: '1px solid black',
    padding: 5,
    fontSize: 10,
  },
})

// PDF identique au document "Caisse spéciale"
const CaisseSpecialePDF = ({ contract }: { contract?: any }) => {
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

  const numberToWords = (num: number) => {
    if (num === 0) return 'zéro'

    const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']
    const hundreds = ['', 'cent', 'deux cents', 'trois cents', 'quatre cents', 'cinq cents', 'six cents', 'sept cents', 'huit cents', 'neuf cents']

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


  const getContractTypeLabel = (type: string) => {
    switch (type) {
      case 'STANDARD': return 'Standard'
      case 'JOURNALIERE': return 'Journalière'
      case 'LIBRE': return 'Libre'
      default: return type || 'Standard'
    }
  }

  const getContractStatusLabel = (status: string) => {
    const labels = {
      DRAFT: 'En cours',
      ACTIVE: 'Actif',
      LATE_NO_PENALTY: 'Retard (J+0..3)',
      LATE_WITH_PENALTY: 'Retard (J+4..12)',
      DEFAULTED_AFTER_J12: 'Résilié (>J+12)',
      EARLY_WITHDRAW_REQUESTED: 'Retrait anticipé',
      FINAL_REFUND_PENDING: 'Remboursement final',
      EARLY_REFUND_PENDING: 'Remboursement anticipé',
      RESCINDED: 'Résilié',
      CLOSED: 'Clos'
    }
    return labels[status as keyof typeof labels] || status || 'En cours'
  }

  return (
    <Document>
      {/* PAGE 1 - Informations personnelles */}
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
              <Text style={styles.cell}>{contract?.member?.membershipType.toUpperCase() || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>NOM :</Text>
              <Text style={styles.cell}>{contract?.member?.lastName.toUpperCase() || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>PRÉNOM :</Text>
              <Text style={styles.cell}>{contract?.member?.firstName || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>LIEU / DATE DE NAISSANCE :</Text>
              <Text style={styles.cell}>{contract?.member?.birthPlace || '—'} / {formatDate(contract?.member?.birthDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>NATIONALITÉ :</Text>
              <Text style={styles.cell}>{getNationalityName(contract?.member?.nationality)}</Text>
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
              <Text style={styles.cell}>LIEN :</Text>
              <Text style={styles.cell}>{contract?.emergencyContact?.relationship || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>TÉLÉPHONE :</Text>
              <Text style={styles.cell}>{contract?.emergencyContact?.phone1 || '—'}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* PAGE 2 - Contrat */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageContainer}>
          <Text style={styles.title}>CAISSE SPÉCIALE</Text>

          <Text style={styles.articleText}>
            Dans le cadre d'une démarche purement sociale, l'association LE KARA lance le volet « Caisse spéciale »,
            qui est un contrat par lequel l'association permet aux membres épargnants de faire des épargnes,
            individuelles et volontaires sur un compte fermé, destinés à prévenir les différents aléas de leurs vies.
          </Text>
          <Text style={styles.articleText}>
            L'association LE KARA s'engage en contrepartie des versements mensuels, à assurer la conservation et la mise
            à disposition de ces fonds aux épargnants en cas de besoin.
          </Text>
          <View style={styles.definitionList}>
            <View style={styles.definitionItem}>
              <Text style={styles.bulletSymbol}>•</Text>
              <Text style={styles.definitionText}>
                <Text style={styles.bold}>L'épargnant :</Text> membre de l'association qui souscrit au volet Caisse spéciale.
              </Text>
            </View>
            <View style={styles.definitionItem}>
              <Text style={styles.bulletSymbol}>•</Text>
              <Text style={styles.definitionText}>
                <Text style={styles.bold}>Le nominal :</Text> globalité des versements mensuels de l'épargnant.
              </Text>
            </View>
          </View>
        </View>
      </Page>

      {/* PAGE 3 - Les Contraintes */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageContainer}>
          <Text style={styles.title}>LES CONTRAINTES</Text>

          <Text style={{ marginBottom: 15 }}></Text>

          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bold}>Durée du contrat :</Text> Chaque contrat est conclu sur une période maximale de douze (12) mois.
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bold}>Début du contrat :</Text> Le contrat court pour une durée déterminée à partir de la date du premier versement.
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bold}>Terme du contrat :</Text> Le contrat prend fin à la date prévue par le contrat. A cette date, l'épargnant reçoit le remboursement des sommes qu'il a eu à verser.
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bold}>Remboursement :</Text> Le remboursement des sommes versées, à l'initiative de l'association et au bénéfice de l'épargnant, intervient sur une durée maximale de <Text style={styles.bold}>trente (30) jours</Text> à compter de la date du terme du contrat.
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bold}>Déroulement des versements mensuels :</Text> L'épargnant s'engage à verser chaque mois une somme indéterminée, égale ou supérieure à 100.000 franc CFA, sur un compte fermé c'est-à-dire sans possibilité pour lui de les récupérer avant le terme du contrat. Avant le douzième mois, aucun retrait n'est autorisé. Il est accordé à tout épargnant, à compter de la date d'échéance contractuellement prévue pour chaque versement mensuel, un délai de retard de trois(3) jours pour procéder à son versement. Le versement intervenu dans ledit délai ne donne lieu à aucune pénalité.
              </Text>
            </View>
          </View>

          <Text style={styles.articleText}>
            À compter du <Text style={styles.bold}>quatrième jour</Text> jusqu'à <Text style={styles.bold}>douzième jour</Text> succédant l'expiration du délai de retard, tout versement intervenu dans cet intervalle est passible de pénalités pécuniaires.
          </Text>

          <Text style={styles.articleText}>
            Tout versement intervenu après le douzième jour sus-mentionné est irrecevable et s'assimile à un manquement substantiel de l'épargnant à ses obligations contractuelles. Ainsi, il entraîne la résiliation du contrat à l'initiative du secrétaire exécutif, comme précisé ci-après.
          </Text>

          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>•</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bold}>Résiliation :</Text> Le contrat est de plein droit résolu si :
              </Text>
            </View>
          </View>

          <View style={styles.subBulletList}>
            <View style={styles.subBulletItem}>
              <Text style={styles.subBulletSymbol}>-</Text>
              <Text style={styles.subBulletText}>l'épargnant omet le versement d'un mois.</Text>
            </View>
            <View style={styles.subBulletItem}>
              <Text style={styles.subBulletSymbol}>-</Text>
              <Text style={styles.subBulletText}>l'épargnant exige le remboursement du nominal avant le terme du contrat.</Text>
            </View>
          </View>

          <Text style={styles.articleText}>
            Le remboursement du nominal suite à une demande de retrait intervenue avant terme, est réalisé dans un intervalle de quarante-cinq jours à compter de la demande.
          </Text>
        </View>
      </Page>

      {/* PAGE 4 - Fiche d'adhésion et articles */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageContainer}>

          <Text style={styles.title}>FICHE D'ADHÉSION</Text>

          <Text>Je soussigné(e),</Text>
          <Text>{contract?.member?.firstName || '—'} {contract?.member?.lastName || '—'} membre de l'association KARA, domicilié à {contract?.member?.address?.district || '—'} et joignable au {contract?.member?.contacts?.[0] || '—'}</Text>

          <Text style={styles.articleTitle}>Article 1 : Objet du contrat</Text>
          <Text style={styles.articleText}>
            Je reconnais avoir adhéré par ce contrat au volet Caisse spéciale de l'association KARA.
          </Text>

          <Text style={styles.articleTitle}>Article 2 : Durée du contrat</Text>
          <Text style={styles.articleText}>
            Que cet engagement est valable pour une durée de <Text style={styles.bold}>{contract?.monthsPlanned || 12} mois</Text>;
          </Text>
          <Text>
            Qu'il a été conclu en date du <Text style={styles.bold}>{formatDate(contract?.firstPaymentDate)}</Text> et prend donc fin en date du <Text style={styles.bold}>{formatDate(contract?.lastPaymentDate)}</Text>
          </Text>

          <Text style={styles.articleTitle}>Article 3 : Termes contractuels</Text>

          <Text style={styles.articleText}>
            L'épargnant souscrit à la formule :
          </Text>

          <View style={styles.formSection}>
            <View style={styles.checkboxContainer}>
              <View style={styles.checkbox}></View>
              <Text style={styles.checkboxText}>Changeable</Text>
            </View>
            <View style={styles.checkboxContainer}>
              <View style={styles.checkbox}></View>
              <Text style={styles.checkboxText}>Non Changeable</Text>
            </View>
          </View>

          <Text style={styles.articleText}>
            Par cet engagement, je prends la décision de mettre à la disposition de l'association la somme déterminée de :
          </Text>

          <View style={{ marginVertical: 8 }}>
            <Text style={styles.articleText}>
              <Text style={styles.bold}>{numberToWords(contract?.monthlyAmount || 0)} francs CFA</Text> (Lettres)
            </Text>
            <Text style={styles.articleText}>
              <Text style={styles.bold}>{formatAmount(contract?.monthlyAmount || 0)} FCFA</Text> (Chiffres)
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
            <Text style={styles.articleText}>A l'échéance prévue pour le </Text>
            <View style={[styles.blankLine, { width: 80 }]}></View>
          </View>

          <Text style={styles.articleText}>
            Et ce durant les <Text style={styles.bold}>12 mois</Text> correspondant à la durée du contrat.
          </Text>

          <Text style={styles.articleTitle}>Article 4 : Montant de remboursement</Text>
          <Text style={styles.articleText}>
            L'association LE KARA s'engage à la date de fin du contrat à verser au membre le nominal correspondant aux sommes versées durant toute la durée du contrat.
          </Text>

          <Text style={styles.articleText}>
            Je prends acte des clauses contractuelles et des conséquences qui pourraient résulter de tout agissement défaillant de ma part.
          </Text>

          <Text style={[styles.articleText, { textAlign: 'center', fontWeight: 'bold', marginTop: 15 }]}>
            CE DOCUMENT EST ÉTABLI POUR FAIRE VALOIR CE QUE DE DROIT
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 50, minHeight: 100, border: '1px solid black', padding: 15 }}>
            <View style={{ width: '48%', justifyContent: 'space-between' }}>
              <Text style={styles.bold}>SIGNATURE DU SECRÉTAIRE EXÉCUTIF :</Text>
              <Text style={{ fontSize: 10, marginTop: 60 }}>Date : ____/____/________</Text>
            </View>
            <View style={{ width: '48%', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <Text style={styles.bold}>[Signature de l'épargnant précédée de la mention « lu et approuvé »]</Text>
              <Text style={{ fontSize: 10, marginTop: 60 }}>Date : ____/____/________</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* PAGE 5 - Récapitulatif des versements */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageContainer}>
          <Text style={styles.title}>RÉCAPITULATIF DES VERSEMENTS MENSUELS</Text>

          <Text style={styles.articleText}>
            CE DOCUMENT PREND ACTE DES DIFFÉRENTS VERSEMENTS MENSUELS EFFECTUÉS PAR L’ÉPARGNANT.
          </Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>NOMBRE DE MOIS</Text>
              <Text style={styles.tableCell}>MONTANT VERSÉ</Text>
              <Text style={styles.tableCell}>DATE DE VERSEMENT</Text>
              <Text style={styles.tableCell}>SIGNATURE DE L'ÉPARGNANT</Text>
            </View>
            {[...Array(contract?.monthsPlanned || 12)].map((_, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.tableCell}>{i + 1}</Text>
                <Text style={styles.tableCell}>
                  {contract?.payments?.[i] ? formatAmount(contract.payments[i].amount) : ''}
                </Text>
                <Text style={styles.tableCell}>
                  {contract?.payments?.[i] ? formatDate(contract.payments[i].paidAt) : ''}
                </Text>
                <Text style={styles.tableCell}>
                  {contract?.payments?.[i] ? '✓' : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default CaisseSpecialePDF
