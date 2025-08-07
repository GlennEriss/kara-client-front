'use client'
// Dépendance requise pour l'export PDF:
// npm install @react-pdf/renderer
// ou
// yarn add @react-pdf/renderer

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

// Styles pour le document PDF
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 12,
    paddingTop: 30,
    paddingBottom: 65,
    paddingHorizontal: 35,
    lineHeight: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  logo: {
    width: 100,
    height: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoId: {
    width: 80,
    height: 80,
    border: '1px solid #000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleListe: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f3a4e',
    textDecoration: 'underline',
    marginBottom: 20,
    marginTop: 10,
  },
  infoType: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 20,
    fontSize: 14,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  checkbox: {
    width: 12,
    height: 12,
    border: '2px solid #ba0c2f',
    marginRight: 5,
    backgroundColor: 'white',
  },
  checkboxChecked: {
    width: 12,
    height: 12,
    border: '2px solid #ba0c2f',
    marginRight: 5,
    backgroundColor: 'white',
    position: 'relative',
  },
  checkmark: {
    position: 'absolute',
    left: 2,
    top: 0,
    width: 3,
    height: 7,
    border: '2px solid #ba0c2f',
    borderWidth: '0 2px 2px 0',
    transform: 'rotate(45deg)',
  },
  section: {
    border: '1px solid black',
    marginBottom: 15,
  },
  sectionHeader: {
    backgroundColor: '#224d62',
    color: 'white',
    textAlign: 'center',
    padding: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  stripedTable: {
    width: '100%',
    marginBottom: 15,
  },
  stripedRow: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#f2f2f2',
  },
  stripedRowEven: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: 'white',
  },
  stripedCell: {
    flex: 1,
    fontSize: 12,
  },
  modeReglementTable: {
    width: '100%',
    border: '1px solid black',
    marginBottom: 15,
  },
  modeReglementRow: {
    flexDirection: 'row',
    height: 80,
  },
  modeReglementCell: {
    flex: 1,
    border: '1px solid black',
    padding: 10,
    justifyContent: 'space-between',
  },
  rectangle: {
    width: 20,
    height: 20,
    border: '1px solid black',
    marginRight: 5,
  },
  rectangleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  signatureTable: {
    width: '100%',
    border: '1px solid black',
    marginBottom: 15,
  },
  signatureRow: {
    flexDirection: 'row',
    height: 120,
  },
  signatureCell: {
    flex: 1,
    border: '1px solid black',
    padding: 10,
    justifyContent: 'space-between',
  },
  italic: {
    fontStyle: 'italic',
    marginBottom: 15,
    fontSize: 11,
  },
  footer: {
    marginTop: 20,
    fontSize: 10,
    lineHeight: 1.3,
  },
  boldText: {
    fontWeight: 'bold',
  },
  confidentialityTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 40,
  },
  articleHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 15,
  },
  articleText: {
    marginBottom: 15,
    fontSize: 12,
    lineHeight: 1.4,
  },
  redText: {
    color: '#ba0c2f',
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
  // Fonction pour obtenir l'URL de la photo avec fallback
  const getPhotoURL = () => {
    // Priorité : photoURL, puis photoPath, puis photo (si c'est une URL)
    if (request.identity?.photoURL) {
      return request.identity.photoURL
    }
    if (request.identity?.photoPath) {
      // Si c'est un chemin Firebase Storage, on peut essayer de le convertir
      // ou utiliser directement si c'est déjà une URL
      return request.identity.photoPath
    }
    if (typeof request.identity?.photo === 'string' && request.identity.photo.startsWith('http')) {
      return request.identity.photo
    }

    // Vérifier aussi dans les documents
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

  // Fonction pour formater l'adresse complète
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
      <Page size="A4" style={styles.page}>
        {/* En-tête avec logo et photo */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Image
              src={window.location.origin + '/Logo-Kara.jpg'}
              style={{ width: 100, height: 100, objectFit: 'cover' }}
              cache={false}
            />
          </View>
          <View style={styles.photoId}>
            {getPhotoURL() ? (
              <Image 
                src={getPhotoURL()!} 
                style={{ width: 80, height: 80, objectFit: 'cover' }}
                cache={false}
              />
            ) : (
              <View style={{ 
                width: 80, 
                height: 80, 
                border: '2px solid #000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8f9fa'
              }}>
                <Text style={{ 
                  fontSize: 8, 
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
          FICHE D'ADHÉSION{'\n\n'}CONTRACTUELLE INDIVIDUELLE
        </Text>

        {/* Type de membre */}
        <View style={styles.infoType}>
          <Checkbox checked={true} label="Membre Adhérent" />
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
        </View>

        {/* Table Mode de Règlement */}
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
            <View style={styles.modeReglementCell}>
              <View style={styles.rectangleRow}>
                <View style={styles.rectangle}></View>
                <Text>E</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Table des signatures */}
        <View style={styles.signatureTable}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureCell}>
              <Text>Signature de l'adhérent suivi de la mention "lu et approuvé"</Text>
              <Text>Date : ................../...................../..................</Text>
            </View>
            <View style={styles.signatureCell}>
              <Text>Signature et cachet du Secrétariat Exécutif</Text>
              <Text>Date : ................../...................../..................</Text>
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
              <Checkbox checked={true} label="Membre Adhérent" />
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

        <Text style={{ marginTop: 30, marginBottom: 20 }}>
          Fait à …………………................... le ……......./……...... …./..……......…
        </Text>

        {/* Table des signatures pour le contrat */}
        <View style={styles.signatureTable}>
          <View style={styles.signatureRow}>
            <View style={styles.signatureCell}>
              <Text>Signature du BÉNÉFICIAIRE suivi de la mention "lu et approuvé"</Text>
            </View>
            <View style={styles.signatureCell}>
              <Text>Signature du SECRÉTAIRE EXÉCUTIF</Text>
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

  // Fonction pour télécharger le PDF
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

      console.log('PDF téléchargé avec succès')

    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF:', error)
      alert('Erreur lors du téléchargement du PDF. Veuillez réessayer.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[95vw] !max-w-[1400px] max-h-[95vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-xl font-semibold text-[#224D62]">
            Prévisualisation - Fiche d'Adhésion Contractuelle
          </DialogTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="mr-10 flex items-center space-x-1 border-[#224D62] text-[#224D62] hover:bg-[#224D62] hover:text-white disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Génération...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Télécharger PDF</span>
              </>
            )}
          </Button>
        </DialogHeader>

        {/* Prévisualisation PDF */}
        <div className="flex-1 h-[calc(95vh-120px)]">
          <PDFViewer style={{ width: '100%', height: '100%' }}>
            <MutuelleKaraPDF request={request} />
          </PDFViewer>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MemberDetailsModal