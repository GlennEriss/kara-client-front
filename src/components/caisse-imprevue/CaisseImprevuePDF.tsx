'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { getNationalityName } from '@/constantes/nationality'
import { ContractCI } from '@/types/types'

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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
  },
  logo: {
    width: 500,
    height: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
    border: '1px solid #265169',
    backgroundColor: '#265169',
    color: 'white',
  },
  articleText: {
    fontSize: 12,
    marginBottom: 6,
    textAlign: 'justify',
  },
  bulletList: {
    marginBottom: 6,
    paddingLeft: 0,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bulletSymbol: {
    width: 15,
    marginRight: 5,
  },
  bulletText: {
    flex: 1,
    textAlign: 'justify',
  },
  definitionList: {
    marginBottom: 6,
  },
  definitionItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  definitionSymbol: {
    width: 15,
    marginRight: 5,
  },
  definitionText: {
    flex: 1,
    textAlign: 'justify',
  },
  subBulletList: {
    marginLeft: 20,
    marginTop: 4,
  },
  subBulletItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  subBulletSymbol: {
    width: 15,
    marginRight: 5,
  },
  subBulletText: {
    flex: 1,
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
  tableHeader: {
    flex: 1,
    borderRight: '1px solid black',
    borderBottom: '1px solid black',
    padding: 5,
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#f0f0f0',
  },
  forfaitTable: {
    width: '70%',
    marginHorizontal: 'auto',
    border: '1px solid black',
    marginTop: 10,
    marginBottom: 10,
  },
  forfaitTableRow: {
    flexDirection: 'row',
  },
  forfaitTableCell: {
    flex: 1,
    borderRight: '1px solid black',
    borderBottom: '1px solid black',
    padding: 5,
    fontSize: 10,
    textAlign: 'center',
  },
  forfaitTableHeader: {
    flex: 1,
    borderRight: '1px solid black',
    borderBottom: '1px solid black',
    padding: 5,
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#234D65',
    color: 'white',
    textAlign: 'center',
  },
})

// Interface pour les props - permet contract avec member optionnel pour flexibilité
interface CaisseImprevuePDFProps {
  contract?: ContractCI & { member?: any } // Permet member optionnel si populé depuis Firestore
  payments?: any[] // Optionnel: liste des paiements pour le récapitulatif
}

