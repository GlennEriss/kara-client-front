'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'
import { getNationalityName } from '@/constantes/nationality'

Font.register({
  family: 'Times New Roman',
  fonts: [
    { src: '/fonts/TimesNewRoman-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/TimesNewRoman-Bold.ttf', fontWeight: 'bold' },
    { src: '/fonts/TimesNewRoman-Italic.ttf', fontStyle: 'italic' },
    { src: '/fonts/TimesNewRoman-BoldItalic.ttf', fontWeight: 'bold', fontStyle: 'italic' },
  ],
})

const colWidths = [0.269, 0.307, 0.152, 0.272]
const sumCols = (start: number, span: number) =>
  colWidths.slice(start, start + span).reduce((acc, val) => acc + val, 0)

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times New Roman',
    fontSize: 12,
    paddingTop: 72,
    paddingRight: 72,
    paddingBottom: 72,
    paddingLeft: 72,
    color: '#000000',
    lineHeight: 1.3,
  },
  logo: {
    width: 200,
    height: 100,
    objectFit: 'contain',
    alignSelf: 'center',
    marginBottom: 16,
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
    fontFamily: 'Times New Roman',
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tableSectionText: {
    fontFamily: 'Times New Roman',
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tableLabelText: {
    fontFamily: 'Times New Roman',
    fontSize: 12,
  },
  tableValueText: {
    fontFamily: 'Times New Roman',
    fontSize: 12,
    textAlign: 'center',
  },
  title: {
     fontSize: 20, // Augmenté de 18 à 20
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f3a4e',
    textDecoration: 'underline',
    marginBottom: 12,
    marginTop: 5,

  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    textDecoration: 'underline',
    marginTop: 12,
    marginBottom: 6,
    color: '#FFFFFF',
    textAlign: 'center',
    backgroundColor: '#224d62',
  },
  paragraph: {
    fontSize: 12,
    textAlign: 'justify',
    marginBottom: 6,
  },
  paragraphIndented: {
    fontSize: 12,
    textAlign: 'justify',
    textIndent: 36,
    marginBottom: 6,
  },
  bullet: {
    fontSize: 12,
    textAlign: 'justify',
    marginLeft: 18,
    marginBottom: 6,
  },
  subParagraph: {
    fontSize: 12,
    textAlign: 'justify',
    marginLeft: 18,
    marginBottom: 6,
  },
  bold: {
    fontWeight: 'bold',
  },
  forfaitTable: {
    width: '63%',
    alignSelf: 'center',
    borderWidth: 0.5,
    borderColor: '#000000',
    marginTop: 8,
    marginBottom: 8,
  },
  forfaitRow: {
    flexDirection: 'row',
  },
  forfaitCell: {
    flex: 1,
    borderRightWidth: 0.5,
    borderRightColor: '#000000',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 12,
    textAlign: 'center',
  },
  forfaitHeaderCell: {
    flex: 1,
    borderRightWidth: 0.5,
    borderRightColor: '#000000',
    borderBottomWidth: 0.5,
    borderBottomColor: '#000000',
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  forfaitRowHighlight: {
    backgroundColor: '#E8F4FC',
  },
  forfaitCellHighlight: {
    backgroundColor: '#E8F4FC',
  },
  signatures: {
    marginTop: 18,
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

const CaisseImprevuePDFV3 = ({ contract }: { contract?: any }) => {
  const logoUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/assets/caisse-imprevue/image1.png`
    : '/assets/caisse-imprevue/image1.png'

  const formatDate = (date: any) => {
    if (!date) return '—'
    try {
      const dateObj = date?.toDate ? date.toDate() : new Date(date)
      return dateObj.toLocaleDateString('fr-FR')
    } catch {
      return '—'
    }
  }

  const calculateAge = (birthDate: any) => {
    if (!birthDate) return '—'
    const dateObj = birthDate?.toDate ? birthDate.toDate() : new Date(birthDate)
    if (Number.isNaN(dateObj.getTime())) return '—'
    const today = new Date()
    let age = today.getFullYear() - dateObj.getFullYear()
    const monthDiff = today.getMonth() - dateObj.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateObj.getDate())) {
      age -= 1
    }
    return String(age)
  }

  const memberAge = contract?.member?.age || calculateAge(contract?.member?.birthDate) || '—'

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <Image src={logoUrl} style={styles.logo} />

        <View style={styles.table}>
          <TableRow
            height={40.85}
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
            height={30.5}
            cells={[
              { content: 'MATRICULE', textStyle: styles.tableLabelText },
              { content: contract?.memberId || '—', textStyle: styles.tableValueText },
              { content: 'MEMBRE', textStyle: styles.tableLabelText },
             { content: '  ', textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={35.4}
            cells={[
              { content: 'NOM', textStyle: styles.tableLabelText },
              { content: contract?.member?.lastName?.toUpperCase() || '—', span: 3, textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={32.8}
            cells={[
              { content: 'PRÉNOM', textStyle: styles.tableLabelText },
              { content: contract?.member?.firstName || '—', span: 3, textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={30.15}
            cells={[
              { content: 'LIEU / NAISSANCE', textStyle: styles.tableLabelText },
              { content: contract?.member?.birthPlace || '—', textStyle: styles.tableValueText },
              { content: 'DATE / NAISSANCE', textStyle: styles.tableLabelText },
              { content: formatDate(contract?.member?.birthDate), textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={34.25}
            cells={[
              { content: 'NATIONALITÉ', textStyle: styles.tableLabelText },
              { content: getNationalityName(contract?.member?.nationality) || '—', textStyle: styles.tableValueText },
              { content: 'N°CNI/PASS/CS', textStyle: styles.tableLabelText },
              { content: contract?.member?.identityDocumentNumber || '—', textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={30.8}
            cells={[
              { content: 'TÉLÉPHONES', textStyle: styles.tableLabelText },
              {
                content:
                  (Array.isArray(contract?.member?.contacts) && contract.member.contacts.length > 0
                    ? contract.member.contacts.filter(Boolean).join(' || ')
                    : '—') as string,
                span: 3,
                textStyle: styles.tableValueText,
              },
            ]}
          />
          <TableRow
            height={28.15}
            cells={[
              { content: 'SEXE', textStyle: styles.tableLabelText },
              { content: contract?.member?.gender || '—', textStyle: styles.tableValueText },
              { content: 'ÂGE', textStyle: styles.tableLabelText },
              { content: memberAge , textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={33.05}
            cells={[
              { content: 'QUARTIER', textStyle: styles.tableLabelText },
              { content: contract?.member?.address?.district || '—', textStyle: styles.tableValueText },
              { content: 'PROFESSION', textStyle: styles.tableLabelText },
              { content: contract?.member?.profession || '—', textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={39.45}
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
            height={24.65}
            cells={[{ content: '', span: 4, textStyle: styles.tableLabelText }]}
          />
          <TableRow
            height={32.15}
            cells={[
              { content: 'NOM', textStyle: styles.tableLabelText },
              { content: contract?.emergencyContact?.lastName || '—', span: 3, textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={35.35}
            cells={[
              { content: 'PRÉNOM', textStyle: styles.tableLabelText },
              { content: contract?.emergencyContact?.firstName || '—', span: 3, textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={31.45}
            cells={[
              { content: 'LIENS', textStyle: styles.tableLabelText },
              { content: contract?.emergencyContact?.relationship || '—', span: 3, textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={34.65}
            cells={[
              { content: 'TÉLÉPHONE', textStyle: styles.tableLabelText },
              { content: contract?.emergencyContact?.phone1 || '—', textStyle: styles.tableValueText },
              { content: '', span: 2, textStyle: styles.tableValueText },
            ]}
          />
          <TableRow
            height={37.85}
            isLastRow
            cells={[
              { content: 'N°CNI/PASS/CS', textStyle: styles.tableLabelText },
              { content: contract?.emergencyContact?.idNumber || '—', span: 3, textStyle: styles.tableValueText },
            ]}
          />
        </View>

        <Text style={styles.title}>VOLET ENTRAIDE</Text>
       <Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraphIndented}>
          Dans le cadre d’une démarche purement sociale, l’association LE KARA met en place le «Volet
          Entraide», un mécanisme inspiré de la solidarité qui fonde l’âme même de l’association. Ce
          dispositif est le pilier sur lequel sont fondées les actions solidaires telles que les appuis,
          les collectes, les dons que l’association réalise.
        </Text>
        <Text style={styles.paragraphIndented}>
          Le Volet Entraide constitue le système obligatoire de cotisations, garantissant la vie
          financière de l’association et la disponibilité des fonds nécessaires aux aides apportées aux
          membres en difficulté.
        </Text>
        <Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraphIndented}>
          A ce titre, le KARA par le canal du Volet Entraide invite tous ses membres à verser
          mensuellement une cotisation de 10 000 FCFA, 20 000 FCFA, 30 000 FCFA, 40 000 FCFA, 50 000 FCFA
          ou plus, selon leurs disponibilités financières.
        </Text>
        <Text style={styles.paragraphIndented}>
          Ces versements réguliers assurent la stabilité de la trésorerie, le financement des activités
          de l’association, la disponibilité des appuis et l’équité entre tous les membres.
        </Text>
        <Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraphIndented}>
          Concernant les appuis, c’est un système où chacun contribue selon ses moyens et reçoit selon
          ses besoins et permettent de bénéficier d’une somme comprise entre 30 000 FCFA à 150 000 FCFA
          ou plus selon le forfait souscrit, mais qui sera par la suite reverser dans la caisse de
          l’association après une durée déterminée.
        </Text>
        <Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraphIndented}>
          Toutefois, pour la bonne tenue de la trésorerie de l’association, les membres bénéficiaires
          sont tenus aux respects des règles suivantes :
        </Text>
        <Text style={styles.paragraph}>
        </Text>

        <Text style={styles.sectionTitle}>I.  Fonctionnement général du Volet Entraide</Text>
        <Text style={styles.paragraph}>
        </Text>

        <Text style={styles.paragraph}>
          <Text style={styles.bold}>1. Début du contrat : </Text>
          Toute adhésion nouvelle ou renouvellement à l’association le KARA emporte systématiquement
          adhésion au Volet Entraide. En effet, le Volet Entraide assure la vie de l’association par le
          biais de cotisations volontaires conformément au règlement intérieur.
        </Text>
        <Text style={styles.bullet}>• Le refus ou l’abandon pour un membre du Volet Entraide entraine le retrait du membre de l’association car il est considéré comme la rupture de l’aspiration à l’idéologie de l’association.</Text>
<Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>2. Durée du contrat : </Text>
          L’adhésion au Volet Entraide dure aussi longtemps que dure l’adhésion à l’association Le
          KARA, soit sur une année.
        </Text>
        <Text style={styles.bullet}>• Le retrait de l’association entraine automatiquement rupture du contrat du Volet Entraide et emporte remboursement des sommes versées.</Text>
<Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>3. Déroulement des versements : </Text>
          Le membre se doit de procéder aux versements des cotisations au plus tard le ________________
          de chaque mois durant toute la durée du présent contrat.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>4. Tolérance de retard : </Text>
          L’épargnant dispose d’un délai de grâce de trois jours après la date prévue pour son
          versement mensuel. Aucun frais ni pénalité ne s’applique dans ce délai.
        </Text>
        <Text style={styles.bullet}>• À compter du quatrième jour jusqu’au septième jour succédant l’expiration du délai de retard, tout versement intervenu dans cet intervalle est passible de pénalités pécuniaires, destinées à préserver l’équilibre et la bonne tenue de la caisse commune.</Text>
        <Text style={styles.bullet}>• A compter du septième jour les mesures disciplinaires ci-après, non cumulatives, sont applicables :</Text>
        <Text style={styles.subParagraph}>
          La non prise en compte de ce versement pour le mois auquel il est normalement dû. Il sera
          considéré comme non acquitté et sera compté pour le mois suivant.
        </Text>
        <Text style={styles.subParagraph}>
          La perte de tous les avantages liés à la régularité dans les versements conformément aux
          dispositions du règlement intérieur.
        </Text>
<Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>5. Le retrait de l’association : </Text>
          À compter du troisième mois suivant l’adhésion à l’association, le membre a la faculté de la
          résilier. Cette résiliation doit être obligatoirement formulée par écrit et déposée auprès du
          Secrétaire Exécutif. À compter de la date de notification, l’association dispose de 30 jours
          pour rembourser les sommes versées au titre du Volet Entraide.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>6. Terme du contrat : </Text>
          Le contrat Volet Entraide prend fin à l’expiration de l’adhésion annuelle à l’association. Il
          emporte l’obligation pour le KARA de restituer au membre l’intégralité des sommes versées par
          le membre au cours de l’année au titre du Volet Entraide.
        </Text>
        <Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>7. Remboursement du nominal : </Text>
          Le remboursement des sommes visées au ci-dessus, intervient dans un délai maximal de 30 jours
          suivant la date du terme du contrat.
        </Text>
<Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraph}>
        </Text>
        <Text style={styles.sectionTitle}>II.  Des accompagnements réguliers  (appuis)</Text>
<Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraph}>
          Dans le respect des principes d’équité et de gestion saine de la caisse commune, l’octroi
          d’un appui suit les règles ci-après :
        </Text>
        <Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>8. Délai avant première demande : </Text>
          Aucune demande d’appui ne peut être réalisée dans un intervalle de trois mois à compter de la
          date d’adhésion à l’association jusqu’à la date du troisième versement mensuel effectif,
          effectué par le membre. Ce délai permet de stabiliser la caisse et de garantir des appuis
          fiables pour tous.
        </Text>
        <Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>9. Conditions d’éligibilité à un appui : </Text>
          Peut solliciter un accompagnement régulier, le membre qui, en plus d’être à jour dans ses
          cotisations mensuelles, s’est acquitté de sa prime mensuelle pour le mois durant lequel il
          sollicite un accompagnement régulier.
        </Text>
        <Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>10. Nombre d’appuis autorisés : </Text>
          Tout membre a droit à un appui par mois dans la limite de six appuis maximum pour toute
          l’année, de manière non consécutive. Ce dispositif constitue le volet prévoyance du Volet
          Entraide.
        </Text>
        <Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>11. Remboursement des appuis : </Text>
          Tout appui accordé doit être remboursé au plus tard avant le versement de la prochaine
          contribution.
        </Text>
        <Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraph}>
          En cas de non remboursement de l’accompagnement par un adhérent dans le délai fixé à l’alinéa
          précédent, KARA se réserve la faculté de se désintéresser par prélèvement dans le nominal
          cumulé de l’adhérent à hauteur des sommes dues. Ce prélèvement est conditionné à une mise en
          demeure adressée à l’adhérent par le Secrétaire exécutif.
        </Text>
        <Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraph}>
        </Text>

        <Text style={styles.sectionTitle}>III. Catégorie des forfaits</Text>
        <Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraph}>Les appuis octroyés sont plafonnés en fonction du forfait souscrit par le membre.</Text>
        <Text style={styles.paragraph}>Ces appuis sont détaillés dans le tableau ci-après :</Text>
<Text style={styles.paragraph}>
        </Text>
        <Text style={styles.paragraph}>
        </Text>
        <View style={styles.forfaitTable} wrap={false}>
          <View style={styles.forfaitRow}>
            <Text style={styles.forfaitHeaderCell}>Forfait</Text>
            <Text style={styles.forfaitHeaderCell}>Nominal</Text>
            <Text style={styles.forfaitHeaderCell}>Appui</Text>
          </View>
          {(() => {
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
            const rows = customRow ? [...fixedRows, customRow] : fixedRows
            const highlightedIndex = isFixed ? codeToIndex[code] : 5
            return rows.map((row, index) => {
              const highlighted = index === highlightedIndex
              const rowStyle = highlighted ? [styles.forfaitRow, styles.forfaitRowHighlight] : styles.forfaitRow
              const cellStyle = highlighted ? [styles.forfaitCell, styles.forfaitCellHighlight] : styles.forfaitCell
              return (
                <View key={index} style={rowStyle}>
                  <Text style={cellStyle}>{row[0]}</Text>
                  <Text style={cellStyle}>{row[1]}</Text>
                  <Text style={cellStyle}>{row[2]}</Text>
                </View>
              )
            })
          })()}
        </View>

        <Text style={[styles.paragraph, styles.bold]}>NB : LE FORFAIT CHOISIT NE PEUT ÊTRE CHANGEABLE</Text>
<Text style={styles.paragraph}>
        </Text>
        <View style={styles.signatures}>
          <Text style={styles.paragraph}>Signature membre précédée de la mention « lu et approuvé »</Text>
          <Text style={[styles.paragraph, { marginTop: 150 }]}>Signature du Secrétaire Exécutif</Text>
        </View>
      </Page>
    </Document>
  )
}

export default CaisseImprevuePDFV3
