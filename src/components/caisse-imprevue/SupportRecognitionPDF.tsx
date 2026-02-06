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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
  },
  logo: {
    width: 200,
    height: 200,
    objectFit: 'cover',
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
  subtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#234D65',
  },
  text: {
    fontSize: 11,
    marginBottom: 6,
    textAlign: 'justify',
  },
  bold: {
    fontWeight: 'bold',
  },
  textCenter: {
    textAlign: 'center',
  },
  signatureSection: {
    marginTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '45%',
    marginTop: 20,
  },
  signatureLine: {
    borderBottom: '1px solid black',
    height: 30,
    marginBottom: 5,
  },
  signatureLabel: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  memberName: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#666',
  },
  table: {
    width: '100%',
    border: '1px solid #265169',
    marginTop: 10,
    marginBottom: 15,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {
    backgroundColor: '#234D65',
    color: 'white',
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    borderRight: '1px solid #265169',
    borderBottom: '1px solid #265169',
    padding: 5,
    fontSize: 10,
  },
  forfaitCell: {
    width: '20%',
  },
  amountCell: {
    width: '30%',
  },
  forfaitRowHighlight: {
    backgroundColor: '#E8F4FC',
  },
  forfaitCellHighlight: {
    backgroundColor: '#E8F4FC',
  },
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
  },
})

export interface SupportRecognitionContract {
  memberFirstName: string
  memberLastName: string
  subscriptionCICode: string
  subscriptionCIAmountPerMonth: number
  subscriptionCINominal?: number
  subscriptionCISupportMin?: number
  subscriptionCISupportMax?: number
}

interface SupportRecognitionPDFProps {
  contract: SupportRecognitionContract
  /** Date de la prise d'aide ("en date du") */
  datePriseAide: Date
  /** Date de la prochaine échéance à payer */
  dateProchaineEcheance: Date
}

const SupportRecognitionPDF = ({ contract, datePriseAide, dateProchaineEcheance }: SupportRecognitionPDFProps) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const memberName = `${contract.memberFirstName} ${contract.memberLastName}`

  // Tableau forfait : mêmes lignes et surlignage que CaisseImprevuePDFV3
  const code = (contract?.subscriptionCICode ?? '').toString().toUpperCase().trim()
  const fixedRows: [string, string, string][] = [
    ['A- 10 000', '120 000', '[0 ; 30 000]'],
    ['B- 20 000', '240 000', '[0 ; 60 000]'],
    ['C- 30 000', '360 000', '[0 ; 90 000]'],
    ['D- 40 000', '480 000', '[0 ; 120 000]'],
    ['E-50 000', '600 000', '[0 ; 150 000]'],
  ]
  const codeToIndex: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 }
  const isFixed = code in codeToIndex
  const customRow: [string, string, string] | null =
    !isFixed && contract
      ? [
          `${contract.subscriptionCICode ?? ''}- ${Number(contract.subscriptionCIAmountPerMonth ?? 0).toLocaleString('fr-FR')}`,
          Number(contract.subscriptionCINominal ?? 0).toLocaleString('fr-FR'),
          `[${Number(contract.subscriptionCISupportMin ?? 0).toLocaleString('fr-FR')} ; ${Number(contract.subscriptionCISupportMax ?? 0).toLocaleString('fr-FR')}]`,
        ]
      : null
  const forfaitRows = customRow ? [...fixedRows, customRow] : fixedRows
  const highlightedIndex = isFixed ? codeToIndex[code] : 5

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.pageContainer}>
          {/* Logo */}
          <View style={styles.header}>
            <Image
              src={typeof window !== 'undefined' ? window.location.origin + '/Logo-Kara.jpg' : '/Logo-Kara.jpg'}
              style={styles.logo}
            />
          </View>

          {/* Titre */}
          <Text style={styles.title}>RECONNAISSANCE DE SOUSCRIPTION</Text>
          <Text style={styles.subtitle}>À L'ACCOMPAGNEMENT</Text>

          {/* Texte principal */}
          <Text style={styles.text}>
            Je soussigné(e), <Text style={styles.bold}>{memberName}</Text>,
          </Text>

          <Text style={styles.text}>
            Membre de l'Association KARA, reconnais avoir souscris un accompagnement régulier à taux nul, en date du{' '}
            <Text style={styles.bold}>{formatDate(datePriseAide)}</Text>.
          </Text>

          <Text style={styles.text}>
            Je m'engage à rembourser la somme empruntée au plus tard avant le paiement de la prochaine contribution prévu en date du{' '}
            <Text style={styles.bold}>{formatDate(dateProchaineEcheance)}</Text>.
          </Text>

          <Text style={[styles.text, { marginTop: 15 }]}>
            J'atteste, qu'en cas de non remboursement de l'accompagnement dans le délai indiqué, KARA se réserve la faculté de se désintéresser par prélèvement dans mon nominal, et ce après mise en demeure.
          </Text>

          {/* Type d'accompagnement */}
          <Text style={[styles.subtitle, { marginTop: 25, marginBottom: 10 }]}>
            Type d'accompagnement sollicité :
          </Text>

          {/* Tableau des forfaits (Forfait, Nominal, Appui) avec surlignage */}
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.forfaitCell]}>Forfait</Text>
              <Text style={[styles.tableCell, styles.amountCell]}>Nominal</Text>
              <Text style={styles.tableCell}>Appui</Text>
            </View>
            {forfaitRows.map((row, index) => {
              const highlighted = index === highlightedIndex
              const rowStyle = highlighted ? [styles.tableRow, styles.forfaitRowHighlight] : styles.tableRow
              const cell1Style = highlighted
                ? [styles.tableCell, styles.forfaitCell, styles.forfaitCellHighlight]
                : [styles.tableCell, styles.forfaitCell]
              const cell2Style = highlighted
                ? [styles.tableCell, styles.amountCell, styles.forfaitCellHighlight]
                : [styles.tableCell, styles.amountCell]
              const cell3Style = highlighted
                ? [styles.tableCell, styles.forfaitCellHighlight]
                : [styles.tableCell]
              return (
                <View key={index} style={rowStyle}>
                  <Text style={cell1Style}>{row[0]}</Text>
                  <Text style={cell2Style}>{row[1]}</Text>
                  <Text style={cell3Style}>{row[2]}</Text>
                </View>
              )
            })}
          </View>

          {/* Section de signature */}
          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <Text style={[styles.signatureLabel, styles.textCenter]}>SIGNATURE DU SECRÉTAIRE EXÉCUTIF</Text>
              <View style={styles.signatureLine}></View>
            </View>

            <View style={styles.signatureBox}>
              <Text style={[styles.signatureLabel, styles.textCenter]}>SIGNATURE MEMBRE</Text>
              <View style={styles.signatureLine}></View>
              <Text style={[styles.memberName, styles.textCenter]}>{memberName}</Text>
            </View>
          </View>

          {/* Pied de page */}
          <Text style={styles.footer}>
            Document généré le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export default SupportRecognitionPDF
