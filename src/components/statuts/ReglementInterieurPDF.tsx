'use client'

import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import React from 'react'

import {
  GRILLE_CONTRIBUTIONS,
  GRILLE_CONTRIBUTIONS_COLONNES,
  GRILLE_PRESTATIONS,
  GRILLE_PRESTATIONS_COLONNES,
  REGLEMENT_BLOCS,
  REGLEMENT_ENTETE,
  REGLEMENT_SIGNATURE,
  type ReglementBloc,
} from '@/constantes/reglement-interieur'
import {
  NOM_SIGNATAIRE_PLACEHOLDER,
  formatDateDocument,
  signataireFillDataParDefaut,
  type SignataireFillData,
} from './documentFill'

/**
 * Règlement Intérieur de la Mutuelle d'Entraide et de Secours Mutuel LE KARA.
 *
 * Même charte que les Statuts : le composant ne fait que mettre en page
 * `@/constantes/reglement-interieur`. Le document s'étale sur autant de pages
 * que nécessaire, react-pdf gère la coupure.
 */

// Hauteur d'une page A4 en points, pour caler le numéro de page
const A4_HEIGHT = 841.89

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 10.5,
    paddingTop: 28,
    paddingBottom: 34,
    paddingHorizontal: 42,
    lineHeight: 1.35,
    color: '#1f2937',
  },
  // Comme pour les Statuts : avec un `lineHeight` hérité de la Page, react-pdf
  // résout mal `bottom` sur un élément absolu, on cale depuis le haut.
  pageNumber: {
    position: 'absolute',
    top: A4_HEIGHT - 22,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8.5,
    lineHeight: 1,
    color: '#475569',
  },
  footer: {
    position: 'absolute',
    top: A4_HEIGHT - 34,
    left: 42,
    right: 42,
    fontSize: 7.5,
    lineHeight: 1,
    color: '#475569',
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  logo: {
    width: 62,
    height: 62,
    objectFit: 'cover',
    marginBottom: 6,
  },
  association: {
    fontSize: 12.5,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f4f68',
  },
  devise: {
    fontSize: 9.5,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#475569',
    marginTop: 2,
  },
  siege: {
    fontSize: 9,
    textAlign: 'center',
    color: '#475569',
    marginTop: 2,
  },
  docTitle: {
    fontSize: 13.5,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f4f68',
    textDecoration: 'underline',
    marginTop: 8,
  },
  titre: {
    backgroundColor: '#1f4f68',
    color: 'white',
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
  },
  preambuleTitre: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f4f68',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  article: {
    marginBottom: 6,
  },
  articleTitre: {
    fontWeight: 'bold',
    color: '#1f4f68',
    marginBottom: 2,
  },
  paragraphe: {
    textAlign: 'justify',
    marginBottom: 3,
  },
  pointRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  pointNum: {
    width: 16,
    fontWeight: 'bold',
  },
  pointBody: {
    flex: 1,
  },
  pointTexte: {
    textAlign: 'justify',
  },
  puceRow: {
    flexDirection: 'row',
    marginTop: 1,
    paddingLeft: 8,
  },
  puceDot: {
    width: 9,
  },
  puceText: {
    flex: 1,
    textAlign: 'justify',
  },
  note: {
    fontStyle: 'italic',
    color: '#334155',
    marginTop: 3,
  },
  tableHeadRow: {
    flexDirection: 'row',
    backgroundColor: '#1f4f68',
    border: '1px solid #1f4f68',
    marginTop: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderLeft: '1px solid #cbd5e1',
    borderRight: '1px solid #cbd5e1',
    borderBottom: '1px solid #cbd5e1',
  },
  tableHeadCell: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 9,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRight: '1px solid #ffffff',
    textAlign: 'center',
  },
  tableCell: {
    fontSize: 9,
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRight: '1px solid #cbd5e1',
  },
  cellCentree: { textAlign: 'center' },
  cellDerniere: { borderRight: 'none' },
  signatureBloc: {
    marginTop: 12,
  },
  signatureMention: {
    marginBottom: 8,
  },
  signaturePour: {
    fontWeight: 'bold',
    marginBottom: 6,
  },
  signatureRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  signatureCell: {
    flex: 1,
    paddingRight: 16,
  },
  signatureLine: {
    borderBottom: '1px solid #64748b',
    height: 44,
    marginBottom: 4,
    justifyContent: 'flex-end',
  },
  signatureImage: {
    width: 150,
    height: 40,
    objectFit: 'contain',
  },
  signatureName: {
    fontWeight: 'bold',
  },
  signatureHint: {
    fontSize: 8.5,
    fontStyle: 'italic',
    color: '#64748b',
  },
})

