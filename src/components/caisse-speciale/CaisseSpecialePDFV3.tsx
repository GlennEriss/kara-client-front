'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { getNationalityName } from '@/constantes/nationality'

const colWidths = [0.269, 0.307, 0.152, 0.272]
const sumCols = (start: number, span: number) =>
  colWidths.slice(start, start + span).reduce((acc, val) => acc + val, 0)

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 12,
    paddingTop: 30, // 1820 twips
    paddingRight: 50, // 1240 twips
    paddingBottom: 14, // 280 twips
    paddingLeft: 50, // 1300 twips
    color: '#000000',
  },
  logo: {
    width: 201,
    height: 100,
    objectFit: 'contain',
    alignSelf: 'center',
    marginBottom: 12,
  },
  table: {
    borderWidth: 0.5,
    borderColor: '#999999',
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    paddingVertical: 4,
    paddingHorizontal: 5,
    justifyContent: 'center',
  },
  tableCellRightBorder: {
    borderRightWidth: 0.5,
    borderRightColor: '#999999',
  },
  tableCellBottomBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#999999',
  },
  tableHeaderCell: {
    backgroundColor: '#0070C0',
  },
  tableHeaderText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tableSectionText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tableLabelText: {
    fontSize: 12,
  },
  tableValueText: {
    fontSize: 12,
    textAlign: 'center',
  },
  title1: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    textDecoration: 'underline',
    marginBottom: 12,
    color: '#1f3a4e',
    marginTop: 5,
  },
  title2Underline: {
    fontSize: 15,
    fontWeight: 'bold',
    textDecoration: 'underline',
    marginTop: 12,
    marginBottom: 6,
    color: '#FFFFFF',
    textAlign: 'center',
    backgroundColor: '#224d62',
  },
  title2: {
   fontSize: 15,
    fontWeight: 'bold',
    textDecoration: 'underline',
    marginTop: 12,
    marginBottom: 6,
    color: '#FFFFFF',
    textAlign: 'center',
    backgroundColor: '#224d62',
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    
    marginTop: 12,
    marginBottom: 6,
    color: '#FFFFFF',
    textAlign: 'center',
    backgroundColor: '#224d62',
  },
  paragraph: {
    fontSize: 12,
    lineHeight: 1.3,
    textAlign: 'justify',
  },
  paragraphIndented: {
    fontSize: 12,
    textAlign: 'justify',
    textIndent: 36,
    marginBottom: 6,
  },
  paragraphIndented2: {
    fontSize: 12,
    textAlign: 'center',
    textIndent: 36,
    marginBottom: 6,
    fontWeight: 'bold',
  },
  paragraphListIndent: {
    fontSize: 12,
    lineHeight: 1.3,
    textAlign: 'justify',
    marginLeft: 24,
  },
  numberedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: 24,
    marginBottom: 4,
  },
  numberedIndex: {
    width: 18,
    fontSize: 12,
    fontWeight: 'bold',
  },
  numberedText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 1.3,
    textAlign: 'justify',
  },
  italicText: {
    fontStyle: 'italic',
  },
  rightAlign: {
    textAlign: 'right',
  },
  changeableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 6,
  },
  changeableGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  oval: {
    width: 46,
    height: 18.5,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  ovalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000000',
  },
  dotsLine: {
    fontSize: 12,
    lineHeight: 1.3,
    textAlign: 'justify',
    marginLeft: 6,
  },
  signatureTextSmall: {
    fontSize: 12,
  },
})

type TableCellConfig = {
  content?: React.ReactNode
  span?: number
  textStyle?: any
  backgroundColor?: string
}

const TableRow = ({
  cells,
  height,
  isLastRow,
}: {
  cells: TableCellConfig[]
  height: number
  isLastRow?: boolean
}) => {
  let colIndex = 0

  return (
    <View style={[styles.tableRow, { minHeight: height }]}>
      {cells.map((cell, index) => {
        const span = cell.span ?? 1
        const width = `${sumCols(colIndex, span) * 100}%`
        const isLastCol = colIndex + span >= colWidths.length
        const cellStyles = [
          styles.tableCell,
          { width },
          ...(isLastCol ? [] : [styles.tableCellRightBorder]),
          ...(isLastRow ? [] : [styles.tableCellBottomBorder]),
          ...(cell.backgroundColor ? [{ backgroundColor: cell.backgroundColor }] : []),
        ]

        colIndex += span

        return (
          <View key={index} style={cellStyles}>
            {typeof cell.content === 'string' ? (
              <Text style={cell.textStyle}>{cell.content}</Text>
            ) : (
              cell.content
            )}
          </View>
        )
      })}
    </View>
  )
}

