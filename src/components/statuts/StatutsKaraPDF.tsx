'use client'

import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import React from 'react'

import {
  PROCEDURE_CONFORMITE,
  PROCEDURE_CONFORMITE_ENTETE,
  STATUTS_BLOCS,
  STATUTS_ENTETE,
  STATUTS_NOTE_ORIENTATION,
  STATUTS_SIGNATURE,
  type StatutsBloc,
} from '@/constantes/statuts-kara'
import {
  NOM_SIGNATAIRE_PLACEHOLDER,
  formatDateDocument,
  signataireFillDataParDefaut,
  type SignataireFillData,
} from './documentFill'

/**
 * Statuts révisés de l'Association de Secours Mutuel LE KARA.
 *
 * Deux sorties pour un seul contenu source (`@/constantes/statuts-kara`) :
 *
 * - `avecAnnexes={false}` (défaut) — la version officielle : le seul texte
 *   adopté en Assemblée Générale. C'est elle qu'on dépose auprès de
 *   l'administration et que les membres consultent.
 * - `avecAnnexes` — la version de travail du Comité Exécutif : la même, plus la
 *   note d'orientation juridique en tête et la procédure de mise en conformité
 *   en annexe. Elle porte une mention « version de travail » pour ne jamais
 *   être confondue avec le texte voté.
 *
 * Le document s'étale sur autant de pages que nécessaire, react-pdf gère la
 * coupure.
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
  // Même contrainte que la fiche d'adhésion : avec un `lineHeight` hérité de la
  // Page, react-pdf résout mal `bottom` sur un élément absolu — on cale donc le
  // numéro de page depuis le haut.
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
  header: {
    alignItems: 'center',
    marginBottom: 14,
  },
  logo: {
    width: 62,
    height: 62,
    objectFit: 'cover',
    marginBottom: 6,
  },
  association: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f4f68',
  },
  docTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f4f68',
    textDecoration: 'underline',
    marginTop: 2,
  },
  devise: {
    fontSize: 9.5,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#475569',
    marginTop: 3,
  },
  mentionTravail: {
    backgroundColor: '#fef3c7',
    border: '1px solid #f59e0b',
    color: '#92400e',
    textAlign: 'center',
    fontSize: 9,
    fontWeight: 'bold',
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 8,
  },
  note: {
    borderLeft: '3px solid #1f4f68',
    backgroundColor: '#f1f5f9',
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  noteIntitule: {
    fontWeight: 'bold',
    color: '#1f4f68',
  },
  noteTexte: {
    fontSize: 9.5,
    fontStyle: 'italic',
    textAlign: 'justify',
    color: '#334155',
  },
  annexeTitre: {
    backgroundColor: '#1f4f68',
    color: 'white',
    textAlign: 'center',
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  annexeIntro: {
    textAlign: 'justify',
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderLeft: '1px solid #cbd5e1',
    borderRight: '1px solid #cbd5e1',
    borderBottom: '1px solid #cbd5e1',
  },
  tableHeadRow: {
    flexDirection: 'row',
    backgroundColor: '#1f4f68',
    border: '1px solid #1f4f68',
  },
  tableHeadCell: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 9.5,
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRight: '1px solid #ffffff',
  },
  tableCell: {
    fontSize: 9.5,
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRight: '1px solid #cbd5e1',
  },
  colEtape: { width: 44, textAlign: 'center', fontWeight: 'bold' },
  colAction: { width: 130 },
  colModalites: { flex: 1, borderRight: 'none' },
  tablePuce: {
    flexDirection: 'row',
    marginTop: 2,
    paddingLeft: 4,
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
  chapitre: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#1f4f68',
    borderBottom: '1px solid #cbd5e1',
    paddingBottom: 2,
    marginTop: 8,
    marginBottom: 5,
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
  paragraphe: {
    textAlign: 'justify',
    marginBottom: 3,
  },
  articleTitre: {
    fontWeight: 'bold',
    color: '#1f4f68',
  },
  puceRow: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingLeft: 8,
  },
  puceDot: {
    width: 10,
  },
  puceText: {
    flex: 1,
    textAlign: 'justify',
  },
  signatureBloc: {
    marginTop: 10,
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
})

const Puce = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.puceRow}>
    <Text style={styles.puceDot}>•</Text>
    <Text style={styles.puceText}>{children}</Text>
  </View>
)

const Bloc = ({ bloc }: { bloc: StatutsBloc }) => {
  if (bloc.type === 'titre') {
    // `minPresenceAhead` évite qu'un titre de partie reste seul en bas de page
    return (
      <Text style={styles.titre} minPresenceAhead={40}>
        {bloc.texte}
      </Text>
    )
  }

  if (bloc.type === 'chapitre') {
    return (
      <Text style={styles.chapitre} minPresenceAhead={40}>
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

  const [premier, ...suivants] = bloc.paragraphes

  return (
    <View style={styles.article} wrap={false}>
      <Text style={styles.paragraphe}>
        <Text style={styles.articleTitre}>{bloc.titre} : </Text>
        {premier}
      </Text>
      {suivants.map((paragraphe, index) => (
        <Text key={index} style={styles.paragraphe}>
          {paragraphe}
        </Text>
      ))}
      {bloc.puces?.map((puce, index) => (
        <Puce key={index}>{puce}</Puce>
      ))}
    </View>
  )
}

export const statutsFillDataParDefaut = (): SignataireFillData =>
  signataireFillDataParDefaut(STATUTS_SIGNATURE.lieu)

export interface StatutsKaraPDFProps {
  /** Ajoute la note d'orientation et la procédure de mise en conformité. */
  avecAnnexes?: boolean
  /** Lieu, date et signataires. Omis => document vierge à signer à la main. */
  fillData?: SignataireFillData
}

