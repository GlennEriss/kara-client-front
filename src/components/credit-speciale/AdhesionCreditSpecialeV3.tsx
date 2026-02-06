'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'
import { getNationalityName } from '@/constantes/nationality'
import { CreditContract, MEMBERSHIP_TYPE_LABELS } from '@/types/types'
import { calculateSchedule, formatNumberWithSpaces } from '@/utils/credit-speciale-calculations'

Font.register({
  family: 'Times New Roman',
  fonts: [
    { src: '/fonts/TimesNewRoman-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/TimesNewRoman-Bold.ttf', fontWeight: 'bold' },
    { src: '/fonts/TimesNewRoman-Italic.ttf', fontStyle: 'italic' },
    { src: '/fonts/TimesNewRoman-BoldItalic.ttf', fontWeight: 'bold', fontStyle: 'italic' },
  ],
})

Font.register({
  family: 'Bahnschrift',
  fonts: [
    { src: '/fonts/Bahnschrift-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/Bahnschrift-Bold.ttf', fontWeight: 'bold' },
  ],
})

const colWidths = [2668, 3048, 1510, 2689]
const sumCols = (start: number, span: number) =>
  colWidths.slice(start, start + span).reduce((acc, val) => acc + val, 0)

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times New Roman',
    fontSize: 12,
    paddingTop: 50,
    paddingRight: 60,
    paddingBottom: 50,
    paddingLeft: 60,
    color: '#000000',
    lineHeight: 1.3,
  },
  logo: {
    width: 186,
    height: 100,
    objectFit: 'contain',
    marginBottom: 8,
  },
  table: {
    borderWidth: 0.5,
    borderColor: '#C9C9C9',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  tableCellRightBorder: {
    borderRightWidth: 0.5,
    borderRightColor: '#C9C9C9',
  },
  tableCellBottomBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#C9C9C9',
  },
  tableHeaderText: {
    fontFamily: 'Times New Roman',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tableLabelText: {
    fontFamily: 'Bahnschrift',
    fontSize: 10,
  },
  tableValueText: {
    fontFamily: 'Times New Roman',
    fontSize: 10,
  },
  associationLabel: {
    fontFamily: 'Bahnschrift',
    fontSize: 10,
    marginBottom: 4,
  },
  title16: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  title14Center: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  paragraph12: {
    fontSize: 12,
    textAlign: 'justify',
    marginBottom: 4,
  },
  paragraph14: {
    fontSize: 14,
    textAlign: 'justify',
    marginBottom: 4,
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'justify',
    marginTop: 8,
    marginBottom: 4,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  signatureText14: {
    fontSize: 14,
  },
  signatureTextRight: {
    fontSize: 14,
    textAlign: 'right',
  },
  indent: {
    marginLeft: 36,
  },
  scheduleTable: {
    marginTop: 6,
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: '#C9C9C9',
  },
  scheduleRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#C9C9C9',
  },
  scheduleRowLast: {
    flexDirection: 'row',
  },
  scheduleCell: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 14,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#C9C9C9',
  },
  scheduleCellLast: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 14,
    textAlign: 'center',
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
          ...(!isLastCol ? [styles.tableCellRightBorder] : []),
          ...(!isLastRow ? [styles.tableCellBottomBorder] : []),
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