// PDF pour Caisse Imprévue
const CaisseImprevuePDF = ({ contract, payments = [] }: CaisseImprevuePDFProps) => {
  // Helper pour accéder aux données du membre (soit depuis member soit depuis contract directement)
  const getMemberData = (field: string) => {
    if (!contract) return '—'
    // Si member existe (populé depuis Firestore), utiliser ça en priorité
    if (contract.member) {
      return contract.member[field] || '—'
    }
    // Sinon utiliser les propriétés directes du contract
    const memberField = `member${field.charAt(0).toUpperCase()}${field.slice(1)}`
    return (contract as any)[memberField] || '—'
  }

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


  return (
    <Document>
      {/* PAGE 1 - Informations personnelles */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageContainer}>
          {/* En-tête avec logo */}
          <View style={styles.header}>
            <View style={styles.logo}>
              <Image
                src={window.location.origin + '/Logo-Kara.jpg'}
                style={{ width: 200, height: 200, objectFit: 'cover' }}
                cache={false}
              />
            </View>
            <View style={{ flex: 1 }} />
          </View>

          <Text style={styles.title}>Informations Personnelles du Membre</Text>

          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.cell}>MATRICULE :</Text>
              <Text style={styles.cell}>{contract?.memberId || '—'}</Text>
              <Text style={styles.cell}>MEMBRE :</Text>
              <Text style={styles.cell}>{(contract?.member?.membershipType || getMemberData('membershipType'))?.toUpperCase() || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>NOM :</Text>
              <Text style={styles.cell}>{(contract?.member?.lastName || contract?.memberLastName || '—').toUpperCase()}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>PRÉNOM :</Text>
              <Text style={styles.cell}>{contract?.member?.firstName || contract?.memberFirstName || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>LIEU / NAISSANCE :</Text>
              <Text style={styles.cell}>{contract?.member?.birthPlace || getMemberData('birthPlace')}</Text>
              <Text style={styles.cell}>DATE / NAISSANCE :</Text>
              <Text style={styles.cell}>{formatDate(contract?.member?.birthDate || contract?.memberBirthDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>NATIONALITÉ :</Text>
              <Text style={styles.cell}>{getNationalityName(contract?.member?.nationality || contract?.memberNationality)}</Text>
              <Text style={styles.cell}>N°CNI/PASS/CS :</Text>
              <Text style={styles.cell}>{contract?.member?.identityDocumentNumber || getMemberData('identityDocumentNumber')}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>TÉLÉPHONE 1 :</Text>
              <Text style={styles.cell}>{contract?.member?.contacts?.[0] || contract?.memberContacts?.[0] || '—'}</Text>
              <Text style={styles.cell}>TÉLÉPHONE 2 :</Text>
              <Text style={styles.cell}>{contract?.member?.contacts?.[1] || contract?.memberContacts?.[1] || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>SEXE :</Text>
              <Text style={styles.cell}>{contract?.member?.gender || contract?.memberGender || '—'}</Text>
              <Text style={styles.cell}>ÂGE :</Text>
              <Text style={styles.cell}>{contract?.member?.age || getMemberData('age') || '—'} ANS</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>QUARTIER :</Text>
              <Text style={styles.cell}>{contract?.member?.address?.district || contract?.memberAddress || '—'}</Text>
              <Text style={styles.cell}>PROFESSION :</Text>
              <Text style={styles.cell}>{contract?.member?.profession || contract?.memberProfession || '—'}</Text>
            </View>
          </View>

          <Text style={styles.title}>Informations Concernant Le Contact Urgent</Text>
          <View style={styles.section}>
            <View style={styles.row}>
              <Text style={styles.cell}>NOM :</Text>
              <Text style={styles.cell}>{contract?.emergencyContact?.lastName || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>PRÉNOM :</Text>
              <Text style={styles.cell}>{contract?.emergencyContact?.firstName || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>LIENS :</Text>
              <Text style={styles.cell}>{contract?.emergencyContact?.relationship || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>TÉLÉPHONE :</Text>
              <Text style={styles.cell}>{contract?.emergencyContact?.phone1 || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.cell}>N°CNI/PASS/CS :</Text>
              <Text style={styles.cell}>{contract?.emergencyContact?.idNumber || '—'}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* PAGE 2 - VOLET ENTRAIDE */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageContainer}>
          <Text style={styles.title}>VOLET ENTRAIDE</Text>

          <Text style={styles.articleText}>
            Dans le cadre d'une démarche purement sociale, l'association LE KARA lance le volet « Entraide », 
            qui est un contrat sous lequel l'association garantit des prestations destinées à octroyer des fonds 
            monétaires à l'adhérent au cours de l'année.
          </Text>

          <Text style={styles.articleText}>
            Au titre de la présente garantie, l'Association KARA s'engage en contrepartie d'une prime mensuelle 
            (10000 FCFA, 20 000 FCFA, 30000 FCFA, 40 000 FCFA et 50000 FCFA), à octroyer à l'adhérent un montant 
            compris entre 30 000 et 150 000 FCFA à taux nul (0%) remboursable dans une durée définie. Ce prêt est 
            dit : accompagnement régulier.
          </Text>

          <Text style={[styles.articleText, { marginTop: 10, marginBottom: 10, fontWeight: 'bold' }]}>
            Les clauses du contrat :
          </Text>

          <View style={styles.definitionList}>
            <View style={styles.definitionItem}>
              <Text style={styles.definitionSymbol}>❖</Text>
              <Text style={styles.definitionText}>
                <Text style={styles.bold}>L'adhérent :</Text> Est un membre de la mutuelle qui souscrit au Volet Entraide.
              </Text>
            </View>

            <View style={styles.definitionItem}>
              <Text style={styles.definitionSymbol}>❖</Text>
              <Text style={styles.definitionText}>
                <Text style={styles.bold}>Le nominal :</Text> Correspond au versement mensuel de l'adhérent sous 12 mois.
              </Text>
            </View>

            <View style={styles.definitionItem}>
              <Text style={styles.definitionSymbol}>❖</Text>
              <Text style={styles.definitionText}>
                <Text style={styles.bold}>L'accompagnement régulier :</Text> c'est un appui, une aide proportionnel au 
                niveau de contribution du membre, dont le montant est compris entre 30 000 et 150 000 FCFA et qui a pour 
                objet la résolution des menues dépenses et urgentes.
              </Text>
            </View>
          </View>
        </View>
      </Page>

      {/* PAGE 3 - LES CONTRAINTES (Primes mensuelles) */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageContainer}>
          <Text style={styles.title}>LES CONTRAINTES</Text>

          <Text style={[styles.bold, { fontSize: 13, marginBottom: 10, marginTop: 10 }]}>
            DES PRIMES MENSUELLES
          </Text>

          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>❖</Text>
              <Text style={styles.bulletText}>
                Toute adhésion vaut pour une année soit 12 mois à compter du mois de la signature du contrat d'adhésion ;
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>❖</Text>
              <Text style={styles.bulletText}>
                Le contrat d'adhésion ne peut pas être résilié avant le troisième mois suivant l'adhésion ;
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>❖</Text>
              <Text style={styles.bulletText}>
                Il est accordé à tout membre, à compter de la date d'échéance contractuellement prévue pour chaque 
                versement mensuel, un délai de retard de trois (3) jours pour procéder à son versement. Le versement 
                intervenu dans ledit délai ne donne lieu à aucune pénalité.
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>❖</Text>
              <Text style={styles.bulletText}>
                À compter du quatrième jour jusqu'à septième jour succédant l'expiration du délai de retard, tout 
                versement intervenu dans cet intervalle est passible de pénalités pécuniaires.
              </Text>
            </View>
          </View>

          <Text style={styles.articleText}>
            Tout versement intervenu après le septième jour sus-mentionné donne lieu à deux options:
          </Text>

          <View style={styles.subBulletList}>
            <View style={styles.subBulletItem}>
              <Text style={styles.subBulletSymbol}>1)</Text>
              <Text style={styles.subBulletText}>
                la résiliation du contrat à l'initiative du secrétaire exécutif pour manquement aux obligations 
                contractuelles du membre;
              </Text>
            </View>

            <View style={styles.subBulletItem}>
              <Text style={styles.subBulletSymbol}>2)</Text>
              <Text style={styles.subBulletText}>
                la non prise en compte de ce versement pour le mois auquel il est normalement dû. Le versement de ce 
                mois sera considéré comme non acquitté et le versement effectué sera compté pour le mois suivant. De 
                plus, le membre perdra tous les avantages liés à la régularité dans les versements conformément aux 
                dispositions du règlement intérieur.
              </Text>
            </View>
          </View>
        </View>
      </Page>

      {/* PAGE 4 - LES CONTRAINTES (Suite - Résiliation et Accompagnements) */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageContainer}>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>❖</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bold}>Après le troisième mois, l'adhérent a la faculté de résilier son contrat de 
                plein droit. Cette résiliation doit être obligatoirement écrite ; la date de résiliation est celle du 
                jour de la notification de la demande de résiliation auprès du Secrétaire Exécutif ;</Text>
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>❖</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bold}>À compter de cette date l'association dispose d'un délai de 30 jours pour 
                procéder au remboursement des sommes versées;</Text>
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>❖</Text>
              <Text style={styles.bulletText}>
                KARA s'engage à <Text style={styles.bold}>restituer à l'adhérent le nominal au treizième mois</Text> correspondant 
                <Text style={styles.bold}> aux sommes versées</Text> par l'adhérent <Text style={styles.bold}>durant les 12 mois.</Text>
              </Text>
            </View>
          </View>

          <Text style={[styles.bold, { fontSize: 13, marginBottom: 10, marginTop: 15 }]}>
            Des accompagnements réguliers
          </Text>

          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>❖</Text>
              <Text style={styles.bulletText}>
                Aucune demande d'appui ne peut être réalisée dans un intervalle de <Text style={styles.bold}>trois mois (3)</Text> à 
                compter de <Text style={styles.bold}>la date d'inscription à l'association</Text> jusqu'à <Text style={styles.bold}>la 
                date du troisième versement mensuel effectif</Text>, effectué par l'adhérent ;
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>❖</Text>
              <Text style={styles.bulletText}>
                Pour bénéficier d'un accompagnement régulier, l'adhérent doit avoir versé au moins trois mois de cotisations ;
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>❖</Text>
              <Text style={styles.bulletText}>
                Ne peut obtenir un accompagnement régulier que l'adhérent dont les cotisations sont à jour ;
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>❖</Text>
              <Text style={styles.bulletText}>
                Est éligible l'adhérent qui s'est acquitté de sa prime mensuelle pour le mois durant lequel il sollicite 
                un accompagnement régulier ;
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>❖</Text>
              <Text style={styles.bulletText}>
                L'adhérent a droit à <Text style={styles.bold}>un accompagnement régulier par mois</Text> (six appuis maximum 
                pour toute l'année, de manière non consécutive), c'est le <Text style={styles.bold}>volet prévoyance</Text> ;
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>❖</Text>
              <Text style={styles.bulletText}>
                A chaque demande d'accompagnement régulier le nominal <Text style={styles.bold}>est pénalisé de 0%</Text> ;
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>❖</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bold}>L'accompagnement régulier est remboursable au plus tard avant le payement de la 
                prochaine contribution</Text> ;
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>❖</Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bold}>En cas de non remboursement de l'accompagnement par un adhérent dans le délai fixé 
                à l'alinéa précédent, KARA se réserve la faculté de se</Text>
              </Text>
            </View>
          </View>
        </View>
      </Page>

      {/* PAGE 5 - Suite Accompagnements + Tableau forfaits */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageContainer}>
          <Text style={styles.articleText}>
            <Text style={styles.bold}>désintéresser par prélèvement dans le nominal de l'adhérent à hauteur des sommes 
            dues. Ce prélèvement est conditionné à une mise en demeure adressée à l'adhérent par le Secrétaire exécutif.</Text>
          </Text>

          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bulletSymbol}>❖</Text>
              <Text style={styles.bulletText}>
                Les accompagnements réguliers octroyés sont plafonnés en fonction du forfait souscrit par le membre.
              </Text>
            </View>
          </View>

          <Text style={styles.articleText}>
            Ces appuis sont détaillés dans le tableau ci-après :
          </Text>

          <View style={styles.forfaitTable}>
            <View style={styles.forfaitTableRow}>
              <Text style={styles.forfaitTableHeader}>Forfait</Text>
              <Text style={styles.forfaitTableHeader}>Nominal</Text>
              <Text style={styles.forfaitTableHeader}>Appui</Text>
            </View>
            <View style={styles.forfaitTableRow}>
              <Text style={styles.forfaitTableCell}>A- 10 000</Text>
              <Text style={styles.forfaitTableCell}>120 000</Text>
              <Text style={styles.forfaitTableCell}>[0 ; 30 000]</Text>
            </View>
            <View style={styles.forfaitTableRow}>
              <Text style={styles.forfaitTableCell}>B- 20 000</Text>
              <Text style={styles.forfaitTableCell}>240 000</Text>
              <Text style={styles.forfaitTableCell}>[0 ; 60 000]</Text>
            </View>
            <View style={styles.forfaitTableRow}>
              <Text style={styles.forfaitTableCell}>C- 30 000</Text>
              <Text style={styles.forfaitTableCell}>360 000</Text>
              <Text style={styles.forfaitTableCell}>[0 ; 90 000]</Text>
            </View>
            <View style={styles.forfaitTableRow}>
              <Text style={styles.forfaitTableCell}>D- 40 000</Text>
              <Text style={styles.forfaitTableCell}>480 000</Text>
              <Text style={styles.forfaitTableCell}>[0 ; 120 000]</Text>
            </View>
            <View style={styles.forfaitTableRow}>
              <Text style={styles.forfaitTableCell}>E- 50 000</Text>
              <Text style={styles.forfaitTableCell}>600 000</Text>
              <Text style={styles.forfaitTableCell}>[0 ; 150 000]</Text>
            </View>
          </View>

          <Text style={[styles.bold, { fontSize: 12, textAlign: 'center', marginTop: 15, marginBottom: 10 }]}>
            NB : LE FORFAIT CHOISIT NE PEUT ÊTRE CHANGEABLE.
          </Text>

          <Text style={{ fontSize: 12, textAlign: 'right', marginTop: 20 }}>
            <Text style={styles.bold}>
              [Signature membre « lu et approuvé »]
            </Text>
          </Text>

          <View style={{ marginTop: 30 }}>
            <Text style={[styles.bold, { fontSize: 12 }]}>SIGNATURE DU SECRÉTAIRE EXÉCUTIF :</Text>
          </View>
        </View>
      </Page>

      {/* PAGE 6 - Récapitulatif des versements */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageContainer}>
          <Text style={styles.title}>RÉCAPITULATIF DES VERSEMENTS MENSUELS</Text>

          <Text style={styles.articleText}>
            CE DOCUMENT PREND ACTE DES DIFFÉRENTS VERSEMENTS MENSUELS EFFECTUÉS PAR L'ADHÉRENT.
          </Text>

          <Text style={[styles.bold, { fontSize: 13, textAlign: 'center', marginBottom: 10 }]}>
            VOLET ENTRAIDE
          </Text>

          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableHeader}>NOMBRE DE MOIS</Text>
              <Text style={styles.tableHeader}>MONTANT VERSÉ</Text>
              <Text style={styles.tableHeader}>DATE DE VERSEMENT</Text>
              <Text style={styles.tableHeader}>SIGNATURE DE L'ÉPARGNANT</Text>
              <Text style={styles.tableHeader}>SIGNATURE DU SECRÉTAIRE EXÉCUTIF</Text>
            </View>
            {[...Array(12)].map((_, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.tableCell}>{i + 1}</Text>
                <Text style={styles.tableCell}>
                  {payments?.[i] ? formatAmount(payments[i].amount) : ''}
                </Text>
                <Text style={styles.tableCell}>
                  {payments?.[i] ? formatDate(payments[i].paidAt) : ''}
                </Text>
                <Text style={styles.tableCell}>
                  {payments?.[i] ? '✓' : ''}
                </Text>
                <Text style={styles.tableCell}>
                  {payments?.[i] ? '✓' : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default CaisseImprevuePDF