/**
 * PDF Caisse Spéciale V3 - Réplique fidèle de CAISSE_SPECIALE_MUTUELLE_N.docx
 */
const CaisseSpecialePDFV3 = ({ contract }: { contract?: any }) => {
  const logoUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/assets/caisse-speciale/caissesp-logo.png`
    : '/assets/caisse-speciale/caissesp-logo.png'

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
    return amount ? amount : '0'
  }

  const numberToWords = (num: number) => {
    if (num === 0) return 'zéro'
    const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']

    const convertHundreds = (n: number) => {
      let result = ''
      if (n >= 100) {
        const hundredDigit = Math.floor(n / 100)
        result += hundredDigit === 1 ? 'cent' : ones[hundredDigit] + ' cent'
        if (n % 100 !== 0) result += ' '
        n %= 100
      }
      if (n >= 20) {
        const tenDigit = Math.floor(n / 10)
        if (tenDigit === 7) { result += 'soixante'; n += 10 }
        else if (tenDigit === 9) { result += 'quatre-vingt'; n += 10 }
        else result += tens[tenDigit]
        if (n % 10 !== 0) result += (tenDigit === 8 && n % 10 === 1) ? '-un' : '-' + ones[n % 10]
        else if (tenDigit === 8) result += 's'
      } else if (n > 0) result += ones[n]
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
      if (remainder < 1000) result += ' ' + convertHundreds(remainder)
      else {
        const thousands = Math.floor(remainder / 1000)
        const lastPart = remainder % 1000
        if (thousands > 0) result += ' ' + (thousands === 1 ? 'mille' : convertHundreds(thousands) + ' mille')
        if (lastPart > 0) result += ' ' + convertHundreds(lastPart)
      }
    }
    return result
  }

  const caisseType = contract?.caisseType
  const isDailyType = caisseType === 'JOURNALIERE' || caisseType === 'JOURNALIERE_CHARITABLE'
  const isChangeable =
    caisseType === 'LIBRE' ||
    caisseType === 'JOURNALIERE' ||
    caisseType === 'LIBRE_CHARITABLE' ||
    caisseType === 'JOURNALIERE_CHARITABLE'

  const shiftOneMonthForDailyType = (date: any) => {
    if (!isDailyType || !date) return date
    try {
      const baseDate = date?.toDate ? date.toDate() : new Date(date)
      if (isNaN(baseDate.getTime())) return date
      const shifted = new Date(baseDate)
      shifted.setMonth(shifted.getMonth() + 1)
      return shifted
    } catch {
      return date
    }
  }

  const displayFirstPaymentDate = shiftOneMonthForDailyType(contract?.firstPaymentDate)
  const displayLastPaymentDate = shiftOneMonthForDailyType(contract?.lastPaymentDate)
  const memberFullName = `${contract?.member?.lastName ?? ''} ${contract?.member?.firstName ?? ''}`.trim() || '—'
  const memberAddress = contract?.member?.address?.district || '—'
  const memberPhones =
    Array.isArray(contract?.member?.contacts) && contract.member.contacts.length > 0
      ? contract.member.contacts.filter(Boolean).join(' || ')
      : '—'
  const durationMonths = contract?.monthsPlanned || 12
  const amountValue = Number(contract?.monthlyAmount ?? 0)
  const amountInWords = amountValue ? `${numberToWords(amountValue)} francs CFA` : '—'
  const amountInDigits = amountValue ? `${formatAmount(amountValue)} FCFA` : '—'

  return (
    <Document>
      {/* PAGE 1 */}
      <Page size="A4" style={styles.page}>
        <Image src={logoUrl} style={styles.logo} />

        <View style={styles.table}>
          <TableRow
            height={43.35}
            cells={[
              {
                content: 'Informations Personnelles du Membre :',
                span: 4,
                textStyle: styles.tableHeaderText,
                backgroundColor: '#224d62',
              },
            ]}
          />
          <TableRow
            height={26.15}
            cells={[
              { content: 'MATRICULE', textStyle: styles.tableLabelText },
              { content: contract?.memberId || '—', textStyle: styles.tableValueText },
              { content: 'MEMBRE', textStyle: styles.tableLabelText },
              { content: contract?.member?.membershipType?.toUpperCase() || '—', textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26.15}
            cells={[
              { content: 'NOM', textStyle: styles.tableLabelText },
              { content: contract?.member?.lastName?.toUpperCase() || '—', span: 3, textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26.15}
            cells={[
              { content: 'PRÉNOM', textStyle: styles.tableLabelText },
              { content: contract?.member?.firstName || '—', span: 3, textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26.15}
            cells={[
              { content: 'LIEU / NAISSANCE', textStyle: styles.tableLabelText },
              { content: contract?.member?.birthPlace || '—', textStyle: styles.tableValueText },
              { content: 'DATE / NAISSANCE', textStyle: styles.tableLabelText },
              { content: formatDate(contract?.member?.birthDate), textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26.15}
            cells={[
              { content: 'NATIONALITÉ', textStyle: styles.tableLabelText },
              { content: getNationalityName(contract?.member?.nationality), textStyle: styles.tableValueText },
              { content: 'N°CNI/PASS/CS', textStyle: styles.tableLabelText },
              { content: contract?.member?.identityDocumentNumber || '—', textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26.15}
            cells={[
              { content: 'TÉLÉPHONES', textStyle: styles.tableLabelText },
              { content: memberPhones, span: 3, textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26.15}
            cells={[
              { content: 'SEXE', textStyle: styles.tableLabelText },
              { content: contract?.member?.gender || '—', textStyle: styles.tableValueText },
              { content: 'ÂGE', textStyle: styles.tableLabelText },
              { content: contract?.member?.age+' ans' || '—', textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26.15}
            cells={[
              { content: 'QUARTIER', textStyle: styles.tableLabelText },
              { content: contract?.member?.address?.district || '—', textStyle: styles.tableValueText },
              { content: 'PROFESSION', textStyle: styles.tableLabelText },
              { content: contract?.member?.profession || '—', textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={41.9}
            cells={[
              {
                content: 'Informations Concernant Le Contact Urgent :',
                span: 4,
                textStyle: styles.tableSectionText,
                backgroundColor: '#224d62',
              },
            ]}
          />
          <TableRow
            height={26.15}
            cells={[
              { content: 'NOM', textStyle: styles.tableLabelText },
              { content: contract?.emergencyContact?.lastName || '—', span: 3, textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26.15}
            cells={[
              { content: 'PRÉNOM', textStyle: styles.tableLabelText },
              { content: contract?.emergencyContact?.firstName || '—', span: 3, textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26.15}
            cells={[
              { content: 'LIENS', textStyle: styles.tableLabelText },
              { content: contract?.emergencyContact?.relationship || '—', span: 3, textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26.15}
            cells={[
              { content: 'TÉLÉPHONE', textStyle: styles.tableLabelText },
              { content: contract?.emergencyContact?.phone1 || '—', textStyle: styles.tableValueText },
              { content: '', span: 2, textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26.15}
            isLastRow
            cells={[
              { content: 'N°CNI/PASS/CS', textStyle: styles.tableLabelText },
              { content: contract?.emergencyContact?.idNumber || '—', span: 3, textStyle: styles.tableValueText },
            ]}
          />
        </View>
      </Page>

      {/* PAGE 2 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title1}>CAISSE SPÉCIALE</Text>
        <Text style={styles.paragraph}>
               </Text>
               <Text style={styles.paragraph}>
               </Text>
               <Text style={styles.paragraph}>
               </Text>
               <Text style={styles.paragraph}>
               </Text>
               <Text style={styles.paragraph}>
               </Text>

        <Text style={styles.paragraphIndented}>
          Dans le cadre d’une démarche purement sociale et en 
          lien à sa mission de promouvoir la solidarité et l’appui mutuel entre ses membres, l’Association LE KARA met en place le volet « Caisse spéciale ».
        </Text>
        <Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraphIndented}>
          Ce dispositif permet à chaque adhérent volontaire, appelé épargnant, de constituer progressivement une réserve financière personnelle destinée à faire face sereinement aux imprévus de la vie 
          : difficultés passagères, besoins urgents, projets essentiels ou situations fragilisantes.
        </Text>
        <Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraphIndented}>
          L’Association LE KARA s’engage avec transparence, à sécuriser les fonds épargnés et à les mettre à
           la disposition de l’épargnant au moindre besoin, conformément aux dispositions qui suivent.
        </Text>
        <Text style={styles.paragraph}>
        </Text>

        <Text style={[styles.paragraph, { marginTop: 4 }]}>
          <Text style={{ fontWeight: 'bold' }}>L’épargnant : </Text>
          Dénomination donnée au membre de l’association qui souscrit au volet caisse spéciale.
        </Text>
        <Text style={[styles.paragraph, { marginTop: 2 }]}>
          <Text style={{ fontWeight: 'bold' }}>Le nominal : </Text>
          Globalité des versements mensuels de l’épargnant. 
        </Text>
<Text style={styles.paragraph}>
               </Text>
        <Text style={styles.title2Underline}>Fonctionnement général de la Caisse Spéciale</Text>
<Text style={styles.paragraph}>
               </Text>
        {[
          {
            label: 'Durée du contrat',
            text: 'Chaque contrat est conclu sur une période maximale de douze (12) mois',
          },
          {
            label: 'Début du contrat',
            text: 'Le contrat court pour une durée déterminée à partir de la date du premier versement.',
          },
          {
            label: 'Terme du contrat',
            text: 'Le contrat prend fin à la date prévue par le contrat. A cette date, l’épargnant reçoit le remboursement de l’intégralité des sommes qu’il a eu à verser.',
          },
          {
            label: 'Déroulement des versements mensuels',
            text: 'L’épargnant effectue chaque mois un versement librement déterminé, mais dont le montant doit être supérieur ou égal à 100 000 FCFA. Les fonds versés sont déposés sur un compte fermé, ce qui signifie que tout retrait avant le 12ᵉ mois n’est pas autorisé, sauf situations exceptionnelles prévues ci-dessous. Afin d’assurer la stabilité de la caisse, aucun retrait n’est autorisé avant la fin du douzième mois.',
          },
          {
            label: 'Remboursement',
            text: 'Le remboursement du nominal, à l’initiative de l’association et au bénéfice de l’épargnant, intervient sur une durée maximale de trente (30) jours à compter de la date du terme du contrat.  Ce délai permet une gestion saine, responsable et transparente de la trésorerie',
                  

          },
          {
            label: 'Tolérance de retard',
            text: 'Il est accordé à tout épargnant, à compter de la date d’échéance contractuellement prévue pour chaque versement mensuel, un délai de retard de trois(3) jours pour procéder à son versement. Le versement intervenu dans ledit délai ne donne lieu à aucune pénalité.',
          },
        ].map((item, index) => (
          <View key={item.label} style={styles.numberedItem}>
            <Text style={styles.numberedIndex}>{index + 1}.</Text>
            <Text style={styles.numberedText}>
              <Text style={{ fontWeight: 'bold' }}>{item.label} : </Text>
              {item.text}
            </Text>
          </View>
        ))}

        <Text style={[styles.paragraph, { marginTop: 2 }]}>Ce délai permet une gestion saine, responsable et transparente de la trésorerie.</Text>

        <Text style={[styles.paragraphListIndent, { marginTop: 4 }]}>
          •À compter du quatrième jour jusqu'au douzième jour succédant à l'expiration du délai de retard, tout versement intervenu dans cet intervalle est passible de pénalités pécuniaires, destinées à préserver 
          l’équilibre et la bonne tenue de la caisse commune.
        </Text>
        <Text style={styles.paragraphListIndent}>
          •Tout versement intervenu après le douzième jour est irrecevable et s’assimile à un manquement
          substantiel de l’épargnant à ses obligations contractuelles. Ainsi, il entraîne la résiliation
          du contrat à l’initiative du secrétaire exécutif, comme précisé ci-après.
        </Text>

        <Text style={[styles.paragraph, { marginTop: 4 }]}>
          <Text style={{ fontWeight: 'bold' }}>7. Résiliation</Text> : Le contrat est de plein droit résolu si :
        </Text>
        <Text style={[styles.paragraphListIndent, styles.italicText]}>
        </Text>
        <Text style={[styles.paragraphListIndent, styles.italicText]}>-l’épargnant omet le versement d’un mois.</Text>
        <Text style={[styles.paragraphListIndent, styles.italicText]}>
        </Text>
        <Text style={[styles.paragraphListIndent, styles.italicText]}>
          -l’épargnant exige le remboursement du nominal avant le terme du contrat.
        </Text>
<Text style={styles.paragraph}>
        </Text>
        <Text style={[styles.paragraph, { marginTop: 4 }]}>
          Le remboursement du nominal suite à une demande de retrait intervenue avant terme, est réalisé
          dans un intervalle de quarante-cinq jours à compter de la demande.
        </Text>
<Text style={styles.paragraph}>
        </Text>
        <Text style={[styles.paragraph, styles.rightAlign, { marginTop: 12 }]}>
          [Signature de l’épargnant précédée de la mention « lu et approuvé »]
        </Text>
      </Page>

      {/* PAGE 3 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title2}>FICHE D’ADHESION</Text>

        <Text style={styles.paragraphIndented}>Je soussigné(e),</Text>
        <Text style={[styles.paragraphIndented, { fontWeight: 'bold' }]}>{memberFullName}</Text>
        <Text style={[styles.paragraphIndented, { marginTop: 2 }]}>
          Membre de l’association LE KARA, domicilié à {memberAddress} et joignable au :
        </Text>
        <Text style={[styles.paragraphIndented, { marginTop: 2 }]}>
           {memberPhones}.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 1 : OBJET DU CONTRAT</Text>
        <Text style={[styles.paragraphIndented, { marginTop: 2 }]}>Je reconnais avoir adhéré par ce contrat au volet Caisse spéciale de l’association LE KARA.</Text>
<Text style={[styles.paragraphIndented, { marginTop: 2 }]}>
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 2 : DUREE DU CONTRAT</Text>
        <Text style={styles.paragraphIndented}>Que cet engagement est valable pour une durée de {durationMonths} mois ;</Text>
        <Text style={styles.paragraphIndented}>
          Qu’il a été Conclu en date du  <Text style={[styles.paragraph, { fontWeight: 'bold'}]}>{formatDate(displayFirstPaymentDate)}</Text>  et prend donc fin en
        </Text>
        <Text style={[styles.paragraphIndented, { marginTop: 2 }]}>
          Date du  <Text style={[styles.paragraph, { fontWeight: 'bold'}]}>{formatDate(displayLastPaymentDate)}</Text> 
        </Text>
<Text style={[styles.paragraphIndented, { marginTop: 2 }]}>
        </Text>
        <Text style={styles.articleTitle}>ARTICLE 3 : TERMES CONTRACTUELS</Text>
        <Text style={[styles.paragraph, { fontWeight: 'bold', marginTop: 4 }]}>L’épargnant souscrit à la formule :</Text>

        <View style={styles.changeableRow}>
          <View style={styles.changeableGroup}>
            <View style={styles.oval}>
              {isChangeable && <View style={styles.ovalDot} />}
            </View>
            <Text style={{ fontWeight: 'bold', fontSize: 12 }}>Changeable</Text>
          </View>
          <View style={styles.changeableGroup}>
            <View style={styles.oval}>
              {!isChangeable && <View style={styles.ovalDot} />}
            </View>
            <Text style={{ fontWeight: 'bold', fontSize: 12 }}>Non Changeable</Text>
          </View>
        </View>

        <Text style={[styles.paragraphIndented, { marginTop: 4 }]}>Par cet engagement, je prends la décision de mettre à la disposition de l’association la somme déterminée de :</Text>
        {!isChangeable && (
          <>
            <Text style={[styles.paragraphIndented2, { marginTop: 4 }]}>{amountInWords} (Lettres)</Text>
            <Text style={[styles.paragraphIndented2, { marginTop: 2 }]}>{amountInDigits} (Chiffres)</Text>
          </>
        )}
        <Text style={[styles.paragraphIndented, { marginTop: 6 }]}>
          A l’échéance prévue pour le <Text style={[styles.paragraph, { fontWeight: 'bold'}]}>{formatDate(displayFirstPaymentDate)}</Text>. Et ce
        </Text>
        <Text style={[styles.paragraphIndented, { marginTop: 2 }]}>durant les 12 mois correspondant à la durée du contrat.</Text>
      </Page>

      {/* PAGE 4 */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.articleTitle}>ARTICLE 4 : MONTANT DE REMBOURSEMENT</Text>
        <Text style={[styles.paragraphIndented, { marginTop: 2 }]}>L’association LE KARA s’engage à la date de fin du contrat à verser au membre le nominal correspondant aux sommes versées durant toute la durée du contrat.</Text>

        <Text style={[styles.paragraphIndented, { fontWeight: 'bold', marginTop: 4 }]}>Je prends acte des clauses contractuelles et des conséquences qui pourraient résulter de tout agissement défaillant de ma part.</Text>

        <Text style={[styles.paragraphIndented, { marginTop: 4 }]}>CE DOCUMENT EST ÉTABLI POUR FAIRE VALOIR CE QUE DE DROIT</Text>

        <Text style={[styles.paragraphIndented, { marginTop: 16 }]}>SIGNATURE DU SECRÉTAIRE EXÉCUTIF</Text>

        <Text style={[styles.paragraphIndented, styles.signatureTextSmall, { marginTop: 100 }]}>Signature de l’épargnant précédée de la mention « lu et approuvé »</Text>
      </Page>
    </Document>
  )
}

export default CaisseSpecialePDFV3