const numberToWords = (num: number): string => {
  if (!num || Number.isNaN(num)) return '—'
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

interface AdhesionCreditSpecialeV3Props {
  contract: CreditContract
  memberData?: any
  guarantorData?: any
}

const AdhesionCreditSpecialeV3 = ({ contract, memberData, guarantorData }: AdhesionCreditSpecialeV3Props) => {
  const logoUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/assets/credit-speciale/image1.png`
    : '/assets/credit-speciale/image1.png'

  const formatDate = (date: any) => {
    if (!date) return '—'
    try {
      const dateObj = date?.toDate ? date.toDate() : new Date(date)
      if (Number.isNaN(dateObj.getTime())) return '—'
      return dateObj.toLocaleDateString('fr-FR')
    } catch {
      return '—'
    }
  }

  const formatAmount = (amount?: number) => {
    if (!amount) return '0'
    return formatNumberWithSpaces(amount)
  }

  const formatAddress = (address: any): string => {
    if (!address) return '—'
    if (typeof address === 'string') return address
    if (typeof address === 'object') {
      const parts = []
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
    matricule: memberData?.matricule || memberData?.id || contract.clientId || '—',
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
    quarter: formatAddress(memberData?.address) || (memberData?.address?.arrondissement || memberData?.address?.district) || '—',
    nationality: getNationalityName(memberData?.nationality || '') || '—',
    association: 'LE KARA',
  }

  const guarantor = {
    lastName: guarantorData?.lastName || contract.guarantorLastName || '—',
    firstName: guarantorData?.firstName || contract.guarantorFirstName || '—',
    phone: guarantorData?.contacts?.[0] || '—',
    address: formatAddress(guarantorData?.address),
  }

  const firstPaymentDate = contract.firstPaymentDate
    ? (contract.firstPaymentDate as any)?.toDate
      ? (contract.firstPaymentDate as any).toDate()
      : new Date(contract.firstPaymentDate as any)
    : null

  const schedule = firstPaymentDate
    ? calculateSchedule({
        amount: contract.amount,
        interestRate: contract.interestRate,
        monthlyPayment: contract.monthlyPaymentAmount,
        firstPaymentDate,
        maxDuration: contract.duration,
      })
    : []

  const endDate = firstPaymentDate ? (() => {
    const d = new Date(firstPaymentDate)
    d.setMonth(d.getMonth() + (contract.duration || 0) - 1)
    return d
  })() : null

  const guaranteeAmount = contract.totalAmount || contract.amount

  const scheduleRows = Array.from({ length: 7 }).map((_, index) => schedule[index])
  const bandColor = '#EDEDED'
  const withBand = (cells: TableCellConfig[], shaded: boolean) =>
    shaded ? cells.map((cell) => ({ ...cell, backgroundColor: bandColor })) : cells

  return (
    <Document>
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
              },
            ]}
          />
          <TableRow
            height={26.15}
            cells={withBand([
              { content: 'MATRICULE :', textStyle: styles.tableLabelText },
              { content: member.matricule, textStyle: styles.tableValueText },
              { content: 'MEMBRE :', textStyle: styles.tableLabelText },
              { content: String(member.membershipType).toUpperCase(), textStyle: styles.tableValueText },
            ], true)}
          />
          <TableRow
            height={26.15}
            cells={withBand([
              { content: 'NOM :', textStyle: styles.tableLabelText },
              { content: String(member.lastName).toUpperCase(), span: 3, textStyle: styles.tableValueText },
            ], false)}
          />
          <TableRow
            height={26.15}
            cells={withBand([
              { content: 'PRÉNOM :', textStyle: styles.tableLabelText },
              { content: member.firstName, span: 3, textStyle: styles.tableValueText },
            ], true)}
          />
          <TableRow
            height={26.15}
            cells={withBand([
              { content: 'LIEU / NAISSANCE :', textStyle: styles.tableLabelText },
              { content: member.birthPlace, textStyle: styles.tableValueText },
              { content: 'DATE / NAISSANCE :', textStyle: styles.tableLabelText },
              { content: member.birthDate, textStyle: styles.tableValueText },
            ], false)}
          />
          <TableRow
            height={26.15}
            cells={withBand([
              { content: 'TYPE DE PIÈCE :', textStyle: styles.tableLabelText },
              { content: member.identityDocument, textStyle: styles.tableValueText },
              { content: 'N° DE PIÈCE :', textStyle: styles.tableLabelText },
              { content: member.identityDocumentNumber, textStyle: styles.tableValueText },
            ], true)}
          />
          <TableRow
            height={26.15}
            cells={withBand([
              { content: 'TÉLÉPHONE 1 :', textStyle: styles.tableLabelText },
              { content: member.phone1, textStyle: styles.tableValueText },
              { content: 'TÉLÉPHONE 2 :', textStyle: styles.tableLabelText },
              { content: member.phone2, textStyle: styles.tableValueText },
            ], false)}
          />
          <TableRow
            height={26.15}
            cells={withBand([
              { content: 'SEXE :', textStyle: styles.tableLabelText },
              { content: member.gender, textStyle: styles.tableValueText },
              { content: 'QUARTIER :', textStyle: styles.tableLabelText },
              { content: member.quarter, textStyle: styles.tableValueText },
            ], true)}
          />
          <TableRow
            height={26.15}
            isLastRow
            cells={withBand([
              { content: 'NATIONALITÉ :', textStyle: styles.tableLabelText },
              { content: member.nationality, textStyle: styles.tableValueText },
              { content: 'ASSOCIATION', textStyle: styles.tableLabelText },
              { content: member.association, textStyle: styles.tableValueText },
            ], false)}
          />
        </View>

        <Text style={styles.associationLabel}>ASSOCIATION</Text>
        <Text style={styles.title16}>RECONNAISSANCE DE DETTE</Text>

        <Text style={styles.paragraph12}>
          Je soussigné M/Mme/Mlle {String(member.lastName).toUpperCase()} {member.firstName} de nationalité {member.nationality} membre de l’Association LE KARA par la présente, je reconnais avoir reçu de la mutuelle un accompagnement financier, conformément aux dispositions du règlement intérieur, d’un montant de {formatAmount(contract.amount)} FCFA (chiffres),
        </Text>
        <Text style={styles.paragraph12}>
          {numberToWords(contract.amount)} FCFA (lettres), en date du {formatDate(firstPaymentDate)}.
        </Text>
        <Text style={styles.paragraph12}>
          Cette somme doit être restituée à la trésorerie de l’Association selon un échéancier de {contract.duration} mois à compter du {formatDate(firstPaymentDate)}. Jusqu’au {formatDate(endDate)} date de fin de créance.
        </Text>
        <Text style={styles.paragraph12}>
          En foi de quoi, la présente reconnaissance de dette est signée par les deux parties pour servir et valoir ce que de droit.
        </Text>
        <Text style={styles.paragraph12}>
          Fait à …………….…….. Le …………... /…………..…../…………
        </Text>

        <View style={styles.signatureRow}>
          <Text style={styles.signatureText14}>SECRÉTAIRE EXÉCUTIF</Text>
          <Text style={styles.signatureText14}>MEMBRE BÉNÉFICIAIRE</Text>
        </View>
        <View style={styles.signatureRow}>
          <Text style={styles.signatureText14}> </Text>
          <Text style={styles.signatureTextRight}>(Précédée de la mention lue et approuvé)</Text>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.title14Center}>PROTOCOLE D’ACCOMPAGNEMENT</Text>

        <Text style={styles.articleTitle}>ARTICLE 1 : MONTANT ET DURÉE DE LA CRÉANCE</Text>
        <Text style={styles.paragraph14}>
          L’Association accorde et consent au membre bénéficiaire un accompagnement
        </Text>
        <Text style={styles.paragraph14}>Exceptionnel</Text>
        <Text style={styles.paragraph14}>Régulier</Text>
        <Text style={styles.paragraph14}>À hauteur de</Text>
        <Text style={styles.paragraph14}>{formatAmount(contract.amount)} FCFA (chiffres)</Text>
        <Text style={styles.paragraph14}>{numberToWords(contract.amount)} FCFA (lettres),</Text>
        <Text style={styles.paragraph14}>
          En date du {formatDate(firstPaymentDate)}. Pour une nécessité sociale.
        </Text>
        <Text style={styles.paragraph14}>
          La mise à disposition effective des fonds auprès du membre bénéficiaire pourra prendre quelques jours supplémentaires sans que ce délai n’affecte la date de début du prêt.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 2 : REMBOURSEMENT DE SOMME</Text>
        <Text style={styles.paragraph14}>
          Le membre s’engage sur l’honneur à rembourser ledit accompagnement en plusieurs échéances mensuelles sous un délai maximum de {contract.duration} mois.
        </Text>
        <Text style={styles.paragraph14}>
          Le tableau ci-dessous représente l’échéancier convenu entre les parties.
        </Text>

        <View style={styles.scheduleTable}>
          <View style={styles.scheduleRow}>
            <Text style={styles.scheduleCell}>Échéances</Text>
            <Text style={styles.scheduleCell}>Date</Text>
            <Text style={styles.scheduleCellLast}>Montant FCFA</Text>
          </View>
          {scheduleRows.map((item, index) => (
            <View
              key={index}
              style={[
                index === scheduleRows.length - 1 ? styles.scheduleRowLast : styles.scheduleRow,
                ...(index % 2 === 0 ? [{ backgroundColor: bandColor }] : []),
              ]}
            >
              <Text style={styles.scheduleCell}>{item ? `M${item.month}` : ''}</Text>
              <Text style={styles.scheduleCell}>{item ? formatDate(item.date) : ''}</Text>
              <Text style={styles.scheduleCellLast}>{item ? formatAmount(item.payment) : ''}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.paragraph14}>
          Tout remboursement mensuel portant sur des sommes en dessous de celles prévues dans ledit échéancier est non valable et irrecevable.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 3 : EXIGIBILITÉ DE LA CRÉANCE</Text>
        <Text style={styles.paragraph14}>
          L’arrivée de chaque échéance mensuelle vaut d’office mise en demeure du débiteur et marque le décompte des intérêts légaux.
        </Text>
        <Text style={styles.paragraph14}>
          Le non-respect des échéanciers expose le membre bénéficiaire à des poursuites judiciaires sous huitaine.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 4 : DÉCLARATIONS ET ENGAGEMENTS DU PRÊTEUR</Text>
        <Text style={styles.paragraph14}>Le membre bénéficiaire déclare et reconnaît :</Text>
        <Text style={styles.paragraph14}>Il est majeur et a la capacité juridique pour conclure le contrat ;</Text>
        <Text style={styles.paragraph14}>Il a compris les termes du contrat et la portée de ses engagements ;</Text>
        <Text style={styles.paragraph14}>Il prend l’engagement de moduler ses capacités financières personnelles afin d’honorer à son remboursement ;</Text>
        <Text style={styles.paragraph14}>Il a pris connaissance du règlement intérieur de KARA et du protocole d’accompagnement ;</Text>
        <Text style={styles.paragraph14}>Le membre bénéficiaire affecte :</Text>
        <Text style={[styles.paragraph14, styles.indent]}>
          Pour des raisons de prévoyance, M/Mme/Mlle {guarantor.lastName} {guarantor.firstName} Qui se porte caution solidaire en cas de non-exécution de ma part.
        </Text>
        <Text style={[styles.paragraph14, styles.indent]}>
          Que la présence de cette caution n’empêche pas l’engagement préalable de poursuites judiciaires à l’encontre du débiteur pour le recouvrement de ladite créance.
        </Text>

        <Text style={styles.articleTitle}>ARTICLE 5 : SANCTIONS</Text>
        <Text style={styles.paragraph14}>
          Afin de garantir toute insolvabilité et non remboursement d’un accompagnement souscrit par le membre, l’Association LE KARA se réserve la faculté de se désintéresser par prélèvement dans le nominal correspondant aux versements mensuels du membre à hauteur des sommes dues. Si le nominal s’avère insuffisant, KARA procède au prélèvement du surplus manquant dans le nominal de sa caution.
        </Text>
        <Text style={styles.paragraph14}>
          Le non-respect des délais de remboursement m’expose aux sanctions disciplinaires et pénales conformément aux dispositions du Règlement intérieur de KARA.
        </Text>
        <Text style={styles.paragraph14}>
          Ce protocole d’accompagnement est établi pour servir et valoir ce que de droit.
        </Text>
        <Text style={styles.paragraph14}>
          Fait à…………………………Le …………/………/…………….
        </Text>

        <Text style={styles.signatureText14}>Signature Secrétaire Exécutif</Text>
        <Text style={styles.signatureText14}>Signature  Membre(précédée de la mention membre lu et approuvé)</Text>
        <Text style={styles.signatureText14}>Signature de la caution (précédée de la mention membre lu et approuvé)</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.title14Center}>ACTE DE CAUTIONNEMENT SOLIDAIRE</Text>

        <Text style={styles.paragraph12}>
          En date du {formatDate(firstPaymentDate)} le présent acte a été conclu entre les parties suivantes nommément désignées :
        </Text>
        <Text style={styles.paragraph12}>
          L’Association LE KARA et M/Mme/Mlle {String(member.lastName).toUpperCase()} {member.firstName}, domicilié à {member.quarter} et Tel : {member.phone1}.
        </Text>
        <Text style={styles.paragraph12}>
          Il a été convenu entre les parties ce qui suit :
        </Text>
        <Text style={styles.paragraph12}>
          En date du {formatDate(firstPaymentDate)},
        </Text>
        <Text style={styles.paragraph12}>
          l’Association LE KARA a mis à la disposition de M / Mme/Mlle {String(member.lastName).toUpperCase()} {member.firstName} Une somme de {formatAmount(contract.amount)} FCFA(Chiffres), {numberToWords(contract.amount)} FCFA (Lettres) dans le cadre d’un accompagnement, à charge pour le membre de la lui restituer en date du {formatDate(endDate)}.
        </Text>
        <Text style={styles.paragraph12}>
          Que pour garantir le remboursement de ladite somme,
        </Text>
        <Text style={styles.paragraph12}>
          Monsieur/ Madame {guarantor.lastName} {guarantor.firstName} Affirme s’être librement et volontairement porté caution solidaire de cette dette à charge pour elle de rembourser à l’Association les sommes indiquées si Monsieur/ Madame {String(member.lastName).toUpperCase()} {member.firstName} N’y satisfait pas elle-même.
        </Text>
        <Text style={styles.paragraph12}>
          La caution s’engage à garantir le prêt pour une hauteur maximale de {formatAmount(guaranteeAmount)} FCFA(Chiffres), {numberToWords(guaranteeAmount)} FCFA (Lettres), somme couvrant l’intégralité de la créance.
        </Text>
        <Text style={styles.paragraph12}>
          Le cautionnement vaut tant que la dette principale n’a pas été remboursée.
        </Text>
        <Text style={styles.paragraph12}>
          La caution affecte principalement en garantie de la dette du débiteur, son nominal correspondant à ses versements mensuels en tant que membre de l’Association. Elle autorise l’Association à y prélever les sommes dues par le débiteur en cas de défaillance de celui-ci.
        </Text>
        <Text style={styles.paragraph12}>
          Le montant de la caution, à concurrence de la créance garantie, demeurera consigné par l’association jusqu’à l’extinction totale de la dette du débiteur principal.
        </Text>
        <Text style={styles.paragraph12}>
          La caution s’engage sur simple demande adressée par lettre recommandée à exécuter son engagement, sans qu’elle use du bénéfice de discussion.
        </Text>
        <Text style={styles.paragraph12}>
          L’arrivée de chaque échéance mensuelle vaut d’office mise en demeure du débiteur.
        </Text>
        <Text style={styles.paragraph12}>
          Pour tout litige pouvant naître de l’exécution dudit contrat, les parties donnent compétence territoriale au Tribunal de Libreville.
        </Text>
        <Text style={styles.paragraph12}>
          Au vue des dispositions réglementaires qui régissent l’Association, les parties attestent avoir pris connaissance de l’étendue de leurs obligations respectives et s’engagent en parfaite connaissance de cause.
        </Text>
        <Text style={styles.paragraph12}>
          Ce document a été dressé pour faire valoir ce que de droit
        </Text>

        <Text style={styles.signatureText14}>Signature Secrétaire Exécutif</Text>
        <Text style={styles.signatureText14}>Signature Membre(précédée de la mention membre lu et approuvé)</Text>
        <Text style={styles.signatureText14}>Signature de la caution (précédée de la mention membre lu et approuvé)</Text>
      </Page>
    </Document>
  )
}

export default AdhesionCreditSpecialeV3
