'use client'

import { getNationalityName } from '@/constantes/nationality'
import type { Placement, User } from '@/types/types'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import React from 'react'

const colWidths = [0.269, 0.307, 0.152, 0.272]
const sumCols = (start: number, span: number) =>
  colWidths.slice(start, start + span).reduce((acc, val) => acc + val, 0)

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 12,
    paddingTop: 34,
    paddingRight: 52,
    paddingBottom: 28,
    paddingLeft: 52,
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
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    textDecoration: 'underline',
    marginBottom: 20,
  },
  headingSecondary: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    textDecoration: 'underline',
    marginBottom: 24,
  },
  paragraph: {
    fontSize: 12,
    lineHeight: 1.55,
    textAlign: 'justify',
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 9,
  },
  bulletSymbol: {
    width: 14,
    fontSize: 12,
    marginTop: 1,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 1.55,
    textAlign: 'justify',
  },
  sectionTitleUnderline: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textDecoration: 'underline',
    marginTop: 16,
    marginBottom: 10,
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 14,
    marginBottom: 8,
  },
  italicText: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 1.55,
    marginTop: 20,
  },
  signatureRow: {
    marginTop: 80,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  signatureColLeft: {
    width: '46%',
  },
  signatureColRight: {
    width: '46%',
  },
  signatureText: {
    fontSize: 12,
    textAlign: 'left',
    marginBottom: 8,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 16,
    right: 24,
    fontSize: 10,
    color: '#4B5563',
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

const sanitize = (v: unknown) => (v == null || v === '' ? '—' : String(v))

const formatDate = (value?: Date | string) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR')
}

const calculateAge = (birthDate?: string) => {
  if (!birthDate) return '—'
  const d = new Date(birthDate)
  if (Number.isNaN(d.getTime())) return '—'
  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const monthDiff = today.getMonth() - d.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) age -= 1
  return age > 0 ? `${age} ans` : '—'
}

