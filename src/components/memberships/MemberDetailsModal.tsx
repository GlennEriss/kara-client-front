'use client'

import React, { useState } from 'react'
import { Download, Loader2, Eye } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { MembershipRequest } from '@/types/types'
import { PDFViewer, Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer'
import { LogoPDF } from '@/components/logo'
import routes from '@/constantes/routes'
import { toast } from 'sonner'

// Styles optimisés pour tenir sur une page
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 10, // Réduit de 12 à 10
    paddingTop: 15, // Réduit de 10 à 15
    paddingBottom: 20, // Réduit de 65 à 20
    paddingHorizontal: 25, // Réduit de 35 à 25
    lineHeight: 1.2, // Réduit de 1.5 à 1.2
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12, // Réduit de 20 à 12
    width: '100%',
  },
  logo: {
    width: 70, // Réduit de 100 à 70
    height: 70, // Réduit de 100 à 70
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoId: {
    width: 60, // Réduit de 80 à 60
    height: 60, // Réduit de 80 à 60
    border: '1px solid #000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleListe: {
    fontSize: 18, // Réduit de 24 à 18
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f3a4e',
    textDecoration: 'underline',
    marginBottom: 12, // Réduit de 20 à 12
    marginTop: 5, // Réduit de 10 à 5
  },
  infoType: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12, // Réduit de 20 à 12
    fontSize: 11, // Réduit de 14 à 11
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15, // Réduit de 20 à 15
  },
  checkbox: {
    width: 10, // Réduit de 12 à 10
    height: 10, // Réduit de 12 à 10
    border: '2px solid #ba0c2f',
    marginRight: 4, // Réduit de 5 à 4
    backgroundColor: 'white',
  },
  checkboxChecked: {
    width: 10,
    height: 10,
    border: '2px solid #ba0c2f',
    marginRight: 4,
    backgroundColor: '#ba0c2f', // Changé pour être plus visible
    position: 'relative',
  },
  checkmark: {
    position: 'absolute',
    left: 1,
    top: -1,
    width: 2,
    height: 5,
    border: '1px solid white',
    borderWidth: '0 1px 1px 0',
    transform: 'rotate(45deg)',
  },
  section: {
    border: '1px solid black',
    marginBottom: 8, // Réduit de 15 à 8
  },
  sectionHeader: {
    backgroundColor: '#224d62',
    color: 'white',
    textAlign: 'center',
    padding: 5, // Réduit de 8 à 5
    fontSize: 13, // Réduit de 16 à 13
    fontWeight: 'bold',
  },
  stripedTable: {
    width: '100%',
  },
  stripedRow: {
    flexDirection: 'row',
    padding: 5, // Réduit de 8 à 5
    backgroundColor: '#f2f2f2',
    minHeight: 20, // Ajouté pour contrôler la hauteur
  },
  stripedRowEven: {
    flexDirection: 'row',
    padding: 5, // Réduit de 8 à 5
    backgroundColor: 'white',
    minHeight: 20, // Ajouté pour contrôler la hauteur
  },
  stripedCell: {
    flex: 1,
    fontSize: 9, // Réduit de 12 à 9
    paddingRight: 5,
  },
  modeReglementTable: {
    width: '100%',
  },
  modeReglementRow: {
    flexDirection: 'row',
    height: 50, // Réduit de 80 à 50
    border: '1px solid black',
  },
  modeReglementCell: {
    flex: 1,
    borderRight: '1px solid black',
    padding: 8, // Augmenté de 5 à 8 pour plus d'espace
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  modeReglementCellLast: {
    flex: 1,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  rectangle: {
    width: 15, // Réduit de 20 à 15
    height: 15, // Réduit de 20 à 15
    border: '1px solid black',
    marginRight: 5,
  },
  rectangleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5, // Réduit de 15 à 5
  },
  signatureTable: {
    width: '100%',
    border: '1px solid black',
    marginBottom: 8, // Réduit de 15 à 8
  },
  signatureRow: {
    flexDirection: 'row',
    height: 80, // Réduit de 120 à 80
  },
  signatureCell: {
    flex: 1,
    border: '1px solid black',
    padding: 8,
    justifyContent: 'space-between',
  },
  italic: {
    fontStyle: 'italic',
    marginBottom: 8, // Réduit de 15 à 8
    fontSize: 9, // Réduit de 11 à 9
    lineHeight: 1.3,
  },
  footer: {
    marginTop: 10, // Réduit de 20 à 10
    fontSize: 8, // Réduit de 10 à 8
    lineHeight: 1.2,
  },
  boldText: {
    fontWeight: 'bold',
  },
  // Styles pour le contrat de confidentialité
  confidentialityTitle: {
    fontSize: 16, // Réduit de 20 à 16
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15, // Réduit de 20 à 15
    marginTop: 10, // Réduit de 40 à 10
  },
  articleHeader: {
    fontSize: 12, // Réduit de 16 à 12
    fontWeight: 'bold',
    marginBottom: 5, // Réduit de 10 à 5
    marginTop: 8, // Réduit de 15 à 8
  },
  articleText: {
    marginBottom: 8, // Réduit de 15 à 8
    fontSize: 9, // Réduit de 12 à 9
    lineHeight: 1.3, // Réduit de 1.4 à 1.3
  },
  redText: {
    color: '#ba0c2f',
  },
  contractSignatureDate: {
    marginTop: 15, // Réduit de 30 à 15
    marginBottom: 10, // Réduit de 20 à 10
    fontSize: 10,
  },
})

