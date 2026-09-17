'use client'

import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import React from 'react'

/**
 * Procès-verbal de liquidation et quittance d'allocation de secours.
 *
 * Décharge signée par le bénéficiaire lorsqu'une allocation du Fonds de Secours
 * Mutuel lui est versée (naissance, mariage, hospitalisation, décès). Le
 * versement est définitif et non remboursable : le document l'écrit
 * explicitement, c'est ce qui le distingue d'un accompagnement.
 */

const A4_HEIGHT = 841.89

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    paddingTop: 15,
    paddingBottom: 14,
    paddingHorizontal: 25,
    lineHeight: 1.25,
    color: '#1f2937',
  },
  pageNumber: {
    position: 'absolute',
    top: A4_HEIGHT - 18,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    lineHeight: 1,
    color: '#475569',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    width: '100%',
  },
  logo: { width: 52, height: 52, objectFit: 'cover' },
  titre: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f4f68',
    textDecoration: 'underline',
    marginBottom: 2,
  },
  sousTitre: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f4f68',
  },
  devise: {
    fontSize: 9,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#475569',
    marginBottom: 4,
  },
  preambule: {
    fontSize: 9,
    fontStyle: 'italic',
    textAlign: 'justify',
    color: '#334155',
    lineHeight: 1.25,
    marginBottom: 4,
  },
  section: {
    border: '1px solid #cbd5e1',
    marginBottom: 4,
    borderRadius: 2,
  },
  sectionHeader: {
    backgroundColor: '#1f4f68',
    color: 'white',
    textAlign: 'center',
    padding: 2.5,
    fontSize: 10,
    fontWeight: 'bold',
  },
  sectionBody: { paddingHorizontal: 6, paddingVertical: 3 },
  paragraphe: { fontSize: 9.5, textAlign: 'justify', lineHeight: 1.3, marginBottom: 3 },
  ligneRow: {
    flexDirection: 'row',
    padding: 2.5,
    backgroundColor: '#f8fafc',
    minHeight: 13,
  },
  ligneRowEven: {
    flexDirection: 'row',
    padding: 2.5,
    backgroundColor: 'white',
    minHeight: 13,
  },
  cellule: { flex: 1, fontSize: 9.5, paddingRight: 5 },
  gras: { fontWeight: 'bold' },
  casesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingVertical: 2,
  },
  caseContainer: { flexDirection: 'row', alignItems: 'center', marginRight: 14 },
  caseVide: {
    width: 9,
    height: 9,
    border: '1px solid #1f4f68',
    marginRight: 4,
    backgroundColor: 'white',
  },
  caseCochee: {
    width: 9,
    height: 9,
    border: '1px solid #1f4f68',
    marginRight: 4,
    backgroundColor: '#1f4f68',
  },
  montantLigne: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2 },
  montantValeur: {
    flex: 1,
    borderBottom: '1px dotted #94a3b8',
    fontWeight: 'bold',
    paddingHorizontal: 3,
  },
  mentionManuscrite: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#9f1239',
    marginBottom: 2,
  },
  faitA: { fontSize: 10, marginTop: 2, marginBottom: 1 },
  signatureTable: { width: '100%', border: '1px solid #cbd5e1' },
  signatureRow: { flexDirection: 'row', height: 230 },
  signatureCell: {
    flex: 1,
    border: '1px solid #cbd5e1',
    padding: 5,
    justifyContent: 'space-between',
  },
  signatureTitre: { fontSize: 9.5, fontWeight: 'bold', textAlign: 'center' },
  signatureRole: { fontSize: 8.5, textAlign: 'center', color: '#475569' },
  signatureImage: { width: 200, height: 160, objectFit: 'contain', alignSelf: 'center' },
  signaturePlaceholder: { width: 200, height: 160, alignSelf: 'center' },
  signatureHint: { fontSize: 8, fontStyle: 'italic', color: '#64748b', textAlign: 'center' },
  footer: { marginTop: 3, fontSize: 7.5, lineHeight: 1.2, color: '#475569' },
})

const POINTILLES = '..............................'

const aValeur = (v?: string | null): boolean => !!v && v.trim().length > 0
const ouPointilles = (v?: string | null): string => (aValeur(v) ? (v as string) : POINTILLES)

const Ligne = ({
  label,
  value,
  even,
}: {
  label: string
  value?: string | null
  even?: boolean
}) => (
  <View style={even ? styles.ligneRowEven : styles.ligneRow}>
    <Text style={styles.cellule}>
      <Text style={styles.gras}>{label} </Text>
      {ouPointilles(value)}
    </Text>
  </View>
)

const Case = ({ cochee, label }: { cochee: boolean; label: string }) => (
  <View style={styles.caseContainer}>
    <View style={cochee ? styles.caseCochee : styles.caseVide} />
    <Text style={{ fontSize: 9.5 }}>{label}</Text>
  </View>
)