const numberToWords = (num: number) => {
  if (!num || Number.isNaN(num)) return 'zéro'
  if (num === 0) return 'zéro'
  const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']

  const convertHundreds = (n: number) => {
    let result = ''
    if (n >= 100) {
      const hundredDigit = Math.floor(n / 100)
      result += hundredDigit === 1 ? 'cent' : `${ones[hundredDigit]} cent`
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
        result += tenDigit === 8 && n % 10 === 1 ? '-un' : `-${ones[n % 10]}`
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
    let result = thousands === 1 ? 'mille' : `${convertHundreds(thousands)} mille`
    if (remainder > 0) result += ` ${convertHundreds(remainder)}`
    return result
  }

  const millions = Math.floor(num / 1000000)
  const remainder = num % 1000000
  let result = millions === 1 ? 'un million' : `${convertHundreds(millions)} millions`
  if (remainder > 0) {
    if (remainder < 1000) {
      result += ` ${convertHundreds(remainder)}`
    } else {
      const thousands = Math.floor(remainder / 1000)
      const lastPart = remainder % 1000
      if (thousands > 0) result += ` ${thousands === 1 ? 'mille' : `${convertHundreds(thousands)} mille`}`
      if (lastPart > 0) result += ` ${convertHundreds(lastPart)}`
    }
  }
  return result
}

export default function PlacementContractPDF({
  placement,
  member,
}: {
  placement: Placement
  member: User | null | undefined
}) {
  const logoUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/assets/caisse-speciale/caissesp-logo.png`
      : '/assets/caisse-speciale/caissesp-logo.png'

  const memberFullName = member
    ? `${member.lastName ?? ''} ${member.firstName ?? ''}`.trim()
    : placement.benefactorName || placement.benefactorId
  const memberPhones = member?.contacts?.filter(Boolean).join(' || ') || placement.benefactorPhone || '—'
  const memberQuarter =
    member?.address?.district || member?.address?.arrondissement || member?.address?.city || member?.address?.province || '—'
  const urgentName = placement.urgentContact?.name || '—'
  const urgentFirstName = placement.urgentContact?.firstName || '—'
  const urgentPhone = placement.urgentContact?.phone || '—'
  const urgentPhone2 = placement.urgentContact?.phone2 || '—'
  const urgentRelationship = placement.urgentContact?.relationship || '—'
  const urgentId = placement.urgentContact?.idNumber || '—'
  const urgentDocType = placement.urgentContact?.typeId || '—'
  const amountNumber = Math.round(Number(placement.amount || 0))
  const amountInDigits = `${String(amountNumber).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`
  const amountInLetters = `${numberToWords(amountNumber)} francs CFA`
  const startDate = formatDate(placement.startDate)
  const endDate = formatDate(placement.endDate)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text
          style={styles.pageNumber}
          fixed
          render={({ pageNumber }) => `${pageNumber}`}
        />
        <Image src={logoUrl} style={styles.logo} />
        <View style={styles.table}>
          <TableRow
            height={44}
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
            height={26}
            cells={[
              { content: 'MATRICULE', textStyle: styles.tableLabelText },
              { content: sanitize(member?.matricule || placement.benefactorId), textStyle: styles.tableValueText },
              { content: 'MEMBRE', textStyle: styles.tableLabelText },
              { content: 'BIENFAITEUR', textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26}
            cells={[
              { content: 'NOM', textStyle: styles.tableLabelText },
              { content: sanitize(member?.lastName), span: 3, textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26}
            cells={[
              { content: 'PRÉNOM', textStyle: styles.tableLabelText },
              { content: sanitize(member?.firstName), span: 3, textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26}
            cells={[
              { content: 'LIEU / NAISSANCE', textStyle: styles.tableLabelText },
              { content: sanitize(member?.birthPlace), textStyle: styles.tableValueText },
              { content: 'DATE / NAISSANCE', textStyle: styles.tableLabelText },
              { content: formatDate(member?.birthDate), textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26}
            cells={[
              { content: 'NATIONALITÉ', textStyle: styles.tableLabelText },
              { content: getNationalityName(member?.nationality), textStyle: styles.tableValueText },
              { content: 'N°CNI/PASS/CS', textStyle: styles.tableLabelText },
              { content: sanitize(member?.identityDocumentNumber), textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26}
            cells={[
              { content: 'TÉLÉPHONES', textStyle: styles.tableLabelText },
              { content: memberPhones, span: 3, textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26}
            cells={[
              { content: 'SEXE', textStyle: styles.tableLabelText },
              { content: sanitize(member?.gender), textStyle: styles.tableValueText },
              { content: 'ÂGE', textStyle: styles.tableLabelText },
              { content: calculateAge(member?.birthDate), textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26}
            cells={[
              { content: 'QUARTIER', textStyle: styles.tableLabelText },
              { content: memberQuarter, textStyle: styles.tableValueText },
              { content: 'PROFESSION', textStyle: styles.tableLabelText },
              { content: sanitize(member?.profession), textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={42}
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
            height={26}
            cells={[
              { content: 'NOM', textStyle: styles.tableLabelText },
              { content: urgentName, span: 3, textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26}
            cells={[
              { content: 'PRÉNOM', textStyle: styles.tableLabelText },
              { content: urgentFirstName, span: 3, textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26}
            cells={[
              { content: 'LIENS', textStyle: styles.tableLabelText },
              { content: urgentRelationship, span: 3, textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26}
            cells={[
              { content: 'TÉLÉPHONE', textStyle: styles.tableLabelText },
              { content: `${urgentPhone}${urgentPhone2 !== '—' ? ` || ${urgentPhone2}` : ''}`, span: 3, textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={26}
            isLastRow
            cells={[
              { content: 'N°CNI/PASS/CS', textStyle: styles.tableLabelText },
              { content: `${urgentDocType}${urgentId !== '—' ? ` ${urgentId}` : ''}`, span: 3, textStyle: styles.tableValueText },
            ]}
          />
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text
          style={styles.pageNumber}
          fixed
          render={({ pageNumber }) => `${pageNumber}`}
        />
        <Text style={styles.heading}>BIENFAITEUR</Text>

        <Text style={styles.paragraph}>
          Dans le cadre de sa mission sociale et de son engagement en faveur de la solidarité, l’Association LE KARA met en place
          le volet « Bienfaiteur », un dispositif fondé sur l’entraide, la confiance et la responsabilité collective.
        </Text>
        <Text style={styles.paragraph}>
          Ce mécanisme permet aux membres Bienfaiteurs de contribuer volontairement au développement et à la pérennité des actions
          sociales de l’Association, par des soutiens financiers consentis sans intérêts dans un esprit non lucratif et profondément solidaire.
        </Text>
        <Text style={styles.paragraph}>
          La présente fiche concerne spécifiquement les soutiens financiers à taux nul, accordés librement par les Bienfaiteurs à
          l’Association, dans le respect des valeurs de transparence, d’éthique et de coopération qui fondent l’action associative.
        </Text>
        <Text style={styles.paragraph}>En contrepartie de cet engagement, l’Association LE KARA s’engage à :</Text>

        <View style={styles.bulletRow}>
          <Text style={styles.bulletSymbol}>•</Text>
          <Text style={styles.bulletText}>
            gérer les fonds confiés avec rigueur, transparence et responsabilité et en assurer la traçabilité.
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <Text style={styles.bulletSymbol}>•</Text>
          <Text style={styles.bulletText}>
            procéder à leur restitution selon les modalités librement convenues avec le Bienfaiteur.
          </Text>
        </View>

        <Text style={styles.sectionTitleUnderline}>Définitions</Text>
        <Text style={styles.paragraph}>
          <Text style={{ fontWeight: 'bold' }}>Bienfaiteur : </Text>
          membre de l’Association qui, par solidarité et esprit d’entraide, apporte un soutien financier volontaire à l’Association LE KARA.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={{ fontWeight: 'bold' }}>Nominal : </Text>
          montant total des sommes mises à disposition de l’Association par le Bienfaiteur dans le cadre du présent engagement.
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text
          style={styles.pageNumber}
          fixed
          render={({ pageNumber }) => `${pageNumber}`}
        />
        <Text style={styles.headingSecondary}>Les Clauses</Text>

        <View style={styles.bulletRow}>
          <Text style={styles.bulletSymbol}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={{ fontWeight: 'bold' }}>Durée de l’engagement : </Text>
            Chaque engagement est conclu pour une durée maximale de douze (12) mois, définie d’un commun accord entre le Bienfaiteur et l’Association.
          </Text>
        </View>

        <View style={styles.bulletRow}>
          <Text style={styles.bulletSymbol}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={{ fontWeight: 'bold' }}>Début de l’engagement : </Text>
            L’engagement prend effet à compter de la date du premier versement, pour la durée convenue.
          </Text>
        </View>

        <View style={styles.bulletRow}>
          <Text style={styles.bulletSymbol}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={{ fontWeight: 'bold' }}>Modalités de versement : </Text>
            Le soutien financier du Bienfaiteur est entièrement volontaire. Aucune obligation de montant minimal ou maximal n’est imposée.
            Le versement, lorsqu’il intervient, est effectué à titre volontaire, en une seule tranche. Ce montant est maintenu identique
            pendant la durée de l’engagement, dans un souci de prévisibilité et de bonne organisation des actions solidaires, afin de
            permettre à l’Association d’anticiper et d’organiser sereinement ses actions solidaires. Cette règle répond exclusivement à une
            exigence de gestion responsable et solidaire, et non à une obligation financière imposée au Bienfaiteur.
          </Text>
        </View>

        <View style={styles.bulletRow}>
          <Text style={styles.bulletSymbol}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={{ fontWeight: 'bold' }}>Terme de l’engagement : </Text>
            L’engagement prend fin à la date prévue contractuellement. À cette échéance, l’Association procède à la restitution intégrale
            du nominal, dans le respect des engagements pris.
          </Text>
        </View>

        <View style={styles.bulletRow}>
          <Text style={styles.bulletSymbol}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={{ fontWeight: 'bold' }}>Modalités de remboursement : </Text>
            Le remboursement du nominal intervient dans un délai maximum de trente (30) jours à compter du terme de l’engagement.
          </Text>
        </View>

        <Text style={styles.paragraph}>
          En cas de demande anticipée de remboursement formulée par le Bienfaiteur avant l’échéance, l’Association s’engage à restituer
          le nominal dans un délai maximum de quarante-cinq (45) jours à compter de la réception de la demande.
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text
          style={styles.pageNumber}
          fixed
          render={({ pageNumber }) => `${pageNumber}`}
        />
        <Text style={styles.headingSecondary}>FICHE D’ADHÉSION – VOLET BIENFAITEUR</Text>

        <Text style={styles.paragraph}>Je soussigné (e) : {memberFullName}</Text>
        <Text style={styles.paragraph}>Domicilié à : {memberQuarter}</Text>
        <Text style={styles.paragraph}>Joignable au : {memberPhones}</Text>

        <Text style={[styles.paragraph, { marginTop: 12 }]}>
          Déclare adhérer librement au volet Bienfaiteur de l’Association LE KARA.
        </Text>

        <Text style={styles.articleTitle}>Article 1 – Objet de l’engagement</Text>
        <Text style={styles.paragraph}>
          Par le présent document, je confirme mon adhésion au volet Bienfaiteur et mon souhait de participer activement, par solidarité,
          au soutien des actions sociales menées par l’Association LE KARA.
        </Text>

        <Text style={styles.articleTitle}>Article 2 – Durée de l’engagement</Text>
        <Text style={styles.paragraph}>Le présent engagement est conclu pour une durée de : {sanitize(placement.periodMonths)} mois</Text>
        <Text style={styles.paragraph}>Il est conclu en date du : {startDate}</Text>
        <Text style={styles.paragraph}>Et prendra fin en date du : {endDate}</Text>

        <Text style={styles.articleTitle}>Article 3 – Montant du soutien solidaire</Text>
        <Text style={styles.paragraph}>
          Dans un esprit d’entraide et de confiance, je mets à la disposition de l’Association LE KARA la somme de :
        </Text>
        <Text style={styles.paragraph}>En lettres : {amountInLetters}</Text>
        <Text style={styles.paragraph}>En chiffres : {amountInDigits}</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text
          style={styles.pageNumber}
          fixed
          render={({ pageNumber }) => `${pageNumber}`}
        />
        <Text style={styles.articleTitle}>Article 4 – Restitution du nominal</Text>
        <Text style={styles.paragraph}>
          L’Association LE KARA s’engage à restituer, à l’échéance de l’engagement, le nominal correspondant aux sommes versées,
          conformément aux modalités prévues.
        </Text>

        <Text style={styles.italicText}>
          Je reconnais avoir pris connaissance de l’ensemble des dispositions du présent engagement, fondé sur la bonne foi,
          la coopération et la responsabilité mutuelle.
        </Text>

        <View style={styles.signatureRow}>
          <View style={styles.signatureColLeft}>
            <Text style={styles.signatureText}>Signature du Secrétaire Exécutif</Text>
          </View>
          <View style={styles.signatureColRight}>
            <Text style={styles.signatureText}>Signature du Bienfaiteur</Text>
            <Text style={styles.signatureText}>Précédée de la mention Lu et approuvé</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