const StatutsKaraPDF = ({
  avecAnnexes = false,
  fillData = statutsFillDataParDefaut(),
}: StatutsKaraPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text
        fixed
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
      />
      <Text fixed style={styles.footer}>
        {STATUTS_ENTETE.association} — Siège : Awoungou, Owendo — R.D N°: 0650 /MIS/SG/DGELP/DPPALC/KMOG-
      </Text>

      <View style={styles.header}>
        <Image src={window.location.origin + '/Logo-Kara.jpg'} style={styles.logo} cache={false} />
        <Text style={styles.association}>{STATUTS_ENTETE.association}</Text>
        <Text style={styles.docTitle}>{STATUTS_ENTETE.titre}</Text>
        <Text style={styles.devise}>{STATUTS_ENTETE.devise}</Text>
      </View>

      {avecAnnexes && (
        <>
          <Text style={styles.mentionTravail}>
            VERSION DE TRAVAIL — USAGE INTERNE DU COMITÉ EXÉCUTIF. Seuls les articles ci-après
            ont été adoptés en Assemblée Générale.
          </Text>
          <View style={styles.note}>
            <Text style={styles.noteTexte}>
              <Text style={styles.noteIntitule}>{STATUTS_NOTE_ORIENTATION.intitule} : </Text>
              {STATUTS_NOTE_ORIENTATION.texte}
            </Text>
          </View>
        </>
      )}

      {STATUTS_BLOCS.map((bloc, index) => (
        <Bloc key={index} bloc={bloc} />
      ))}

      <View style={styles.signatureBloc} wrap={false}>
        <Text style={styles.signatureMention}>
          Fait à {fillData.lieu?.trim() || STATUTS_SIGNATURE.lieu}, le{' '}
          {formatDateDocument(fillData.date)}
        </Text>
        <View style={styles.signatureRow}>
          <View style={styles.signatureCell}>
            <Text style={styles.signaturePour}>{STATUTS_SIGNATURE.pour}</Text>
            <View style={styles.signatureLine}>
              {fillData.secretaireSignature ? (
                <Image src={fillData.secretaireSignature} style={styles.signatureImage} cache={false} />
              ) : null}
            </View>
            <Text style={styles.signatureName}>{STATUTS_SIGNATURE.gauche}</Text>
            <Text>{fillData.secretaireNom?.trim() || NOM_SIGNATAIRE_PLACEHOLDER}</Text>
          </View>
          <View style={styles.signatureCell}>
            <Text style={styles.signaturePour}>{STATUTS_SIGNATURE.droiteIntitule}</Text>
            <View style={styles.signatureLine}>
              {fillData.conseillerSignature ? (
                <Image src={fillData.conseillerSignature} style={styles.signatureImage} cache={false} />
              ) : null}
            </View>
            <Text style={styles.signatureName}>{STATUTS_SIGNATURE.droite}</Text>
            <Text>{fillData.conseillerNom?.trim() || NOM_SIGNATAIRE_PLACEHOLDER}</Text>
          </View>
        </View>
      </View>

      {/* Annexe : démarrée sur sa propre page pour ne pas couper les signatures */}
      {avecAnnexes && (
      <View break>
        <Text style={styles.annexeTitre}>{PROCEDURE_CONFORMITE_ENTETE.titre}</Text>
        <Text style={styles.annexeIntro}>{PROCEDURE_CONFORMITE_ENTETE.introduction}</Text>

        <View style={styles.tableHeadRow}>
          <Text style={[styles.tableHeadCell, styles.colEtape]}>
            {PROCEDURE_CONFORMITE_ENTETE.colonnes[0]}
          </Text>
          <Text style={[styles.tableHeadCell, styles.colAction]}>
            {PROCEDURE_CONFORMITE_ENTETE.colonnes[1]}
          </Text>
          <Text style={[styles.tableHeadCell, styles.colModalites]}>
            {PROCEDURE_CONFORMITE_ENTETE.colonnes[2]}
          </Text>
        </View>

        {PROCEDURE_CONFORMITE.map((etape) => (
          <View key={etape.numero} style={styles.tableRow} wrap={false}>
            <Text style={[styles.tableCell, styles.colEtape]}>{etape.numero}</Text>
            <Text style={[styles.tableCell, styles.colAction]}>{etape.action}</Text>
            <View style={[styles.tableCell, styles.colModalites]}>
              <Text style={{ textAlign: 'justify' }}>{etape.modalites}</Text>
              {etape.pieces?.map((piece) => (
                <View key={piece} style={styles.tablePuce}>
                  <Text style={styles.puceDot}>-</Text>
                  <Text style={styles.puceText}>{piece}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
      )}
    </Page>
  </Document>
)

export default StatutsKaraPDF
