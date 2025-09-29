'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// Styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 11,
    padding: 25,
    lineHeight: 1.4,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    textDecoration: 'underline',
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
const RemboursementNormalPDF = () => {
  return (
    <Document>
      {/* PAGE 1 - Infos personnelles */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Informations Personnelles du Membre</Text>

        <View style={styles.section}>
          <View style={styles.row}><Text style={styles.cell}>MATRICULE MEMBRE :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>NOM :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>PRÉNOM :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>LIEU / NAISSANCE :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>DATE / NAISSANCE :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>NATIONALITÉ :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>N°CNI / PASS / CS :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>TÉLÉPHONE 1 :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>TÉLÉPHONE 2 :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>SEXE :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>ÂGE :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>QUARTIER :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>PROFESSION :</Text></View>
        </View>

        <Text style={styles.title}>Informations Concernant la Caisse Spéciale</Text>
        <View style={styles.section}>
          <View style={styles.row}><Text style={styles.cell}>DURÉE / MOIS :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>TYPE.CAI.SPE :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>DÉBUT CAI.SPE :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>MONTANT / MOIS :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>DATE REMISE :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>FIN CAI.SPE :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>ABANDON :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>DATE / ABAN :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>N. VERSEMENT :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>CAUSE :</Text></View>
        </View>

        <Text style={styles.title}>Informations Concernant le Contact Urgent</Text>
        <View style={styles.section}>
          <View style={styles.row}><Text style={styles.cell}>NOM URGENT :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>PRÉNOM URGENT :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>TÉLÉPHONE :</Text></View>
          <View style={styles.row}><Text style={styles.cell}>LIEN :</Text></View>
        </View>
      </Page>

      {/* PAGE 2 - Quittance */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>QUITTANCE DE PAIEMENT</Text>

        <Text style={styles.articleText}>
          L'association LE KARA, ayant son siège social à Awoungou/Owendo, immatriculée au registre du
          Ministère de l'Intérieur, sous le numéro n° 0650/MIS/SG/DGELP/DPPALC/KMOG, atteste avoir
          procédé au remboursement du nominal de l'épargnant :
          ……………………………………………………………………………………………
        </Text>

        <Text style={styles.articleText}>
          Souscrit en date du …………/…………../………… et intervenant suite à :
        </Text>

        <Text style={styles.articleText}>• L'arrivée du terme du contrat</Text>
        <Text style={styles.articleText}>Ce remboursement a été réalisé ………. jours après la notification de la demande.</Text>

        <Text style={styles.articleText}>• Demande unilatérale de résiliation</Text>
        <Text style={styles.articleText}>Ce remboursement a été réalisé ………. jours après la demande.</Text>

        <Text style={styles.articleText}>
          Le nominal remboursé s'élève à ………………………….. FCFA (chiffres),
          ………………………….. FCFA (lettres).
        </Text>

        <Text style={{ marginTop: 15 }}>
          Cette quittance est libératoire de tout engagement de l'association Kara vis-à-vis de l'épargnant.
          Elle est établie pour faire valoir ce que de droit.
        </Text>

        <View style={{ marginTop: 40 }}>
          <Text>Signature du Secrétaire exécutif</Text>
          <Text style={{ marginTop: 40 }}>
            Signature de l'épargnant (précédée de la mention "Lu et approuvé")
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export default RemboursementNormalPDF
