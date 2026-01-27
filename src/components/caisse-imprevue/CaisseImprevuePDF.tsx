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
    marginBottom: 10,
    textAlign: 'justify',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 8,
    textDecoration: 'underline',
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

  /**
   * Génère les lignes de téléphones par paires pour l'affichage
   * Retourne un tableau de tableaux : chaque sous-tableau contient [label1, value1, label2?, value2?]
   * - 2 numéros : [TÉLÉPHONE 1, num1, TÉLÉPHONE 2, num2] (1 ligne)
   * - 3 numéros : [TÉLÉPHONE 1, num1, TÉLÉPHONE 2, num2] (1 ligne), [TÉLÉPHONE 3, num3] (1 ligne)
   * - 4 numéros : [TÉLÉPHONE 1, num1, TÉLÉPHONE 2, num2] (1 ligne), [TÉLÉPHONE 3, num3, TÉLÉPHONE 4, num4] (1 ligne)
   */
  const generatePhoneRows = (contacts: string[]): Array<[string, string, string?, string?]> => {
    if (!contacts || contacts.length === 0) {
      return [['TÉLÉPHONE 1 :', '—', 'TÉLÉPHONE 2 :', '—']]
    }

    const rows: Array<[string, string, string?, string?]> = []
    let phoneIndex = 1

    for (let i = 0; i < contacts.length; i += 2) {
      if (i + 1 < contacts.length) {
        // Paire complète : num1 et num2 sur la même ligne, chacun dans sa colonne
        const label1 = `TÉLÉPHONE ${phoneIndex} :`
        const value1 = contacts[i]
        const label2 = `TÉLÉPHONE ${phoneIndex + 1} :`
        const value2 = contacts[i + 1]
        rows.push([label1, value1, label2, value2])
        phoneIndex += 2
      } else {
        // Numéro seul (impair) : num3 seul sur une ligne
        const label1 = `TÉLÉPHONE ${phoneIndex} :`
        const value1 = contacts[i]
        rows.push([label1, value1])
        phoneIndex += 1
      }
    }

    return rows
  }

  // Déterminer la liste des contacts à afficher
  // On privilégie les contacts du membre (à jour), sinon ceux du contrat (snapshot)
  const contacts = React.useMemo(() => {
    if (contract?.member?.contacts && Array.isArray(contract.member.contacts) && contract.member.contacts.length > 0) {
      return contract.member.contacts
    }
    return contract?.memberContacts || []
  }, [contract])

  // Générer les lignes de téléphones
  const phoneRows = React.useMemo(() => {
    return generatePhoneRows(contacts)
  }, [contacts])

  /**
   * Récupère tous les numéros du contact urgent
   */
  const getEmergencyContactPhones = (): string[] => {
    const phones: string[] = []
    if (contract?.emergencyContact?.phone1) phones.push(contract.emergencyContact.phone1)
    if (contract?.emergencyContact?.phone2) phones.push(contract.emergencyContact.phone2)
    // Ajouter d'autres numéros si disponibles
    //if (contract?.emergencyContact?.phone) phones.push(contract.emergencyContact.phone)
    return phones
  }

  // Générer les lignes de téléphones du contact urgent
  const emergencyPhoneRows = React.useMemo(() => {
    const emergencyPhones = getEmergencyContactPhones()
    return generatePhoneRows(emergencyPhones)
  }, [contract?.emergencyContact])


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
            {phoneRows.map((row, index) => (
              <View key={index} style={styles.row}>
                <Text style={styles.cell}>{row[0]}</Text>
                <Text style={styles.cell}>{row[1] || '—'}</Text>
                {row[2] && (
                  <>
                    <Text style={styles.cell}>{row[2]}</Text>
                    <Text style={styles.cell}>{row[3] || '—'}</Text>
                  </>
                )}
              </View>
            ))}
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
            {emergencyPhoneRows.map((row, index) => (
              <View key={index} style={styles.row}>
                <Text style={styles.cell}>{row[0]}</Text>
                <Text style={styles.cell}>{row[1] || '—'}</Text>
                {row[2] && (
                  <>
                    <Text style={styles.cell}>{row[2]}</Text>
                    <Text style={styles.cell}>{row[3] || '—'}</Text>
                  </>
                )}
              </View>
            ))}
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
            Dans le cadre d'une démarche purement sociale, l'association LE KARA met en place le «Volet Entraide», un mécanisme inspiré de la solidarité qui fonde l'âme même de l'association. Ce dispositif est le pilier sur lequel sont fondées les actions solidaires telles que les appuis, les collectes, les dons que l'association réalise.
          </Text>

          <Text style={styles.articleText}>
            Le Volet Entraide constitue le système obligatoire de cotisations, garantissant la vie financière de l'association et la disponibilité des fonds nécessaires aux aides apportées aux membres en difficulté.
          </Text>

          <Text style={styles.articleText}>
            A ce titre, le KARA par le canal du Volet Entraide invite tous ses membres à verser mensuellement une cotisation de 10 000 FCFA, 20 000 FCFA, 30 000 FCFA, 40 000 FCFA, 50 000 FCFA ou plus, selon leurs disponibilités financières.
          </Text>

          <Text style={styles.articleText}>
            Ces versements réguliers assurent la stabilité de la trésorerie, le financement des activités de l'association, la disponibilité des appuis et l'équité entre tous les membres.
          </Text>

          <Text style={styles.articleText}>
            Concernant les appuis, c'est un système où chacun contribue selon ses moyens et reçoit selon ses besoins et permettent de bénéficier d'une somme comprise entre 30 000 FCFA à 150 000 FCFA ou plus selon le forfait souscrit, mais qui sera par la suite reverser dans la caisse de l'association après une durée déterminée.
          </Text>

          <Text style={styles.articleText}>
            Toutefois, pour la bonne tenue de la trésorerie de l'association, les membres bénéficiaires sont tenus aux respects des règles suivantes :
          </Text>

          <Text style={styles.sectionTitle}>
            I. Fonctionnement général du Volet Entraide
          </Text>

          <View style={styles.definitionList}>
            <View style={styles.definitionItem}>
              <Text style={styles.definitionSymbol}>1.</Text>
              <Text style={styles.definitionText}>
                <Text style={styles.bold}>Début du contrat :</Text> Toute adhésion nouvelle ou renouvellement à l'association le KARA emporte systématiquement adhésion au Volet Entraide. En effet, le Volet Entraide assure la vie de l'association par le biais de cotisations volontaires conformément au règlement intérieur.
              </Text>
            </View>

            <View style={styles.definitionItem}>
              <Text style={styles.definitionSymbol}>•</Text>
              <Text style={styles.definitionText}>
                Le refus ou l'abandon pour un membre du Volet Entraide entraine le retrait du membre de l'association car il est considéré comme la rupture de l'aspiration à l'idéologie de l'association.
              </Text>
            </View>

            <View style={styles.definitionItem}>
              <Text style={styles.definitionSymbol}>2.</Text>
              <Text style={styles.definitionText}>
                <Text style={styles.bold}>Durée du contrat :</Text> L'adhésion au Volet Entraide dure aussi longtemps que dure l'adhésion à l'association Le KARA, soit sur une année.
              </Text>
            </View>

            <View style={styles.definitionItem}>
              <Text style={styles.definitionSymbol}>•</Text>
              <Text style={styles.definitionText}>
                Le retrait de l'association entraine automatiquement rupture du contrat du Volet Entraide et emporte remboursement des sommes versées.
              </Text>
            </View>

            <View style={styles.definitionItem}>
              <Text style={styles.definitionSymbol}>3.</Text>
              <Text style={styles.definitionText}>
                <Text style={styles.bold}>Déroulement des versements :</Text> Le membre se doit de procéder aux versements des cotisations au plus tard le ________________ de chaque mois durant toute la durée du présent contrat.
              </Text>
            </View>

            <View style={styles.definitionItem}>
              <Text style={styles.definitionSymbol}>4.</Text>
              <Text style={styles.definitionText}>
                <Text style={styles.bold}>Tolérance de retard :</Text> L'épargnant dispose d'un délai de grâce de trois jours après la date prévue pour son versement mensuel. Aucun frais ni pénalité ne s'applique dans ce délai.
              </Text>
            </View>

            <View style={styles.definitionItem}>
              <Text style={styles.definitionSymbol}>•</Text>
              <Text style={styles.definitionText}>
                À compter du quatrième jour jusqu'au septième jour succédant l'expiration du délai de retard, tout versement intervenu dans cet intervalle est passible de pénalités pécuniaires, destinées à préserver l'équilibre et la bonne tenue de la caisse commune.
              </Text>
            </View>

          </View>
        </View>
      </Page>

      {/* PAGE 3 - Suite Fonctionnement général */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageContainer}>
          <View style={styles.definitionList}>

            <View style={styles.definitionItem}>
              <Text style={styles.definitionSymbol}>•</Text>
              <Text style={styles.definitionText}>
                A compter du septième jour les mesures disciplinaires ci-après, non cumulatives, sont applicables :
              </Text>
            </View>

            <View style={styles.subBulletList}>
              <View style={styles.subBulletItem}>
                <Text style={styles.subBulletSymbol}>-</Text>
                <Text style={styles.subBulletText}>
                  La non prise en compte de ce versement pour le mois auquel il est normalement dû. Il sera considéré comme non acquitté et sera compté pour le mois suivant.
                </Text>
              </View>

              <View style={styles.subBulletItem}>
                <Text style={styles.subBulletSymbol}>-</Text>
                <Text style={styles.subBulletText}>
                  La perte de tous les avantages liés à la régularité dans les versements conformément aux dispositions du règlement intérieur.
                </Text>
              </View>
            </View>

            <View style={styles.definitionItem}>
              <Text style={styles.definitionSymbol}>5.</Text>
              <Text style={styles.definitionText}>
                <Text style={styles.bold}>Le retrait de l'association :</Text> À compter du troisième mois suivant l'adhésion à l'association, le membre a la faculté de la résilier. Cette résiliation doit être obligatoirement formulée par écrit et déposée auprès du Secrétaire Exécutif. À compter de la date de notification, l'association dispose de 30 jours pour rembourser les sommes versées au titre du Volet Entraide.
              </Text>
            </View>

            <View style={styles.definitionItem}>
              <Text style={styles.definitionSymbol}>6.</Text>
              <Text style={styles.definitionText}>
                <Text style={styles.bold}>Terme du contrat :</Text> Le contrat Volet Entraide prend fin à l'expiration de l'adhésion annuelle à l'association. Il emporte l'obligation pour le KARA de restituer au membre l'intégralité des sommes versées par le membre au cours de l'année au titre du Volet Entraide.
              </Text>
            </View>

            <View style={styles.definitionItem}>
              <Text style={styles.definitionSymbol}>7.</Text>
              <Text style={styles.definitionText}>
                <Text style={styles.bold}>Remboursement du nominal :</Text> Le remboursement des sommes visées au ci-dessus, intervient dans un délai maximal de 30 jours suivant la date du terme du contrat.
              </Text>
            </View>
          </View>
        
          <Text style={styles.sectionTitle}>
            II. Des accompagnements réguliers (appuis)
          </Text>

          <Text style={styles.articleText}>
            Dans le respect des principes d'équité et de gestion saine de la caisse commune, l'octroi d'un appui suit les règles ci-après :
          </Text>

          <View style={styles.definitionList}>
            <View style={styles.definitionItem}>
              <Text style={styles.definitionSymbol}>8.</Text>
              <Text style={styles.definitionText}>
                <Text style={styles.bold}>Délai avant première demande :</Text> Aucune demande d'appui ne peut être réalisée dans un intervalle de trois mois à compter de la date d'adhésion à l'association jusqu'à la date du troisième versement mensuel effectif, effectué par le membre. Ce délai permet de stabiliser la caisse et de garantir des appuis fiables pour tous.
              </Text>
            </View>

            <View style={styles.definitionItem}>
              <Text style={styles.definitionSymbol}>9.</Text>
              <Text style={styles.definitionText}>
                <Text style={styles.bold}>Conditions d'éligibilité à un appui :</Text> Peut solliciter un accompagnement régulier, le membre qui, en plus d'être à jour dans ses cotisations mensuelles, s'est acquitté de sa prime mensuelle pour le mois durant lequel il sollicite un accompagnement régulier.
              </Text>
            </View>

            <View style={styles.definitionItem}>
              <Text style={styles.definitionSymbol}>10.</Text>
              <Text style={styles.definitionText}>
                <Text style={styles.bold}>Nombre d'appuis autorisés :</Text> Tout membre a droit à un appui par mois dans la limite de six appuis maximum pour toute l'année, de manière non consécutive. Ce dispositif constitue le volet prévoyance du Volet Entraide.
              </Text>
            </View>

            <View style={styles.definitionItem}>
              <Text style={styles.definitionSymbol}>11.</Text>
              <Text style={styles.definitionText}>
                <Text style={styles.bold}>Remboursement des appuis :</Text> Tout appui accordé doit être remboursé au plus tard avant le versement de la prochaine contribution.
              </Text>
            </View>

            <View style={styles.definitionItem}>
              <Text style={styles.definitionSymbol}>•</Text>
              <Text style={styles.definitionText}>
                En cas de non remboursement de l'accompagnement par un adhérent dans le délai fixé à l'alinéa précédent, KARA se réserve la faculté de se désintéresser par prélèvement dans le nominal cumulé de l'adhérent à hauteur des sommes dues. Ce prélèvement est conditionné à une mise en demeure adressée à l'adhérent par le Secrétaire exécutif.
              </Text>
            </View>
          </View>
        </View>
      </Page>

      {/* PAGE 4 - Catégorie des forfaits + Signatures */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageContainer}>
          <Text style={styles.sectionTitle}>
            III. Catégorie des forfaits
          </Text>

          <Text style={styles.articleText}>
            Les appuis octroyés sont plafonnés en fonction du forfait souscrit par le membre.
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
              <Text style={styles.forfaitTableCell}>E-50 000</Text>
              <Text style={styles.forfaitTableCell}>600 000</Text>
              <Text style={styles.forfaitTableCell}>[0 ; 150 000]</Text>
            </View>
            <View style={styles.forfaitTableRow}>
              <Text style={styles.forfaitTableCell}>X-XXXX</Text>
              <Text style={styles.forfaitTableCell}>XXXX</Text>
              <Text style={styles.forfaitTableCell}>[0 ; XXXX]</Text>
            </View>
          </View>

          <Text style={[styles.bold, { fontSize: 12, textAlign: 'center', marginTop: 15, marginBottom: 10 }]}>
            NB : LE FORFAIT CHOISIT NE PEUT ÊTRE CHANGEABLE
          </Text>

          <Text style={{ fontSize: 12, textAlign: 'right', marginTop: 20 }}>
            <Text style={styles.bold}>
              Signature membre précédée de la mention « lu et approuvé »
            </Text>
          </Text>

          <View>
            <Text style={[styles.bold, { fontSize: 12 }]}>Signature du Secrétaire Exécutif</Text>
          </View>
        </View>
      </Page>

    </Document>
  )
}

export default CaisseImprevuePDF