export const EVENEMENTS_SECOURS = ['Naissance', 'Mariage', 'Hospitalisation', 'Décès'] as const
export type EvenementSecours = (typeof EVENEMENTS_SECOURS)[number]

export const MODES_REGLEMENT_SECOURS = [
  'Espèces',
  'Chèque',
  'Airtel Money / Moov Money',
] as const
export type ModeReglementSecours = (typeof MODES_REGLEMENT_SECOURS)[number]

export interface QuittanceSecoursFillData {
  // 1. Identification du bénéficiaire
  beneficiaireNom: string
  matricule: string
  cotisationsAJour: boolean
  cniReceptionnaire: string
  telephone: string
  // 2. Motif et liquidation
  evenement: EvenementSecours | null
  pieceJustificative: string
  montantChiffres: string
  montantLettres: string
  modeReglement: ModeReglementSecours | null
  // 3. Décharge
  soussigneNom: string
  lieu: string
  date: string
  beneficiaireSignature: string | null
  comiteSignature: string | null
}

export const quittanceSecoursFillDataParDefaut = (): QuittanceSecoursFillData => ({
  beneficiaireNom: '',
  matricule: '',
  cotisationsAJour: true,
  cniReceptionnaire: '',
  telephone: '',
  evenement: null,
  pieceJustificative: '',
  montantChiffres: '',
  montantLettres: '',
  modeReglement: null,
  soussigneNom: '',
  lieu: 'Owendo',
  date: '',
  beneficiaireSignature: null,
  comiteSignature: null,
})

/** « 2026-01-15 » => « 15/01/2026 ». Vide => tirets à remplir à la main. */
const formatDateQuittance = (value: string): string => {
  if (!value) return '____ ______________ ______'
  const [annee, mois, jour] = value.split('-')
  if (!annee || !mois || !jour) return value
  return `${jour}/${mois}/${annee}`
}