export const reglementFillDataParDefaut = (): SignataireFillData =>
  signataireFillDataParDefaut(REGLEMENT_SIGNATURE.lieu)

const TableauContributions = () => (
  <View>
    <View style={styles.tableHeadRow}>
      {GRILLE_CONTRIBUTIONS_COLONNES.map((colonne, index) => (
        <Text
          key={colonne}
          style={[
            styles.tableHeadCell,
            index === 0 ? { width: 86 } : { flex: 1 },
            index === GRILLE_CONTRIBUTIONS_COLONNES.length - 1 ? styles.cellDerniere : {},
          ]}
        >
          {colonne}
        </Text>
      ))}
    </View>
    {GRILLE_CONTRIBUTIONS.map((ligne) => (
      <View key={ligne.niveau} style={styles.tableRow} wrap={false}>
        <Text style={[styles.tableCell, { width: 86 }, styles.cellCentree]}>{ligne.niveau}</Text>
        <Text style={[styles.tableCell, { flex: 1 }, styles.cellCentree]}>{ligne.total}</Text>
        <Text style={[styles.tableCell, { flex: 1 }, styles.cellCentree]}>
          {ligne.fonctionnement}
        </Text>
        <Text style={[styles.tableCell, { flex: 1 }, styles.cellCentree, styles.cellDerniere]}>
          {ligne.secours}
        </Text>
      </View>
    ))}
  </View>
)

const TableauPrestations = () => (
  <View>
    <View style={styles.tableHeadRow}>
      <Text style={[styles.tableHeadCell, { width: 128 }]}>{GRILLE_PRESTATIONS_COLONNES[0]}</Text>
      <Text style={[styles.tableHeadCell, { flex: 1 }]}>{GRILLE_PRESTATIONS_COLONNES[1]}</Text>
      <Text style={[styles.tableHeadCell, { width: 92 }, styles.cellDerniere]}>
        {GRILLE_PRESTATIONS_COLONNES[2]}
      </Text>
    </View>
    {GRILLE_PRESTATIONS.map((ligne) => (
      <View key={ligne.evenement} style={styles.tableRow} wrap={false}>
        <Text style={[styles.tableCell, { width: 128 }]}>{ligne.evenement}</Text>
        <Text style={[styles.tableCell, { flex: 1 }]}>{ligne.assistance}</Text>
        <Text
          style={[styles.tableCell, { width: 92 }, styles.cellCentree, styles.cellDerniere, { fontWeight: 'bold' }]}
        >
          {ligne.allocation}
        </Text>
      </View>
    ))}
  </View>
)

