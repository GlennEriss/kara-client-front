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
        <Text style={styles.title}>Informations Personnelles du Membre</Text>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.cell}>MATRICULE MEMBRE :</Text>
            <Text style={styles.cell}>{contract?.memberId || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cell}>NOM :</Text>
            <Text style={styles.cell}>{contract?.member?.lastName || '—'}</Text>
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
            <Text style={styles.cell}>{contract?.member?.nationality || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cell}>N°CNI / PASS / CS :</Text>
            <Text style={styles.cell}>{contract?.member?.identityDocumentNumber || '—'}</Text>
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
      </Page>

      {/* PAGE 2 - Contrat */}
      <Page size="A4" style={styles.page}>
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
        <Text style={styles.articleText}>❖ L'épargnant : membre de l'association qui souscrit au volet Caisse spéciale.</Text>
        <Text style={styles.articleText}>❖ Le nominal : globalité des versements mensuels de l'épargnant.</Text>

        <Text style={styles.articleTitle}>Contraintes</Text>
        <Text style={styles.articleText}>• Durée : 12 mois maximum.</Text>
        <Text style={styles.articleText}>• Début : à partir du premier versement.</Text>
        <Text style={styles.articleText}>• Terme : fin à la date prévue par le contrat.</Text>
        <Text style={styles.articleText}>• Remboursement : dans les 30 jours suivant la fin du contrat.</Text>
        <Text style={styles.articleText}>• Versements mensuels : minimum 100.000 CFA, sans retrait avant le terme.</Text>
        <Text style={styles.articleText}>
          • Retards : 3 jours sans pénalité, 4e au 12e jour pénalités, après 12 jours = résiliation.
        </Text>
        <Text style={styles.articleText}>• Résiliation : omission d'un mois ou demande de remboursement anticipé.</Text>

        <Text style={{ marginTop: 20 }}>[Signature de l'épargnant précédée de la mention « lu et approuvé »]</Text>
      </Page>

      {/* PAGE 3 - Fiche d'adhésion et articles */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>FICHE D'ADHÉSION</Text>

        <Text>Je soussigné(e) {contract?.member?.firstName || '—'} {contract?.member?.lastName || '—'} membre de l'association KARA, domicilié à {contract?.member?.address?.district || '—'}</Text>
        <Text>Et joignable au {contract?.member?.contacts?.[0] || '—'}</Text>

        <Text style={styles.articleTitle}>Article 1 : Objet du contrat</Text>
        <Text style={styles.articleText}>
          Je reconnais avoir adhéré par ce contrat au volet Caisse spéciale de l'association Kara.
        </Text>

        <Text style={styles.articleTitle}>Article 2 : Durée du contrat</Text>
        <Text style={styles.articleText}>
          Engagement valable pour {contract?.monthsPlanned || 12} mois, conclu en date du {formatDate(contract?.createdAt)} et prend fin le {formatDate(contract?.endDate)}
        </Text>

        <Text style={styles.articleTitle}>Article 3 : Termes contractuels</Text>
        <Text style={styles.articleText}>
          Formule : {getContractTypeLabel(contract?.caisseType)}. Montant convenu : {formatAmount(contract?.monthlyAmount || 0)} FCFA par mois.
        </Text>

        <Text style={styles.articleTitle}>Article 4 : Montant de remboursement</Text>
        <Text style={styles.articleText}>
          L'association LE KARA s'engage à la date de fin du contrat à rembourser le nominal de {formatAmount((contract?.monthlyAmount || 0) * (contract?.monthsPlanned || 12))} FCFA.
        </Text>

        <Text style={styles.articleTitle}>Article 5 : Statut du contrat</Text>
        <Text style={styles.articleText}>
          Statut actuel : {getContractStatusLabel(contract?.status)}. Montant versé à ce jour : {formatAmount(contract?.nominalPaid || 0)} FCFA.
        </Text>

        <Text style={{ marginTop: 20 }}>[Signature de l'épargnant « lu et approuvé »]</Text>
        <Text style={{ marginTop: 10 }}>Signature du Secrétaire Exécutif :</Text>
      </Page>

      {/* PAGE 4 - Récapitulatif des versements */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>RÉCAPITULATIF DES VERSEMENTS MENSUELS</Text>

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
      </Page>
    </Document>
  )
}

export default CaisseSpecialePDF