const QuittanceSecoursPDF = ({ fillData }: { fillData: QuittanceSecoursFillData }) => {
  // Le matricule s'imprime toujours préfixé, comme sur le document papier
  const matriculeAffiche = aValeur(fillData.matricule)
    ? `KARA-${fillData.matricule.replace(/^KARA-/i, '')}`
    : `KARA-${POINTILLES}`

  const telephoneAffiche = aValeur(fillData.telephone)
    ? `(+241) ${fillData.telephone.replace(/^\(\+241\)\s*/, '').replace(/^\+241\s*/, '')}`
    : `(+241) ${POINTILLES}`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text
          fixed
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
        />

        <View style={styles.header}>
          <Image
            src={window.location.origin + '/Logo-Kara.jpg'}
            style={styles.logo}
            cache={false}
          />
          <View style={{ width: 52 }} />
        </View>

        <Text style={styles.titre}>
          PROCÈS-VERBAL DE LIQUIDATION ET QUITTANCE D&apos;ALLOCATION DE SECOURS
        </Text>
        <Text style={styles.sousTitre}>ASSOCIATION DE SECOURS MUTUEL KARA</Text>
        <Text style={styles.devise}>Intégrité – Solidarité – Dynamisme</Text>

        <Text style={styles.preambule}>
          Ce document atteste de la liquidation effective d&apos;une allocation financière
          forfaitaire au titre du Fonds de Secours Mutuel. Conformément à la réglementation
          gabonaise (Loi 35/62) et aux statuts de KARA, ce versement constitue une prestation
          sociale de prévoyance non imposable et non remboursable.
        </Text>

        {/* 1. Identification du bénéficiaire */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>1. IDENTIFICATION DU BÉNÉFICIAIRE</Text>
          <View>
            <Ligne label="Nom(s) et Prénom(s) du Membre :" value={fillData.beneficiaireNom} />
            <View style={styles.ligneRowEven}>
              <Text style={styles.cellule}>
                <Text style={styles.gras}>Matricule / N° d&apos;Adhérent : </Text>
                {matriculeAffiche}
              </Text>
              <Text style={styles.cellule}>
                <Text style={styles.gras}>Statut des cotisations : </Text>
                {fillData.cotisationsAJour ? '(À jour)' : '(Non à jour)'}
              </Text>
            </View>
            <Ligne
              label="N° CNI/Passeport du Réceptionnaire :"
              value={fillData.cniReceptionnaire}
            />
            <View style={styles.ligneRowEven}>
              <Text style={styles.cellule}>
                <Text style={styles.gras}>Téléphone : </Text>
                {telephoneAffiche}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Motif et liquidation du secours */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>2. MOTIF ET LIQUIDATION DU SECOURS</Text>
          <View style={styles.sectionBody}>
            <Text style={styles.paragraphe}>
              Le Comité Exécutif certifie avoir vérifié les pièces justificatives produites et
              validé l&apos;octroi de l&apos;allocation suivante :
            </Text>

            <View style={styles.casesRow}>
              <Text style={[styles.gras, { fontSize: 9.5, marginRight: 8 }]}>
                Nature de l&apos;Événement Social :
              </Text>
              {EVENEMENTS_SECOURS.map((evenement) => (
                <Case
                  key={evenement}
                  cochee={fillData.evenement === evenement}
                  label={evenement}
                />
              ))}
            </View>

            <Text style={styles.paragraphe}>
              <Text style={styles.gras}>Pièce Justificative Produite : </Text>
              {ouPointilles(fillData.pieceJustificative)}
            </Text>

            <View style={styles.montantLigne}>
              <Text style={[styles.gras, { fontSize: 9.5 }]}>
                Montant Accordé (en chiffres) :{' '}
              </Text>
              <Text style={styles.montantValeur}>{ouPointilles(fillData.montantChiffres)}</Text>
              <Text style={[styles.gras, { fontSize: 9.5 }]}> FCFA</Text>
            </View>
            <View style={styles.montantLigne}>
              <Text style={[styles.gras, { fontSize: 9.5 }]}>
                Montant Accordé (en lettres) :{' '}
              </Text>
              <Text style={styles.montantValeur}>{ouPointilles(fillData.montantLettres)}</Text>
              <Text style={[styles.gras, { fontSize: 9.5 }]}> FCFA</Text>
            </View>

            <View style={styles.casesRow}>
              <Text style={[styles.gras, { fontSize: 9.5, marginRight: 8 }]}>
                Mode de Règlement :
              </Text>
              {MODES_REGLEMENT_SECOURS.map((mode) => (
                <Case key={mode} cochee={fillData.modeReglement === mode} label={mode} />
              ))}
            </View>
          </View>
        </View>

        {/* 3. Déclaration de décharge */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>3. DÉCLARATION DE DÉCHARGE &amp; D&apos;ACQUITTEMENT</Text>
          <View style={styles.sectionBody}>
            <Text style={styles.paragraphe}>
              Je soussigné(e),{' '}
              <Text style={styles.gras}>
                {ouPointilles(fillData.soussigneNom || fillData.beneficiaireNom)}
              </Text>
              , reconnaît avoir reçu de l&apos;Association de Secours Mutuel KARA la somme indiquée
              ci-dessus au titre de l&apos;allocation forfaitaire de secours mutuel.
            </Text>
            <Text style={styles.paragraphe}>
              Je confirme que ce versement est effectué à titre gracieux et définitif dans le cadre
              de la solidarité statutaire de la mutuelle et ne constitue aucunement un prêt ou un
              engagement remboursable.
            </Text>
            <Text style={styles.faitA}>
              Fait à {fillData.lieu?.trim() || 'Owendo'}, le {formatDateQuittance(fillData.date)}
            </Text>
            <Text style={styles.mentionManuscrite}>
              (Inscrire la mention manuscrite « Reçu la somme de …… FCFA pour solde de tout compte
              au titre du secours mutuel »)
            </Text>
          </View>

          <View style={styles.signatureTable}>
            <View style={styles.signatureRow}>
              <View style={styles.signatureCell}>
                <View>
                  <Text style={styles.signatureTitre}>Le Bénéficiaire / Réceptionnaire</Text>
                </View>
                {fillData.beneficiaireSignature ? (
                  <Image
                    src={fillData.beneficiaireSignature}
                    style={styles.signatureImage}
                    cache={false}
                  />
                ) : (
                  <View style={styles.signaturePlaceholder} />
                )}
                <Text style={styles.signatureHint}>(Signature)</Text>
              </View>
              <View style={styles.signatureCell}>
                <View>
                  <Text style={styles.signatureTitre}>Pour le Comité Exécutif (KARA)</Text>
                  <Text style={styles.signatureRole}>
                    Le Financier Général / Le Secrétaire Exécutif
                  </Text>
                </View>
                {fillData.comiteSignature ? (
                  <Image
                    src={fillData.comiteSignature}
                    style={styles.signatureImage}
                    cache={false}
                  />
                ) : (
                  <View style={styles.signaturePlaceholder} />
                )}
                <Text style={styles.signatureHint}>(Signature &amp; Cachet)</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>
            ASSOCIATION DE SECOURS MUTUEL KARA. <Text style={styles.gras}>Intégrité - Solidarité - Dynamisme</Text>
          </Text>
          <Text>Siège : Awoungou, Owendo — R.D N°: 0650 /MIS/SG/DGELP/DPPALC/KMOG-</Text>
        </View>
      </Page>
    </Document>
  )
}

export default QuittanceSecoursPDF