const Bloc = ({ bloc }: { bloc: ReglementBloc }) => {
  if (bloc.type === 'titre') {
    // `minPresenceAhead` évite qu'un titre de partie reste seul en bas de page
    return (
      <Text style={styles.titre} minPresenceAhead={40}>
        {bloc.texte}
      </Text>
    )
  }

  if (bloc.type === 'preambule') {
    return (
      <View style={styles.article}>
        <Text style={styles.preambuleTitre}>{bloc.titre}</Text>
        {bloc.paragraphes.map((paragraphe, index) => (
          <Text key={index} style={styles.paragraphe}>
            {paragraphe}
          </Text>
        ))}
      </View>
    )
  }

  return (
    <View style={styles.article} minPresenceAhead={30}>
      <Text style={styles.articleTitre}>{bloc.titre}</Text>
      {bloc.chapeau && <Text style={styles.paragraphe}>{bloc.chapeau}</Text>}

      {bloc.points?.map((point, index) => (
        <View key={index} style={styles.pointRow} wrap={false}>
          <Text style={styles.pointNum}>{index + 1}.</Text>
          <View style={styles.pointBody}>
            <Text style={styles.pointTexte}>{point.texte}</Text>
            {point.puces?.map((puce) => (
              <View key={puce} style={styles.puceRow}>
                <Text style={styles.puceDot}>-</Text>
                <Text style={styles.puceText}>{puce}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {bloc.tableau === 'contributions' && <TableauContributions />}
      {bloc.tableau === 'prestations' && <TableauPrestations />}
      {bloc.note && <Text style={styles.note}>{bloc.note}</Text>}
    </View>
  )
}

export interface ReglementInterieurPDFProps {
  /** Lieu, date et signataires. Omis => document vierge à signer à la main. */
  fillData?: SignataireFillData
}

const ReglementInterieurPDF = ({
  fillData = reglementFillDataParDefaut(),
}: ReglementInterieurPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text
        fixed
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
      />
      <Text fixed style={styles.footer}>
        {REGLEMENT_ENTETE.association} — Règlement Intérieur
      </Text>

      <View style={styles.header}>
        <Image src={window.location.origin + '/Logo-Kara.jpg'} style={styles.logo} cache={false} />
        <Text style={styles.association}>{REGLEMENT_ENTETE.association}</Text>
        <Text style={styles.devise}>{REGLEMENT_ENTETE.devise}</Text>
        <Text style={styles.siege}>{REGLEMENT_ENTETE.siege}</Text>
        <Text style={styles.docTitle}>{REGLEMENT_ENTETE.titre}</Text>
      </View>

      {REGLEMENT_BLOCS.map((bloc, index) => (
        <Bloc key={index} bloc={bloc} />
      ))}

      <View style={styles.signatureBloc} wrap={false}>
        <Text style={styles.signatureMention}>
          Fait à {fillData.lieu?.trim() || REGLEMENT_SIGNATURE.lieu}, le{' '}
          {formatDateDocument(fillData.date)}
        </Text>
        <View style={styles.signatureRow}>
          <View style={styles.signatureCell}>
            <Text style={styles.signaturePour}>{REGLEMENT_SIGNATURE.pour}</Text>
            <View style={styles.signatureLine}>
              {fillData.secretaireSignature ? (
                <Image
                  src={fillData.secretaireSignature}
                  style={styles.signatureImage}
                  cache={false}
                />
              ) : null}
            </View>
            <Text style={styles.signatureName}>{REGLEMENT_SIGNATURE.gauche}</Text>
            <Text>{fillData.secretaireNom?.trim() || NOM_SIGNATAIRE_PLACEHOLDER}</Text>
            <Text style={styles.signatureHint}>{REGLEMENT_SIGNATURE.mentionSignature}</Text>
          </View>
          <View style={styles.signatureCell}>
            <Text style={styles.signaturePour}>{REGLEMENT_SIGNATURE.droiteIntitule}</Text>
            <View style={styles.signatureLine}>
              {fillData.conseillerSignature ? (
                <Image
                  src={fillData.conseillerSignature}
                  style={styles.signatureImage}
                  cache={false}
                />
              ) : null}
            </View>
            <Text style={styles.signatureName}>{REGLEMENT_SIGNATURE.droite}</Text>
            <Text>{fillData.conseillerNom?.trim() || NOM_SIGNATAIRE_PLACEHOLDER}</Text>
            <Text style={styles.signatureHint}>{REGLEMENT_SIGNATURE.mentionSignature}</Text>
          </View>
        </View>
      </View>
    </Page>
  </Document>
)

export default ReglementInterieurPDF