// Composant pour les cases à cocher
const Checkbox = ({ checked, label }: { checked: boolean; label: string }) => (
  <View style={styles.checkboxContainer}>
    <View style={checked ? styles.checkboxChecked : styles.checkbox}>
      {checked && <View style={styles.checkmark} />}
    </View>
    <Text>{label}</Text>
  </View>
)

// Composant principal du document PDF
const MutuelleKaraPDF = ({ request }: { request: MembershipRequest }) => {
  const getPhotoURL = () => {
    if (request.identity?.photoURL) {
      return request.identity.photoURL
    }
    if (request.identity?.photoPath) {
      return request.identity.photoPath
    }
    if (typeof request.identity?.photo === 'string' && request.identity.photo.startsWith('http')) {
      return request.identity.photo
    }
    if (request.documents?.documentPhotoFrontURL) {
      return request.documents.documentPhotoFrontURL
    }
    if (request.documents?.documentPhotoFrontPath) {
      return request.documents.documentPhotoFrontPath
    }
    return null
  }

  const formatDate = (date: Date | string | any) => {
    if (!date) return 'Non défini'

    try {
      let dateObj: Date

      if (date instanceof Date) {
        dateObj = date
      } else if (typeof date === 'string') {
        dateObj = new Date(date)
      } else if (date.toDate && typeof date.toDate === 'function') {
        dateObj = date.toDate()
      } else {
        dateObj = new Date(date)
      }

      return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(dateObj)
    } catch (error) {
      return 'Date invalide'
    }
  }

  const formatFullAddress = () => {
    const { address } = request
    const parts = [
      address.district,
      address.arrondissement,
      address.city,
      address.province
    ].filter(Boolean)
    return parts.join(', ') || 'Non renseignée'
  }

  return (
    <Document>
      {/* Page 1 - Fiche d'Adhésion */}
      <Page size="A4" style={styles.page}>
        {/* En-tête avec logo et photo */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Image
              src={window.location.origin + '/Logo-Kara.jpg'}
              style={{ width: 70, height: 70, objectFit: 'cover' }}
              cache={false}
            />
          </View>
          <View style={styles.photoId}>
            {getPhotoURL() ? (
              <Image 
                src={getPhotoURL()!} 
                style={{ width: 60, height: 60, objectFit: 'cover' }}
                cache={false}
              />
            ) : (
              <View style={{ 
                width: 60, 
                height: 60, 
                border: '2px solid #000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8f9fa'
              }}>
                <Text style={{ 
                  fontSize: 7, 
                  textAlign: 'center',
                  color: '#666'
                }}>
                  PHOTO{'\n'}IDENTITÉ
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Titre principal */}
        <Text style={styles.titleListe}>
          FICHE D'ADHÉSION CONTRACTUELLE INDIVIDUELLE
        </Text>

        {/* Type de membre */}
        <View style={styles.infoType}>
          <Checkbox checked={false} label="Membre Adhérent" />
          <Checkbox checked={false} label="Membre Sympathisant" />
          <Checkbox checked={false} label="Membre Bienfaiteur" />
        </View>

        {/* Section Informations Personnelles */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Informations Personnelles du Membre :</Text>
          <View style={styles.stripedTable}>
            <View style={styles.stripedRow}>
              <View style={styles.stripedCell}>
                <Text><Text style={styles.boldText}>Nom(s):</Text> {request.identity?.lastName?.toUpperCase() || 'Non renseigné'}</Text>
              </View>
              <View style={styles.stripedCell}>
                <Text><Text style={styles.boldText}>Prénom(s):</Text> {request.identity?.firstName?.toUpperCase() || 'Non renseigné'}</Text>
              </View>
            </View>
            <View style={styles.stripedRowEven}>
              <View style={styles.stripedCell}>
                <Text><Text style={styles.boldText}>Lieu de Naissance:</Text> {request.identity?.birthPlace?.toUpperCase() || 'Non renseigné'}</Text>
              </View>
              <View style={styles.stripedCell}>
                <Text><Text style={styles.boldText}>Date de Naissance:</Text> {formatDate(request.identity?.birthDate) || 'Non renseigné'}</Text>
              </View>
            </View>
            <View style={styles.stripedRow}>
              <View style={styles.stripedCell}>
                <Text><Text style={styles.boldText}>Nationalité:</Text> {request.identity?.nationality?.toUpperCase() || 'Non renseigné'}</Text>
              </View>
              <View style={styles.stripedCell}>
                <Text><Text style={styles.boldText}>N°CNI/PASS/CS:</Text> {request.documents?.identityDocumentNumber || 'Non renseigné'}</Text>
              </View>
            </View>
            <View style={styles.stripedRowEven}>
              <View style={styles.stripedCell}>
                <Text><Text style={styles.boldText}>Téléphone:</Text> {request.identity.contacts[0] || 'Non renseigné'}</Text>
              </View>
              <View style={styles.stripedCell}>
                <Text><Text style={styles.boldText}>Adresse:</Text> {formatFullAddress()}</Text>
              </View>
            </View>
            <View style={styles.stripedRow}>
              <View style={styles.stripedCell}>
                <Text><Text style={styles.boldText}>Profession:</Text> {request.company?.profession || 'Non renseigné'}</Text>
              </View>
              <View style={styles.stripedCell}>
                <Text><Text style={styles.boldText}>Matricule:</Text> {request.id || 'Non renseigné'}</Text>
              </View>
            </View>
            <View style={styles.stripedRowEven}>
              <View style={styles.stripedCell}>
                <Text><Text style={styles.boldText}>Employeur:</Text> {request.company?.companyName || 'Non renseigné'}</Text>
              </View>
              <View style={styles.stripedCell}>
                <Text></Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section Mode de Règlement */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Mode de Règlement</Text>
          <View style={styles.modeReglementTable}>
            <View style={styles.modeReglementRow}>
              <View style={styles.modeReglementCell}>
                <View style={styles.rectangleRow}>
                  <View style={styles.rectangle}></View>
                  <Text>A</Text>
                </View>
                <View style={styles.rectangleRow}>
                  <View style={styles.rectangle}></View>
                  <Text>B</Text>
                </View>
              </View>
              <View style={styles.modeReglementCell}>
                <View style={styles.rectangleRow}>
                  <View style={styles.rectangle}></View>
                  <Text>C</Text>
                </View>
                <View style={styles.rectangleRow}>
                  <View style={styles.rectangle}></View>
                  <Text>D</Text>
                </View>
              </View>
              <View style={styles.modeReglementCellLast}>
                <View style={styles.rectangleRow}>
                  <View style={styles.rectangle}></View>
                  <Text>E</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Table des signatures */}
        <View style={styles.signatureTable}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureCell}>
              <Text style={{ fontSize: 9 }}>Signature de l'adhérent suivi de la mention "lu et approuvé"</Text>
              <Text style={{ fontSize: 9 }}>Date : ................../...................../..................</Text>
            </View>
            <View style={styles.signatureCell}>
              <Text style={{ fontSize: 9 }}>Signature et cachet du Secrétariat Exécutif</Text>
              <Text style={{ fontSize: 9 }}>Date : ................../...................../..................</Text>
            </View>
          </View>
        </View>

        {/* Texte d'engagement */}
        <Text style={styles.italic}>
          J'adhère contractuellement à la Mutuelle KARA conformément aux dispositions y afférentes,
          je m'engage à respecter l'intégralité des dispositions Règlementaires qui la structurent
          et pour lesquelles je confirme avoir pris connaissance avant d'apposer ma signature.
        </Text>

        {/* Pied de page */}
        <View style={styles.footer}>
          <Text>Mutuelle KARA. <Text style={styles.boldText}>Intégrité - Solidarité - Dynamisme</Text></Text>
          <Text>Siège : Awougou, Owendo</Text>
          <Text>R.D N°: 0650 /MIS/SG/DGELP/DPPALC/KMOG-</Text>
          <Text>Tél : 066-95-13-14 / 074-36-97-29</Text>
          <Text>E-mail : mutuellekara@gmail.com</Text>
        </View>
      </Page>

      {/* Page 2 - Contrat de Confidentialité */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.confidentialityTitle}>CONTRAT DE CONFIDENTIALITÉ</Text>

        <View style={styles.stripedTable}>
          <View style={styles.stripedRow}>
            <Text>Entre LA MUTUELLE KARA</Text>
          </View>
          <View style={styles.stripedRowEven}>
            <Text>ET</Text>
          </View>
          <View style={styles.stripedRow}>
            <Text>Nom : {request.identity?.lastName?.toUpperCase() || 'Non renseigné'}</Text>
          </View>
          <View style={styles.stripedRowEven}>
            <Text>Prénom : {request.identity?.firstName?.toUpperCase() || 'Non renseigné'}</Text>
          </View>
          <View style={styles.stripedRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text>Qualité : </Text>
              <Checkbox checked={false} label="Membre Adhérent" />
              <Checkbox checked={false} label="Membre Sympathisant" />
              <Checkbox checked={false} label="Membre Bienfaiteur" />
            </View>
          </View>
          <View style={styles.stripedRowEven}>
            <Text>N° de téléphone : {request.identity.contacts[0] || 'Non renseigné'}</Text>
          </View>
        </View>

        <Text style={styles.articleHeader}>Article 1</Text>
        <Text style={styles.articleText}>
          Il est préalablement établi l'obligation de réserve d'un membre de la Mutuelle
          exerçant ou pas une fonction au sein du bureau et le respect des différents codes
          qui s'imposent à son statut.
        </Text>

        <Text style={styles.articleHeader}>Article 2</Text>
        <Text style={styles.articleText}>
          Le bénéficiaire des informations reconnaît que tous les droits relatifs à l'information
          obtenue existent et ne peuvent être divulgué et communiquer que par le donneur.
        </Text>

        <Text style={styles.articleHeader}>Article 3</Text>
        <Text style={styles.articleText}>
          Le bénéficiaire accepte les conditions de confidentialité des informations reçues
          et s'engage à les respecter.
        </Text>

        <Text style={styles.articleHeader}>Article 4</Text>
        <Text style={styles.articleText}>
          Cet engagement dans l'hypothèse d'une vulgarisation d'informations avérées ou à des fins
          diffamatoires faites par le receveur est passible d'une sanction pénale et vaut radiation
          de la Mutuelle.
        </Text>

        <Text style={styles.articleHeader}>Article 6</Text>
        <Text style={[styles.articleText, styles.redText]}>
          Il est interdit à tout bénéficiaire des services de la Mutuelle Kara de contracter un service
          supplémentaire qui ne lui est pas accessible par un prête-nom ou toute autre personne qui
          accepterait une telle manœuvre. Le coupable perdra son Épargne en cours, s'exposera à la
          radiation au sein de la Mutuelle et s'exposera aux poursuites judiciaires.
        </Text>

        <Text style={styles.contractSignatureDate}>
          Fait à …………………................... le ……......./……...... …./..……......…
        </Text>

        {/* Table des signatures pour le contrat */}
        <View style={styles.signatureTable}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureCell}>
              <Text style={{ fontSize: 9 }}>Signature du BÉNÉFICIAIRE suivi de la mention "lu et approuvé"</Text>
            </View>
            <View style={styles.signatureCell}>
              <Text style={{ fontSize: 9 }}>Signature du SECRÉTAIRE EXÉCUTIF</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}

interface MemberDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  request: MembershipRequest
}

const MemberDetailsModal: React.FC<MemberDetailsModalProps> = ({
  isOpen,
  onClose,
  request
}) => {
  const [isExporting, setIsExporting] = useState(false)

  const handleDownloadPDF = async () => {
    setIsExporting(true)

    try {
      const blob = await pdf(<MutuelleKaraPDF request={request} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Fiche_Adhesion_${request.identity.lastName}_${request.identity.firstName}_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('✅ PDF téléchargé avec succès', {
        description: 'Le document a été généré et téléchargé dans votre dossier de téléchargements.',
        duration: 3000,
      })

    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF:', error)
      toast.error('❌ Erreur de téléchargement', {
        description: 'Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.',
        duration: 4000,
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[95vw] !max-w-[1400px] max-h-[95vh] overflow-hidden bg-gradient-to-br from-white to-gray-50 border-0 shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b border-gray-200">
          <div className="space-y-1">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
              📋 Fiche d'Adhésion Contractuelle
            </DialogTitle>
            <p className="text-gray-600">
              Prévisualisation pour {request.identity.firstName} {request.identity.lastName}
            </p>
          </div>
          <Button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="mr-10 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-12 px-6"
          >
            {isExporting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Génération...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                <span>Télécharger PDF</span>
              </div>
            )}
          </Button>
        </DialogHeader>

        {/* Prévisualisation PDF avec design amélioré */}
        <div className="flex-1 h-[calc(95vh-150px)] rounded-xl overflow-hidden shadow-inner bg-white border">
          <PDFViewer style={{ 
            width: '100%', 
            height: '100%',
            border: 'none',
            borderRadius: '0.75rem'
          }}>
            <MutuelleKaraPDF request={request} />
          </PDFViewer>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MemberDetailsModal