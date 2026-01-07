'use client'

import React, { useState, useEffect } from 'react'
import { Download, Loader2, Eye, FileText, Smartphone, Monitor } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { MembershipRequest } from '@/types/types'
import { PDFViewer, Document, Page, Text, View, StyleSheet, pdf, Image, BlobProvider } from '@react-pdf/renderer'
import { toast } from 'sonner'
import { getNationalityName } from '@/constantes/nationality'

// Hook pour détecter le mobile uniquement
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
    }
    
    checkDevice()
    window.addEventListener('resize', checkDevice)
    
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return isMobile
}

// Styles optimisés pour tenir sur une page
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 12, // Augmenté de 10 à 12
    paddingTop: 15,
    paddingBottom: 20,
    paddingHorizontal: 25,
    lineHeight: 1.3, // Augmenté de 1.2 à 1.3
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  logo: {
    width: 70,
    height: 70,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoId: {
    width: 60,
    height: 60,
    border: '1px solid #000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleListe: {
    fontSize: 20, // Augmenté de 18 à 20
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f3a4e',
    textDecoration: 'underline',
    marginBottom: 12,
    marginTop: 5,
  },
  infoType: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    fontSize: 13, // Augmenté de 11 à 13
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  checkbox: {
    width: 10,
    height: 10,
    border: '2px solid #ba0c2f',
    marginRight: 4,
    backgroundColor: 'white',
  },
  checkboxChecked: {
    width: 10,
    height: 10,
    border: '2px solid #ba0c2f',
    marginRight: 4,
    backgroundColor: '#ba0c2f',
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
    marginBottom: 8,
  },
  sectionHeader: {
    backgroundColor: '#224d62',
    color: 'white',
    textAlign: 'center',
    padding: 5,
    fontSize: 15, // Augmenté de 13 à 15
    fontWeight: 'bold',
  },
  stripedTable: {
    width: '100%',
    border: '1px solid black',
  },
  stripedRow: {
    flexDirection: 'row',
    padding: 5,
    backgroundColor: '#f2f2f2',
    minHeight: 20,
  },
  stripedRowEven: {
    flexDirection: 'row',
    padding: 5,
    backgroundColor: 'white',
    minHeight: 20,
  },
  stripedCell: {
    flex: 1,
    fontSize: 11, // Augmenté de 9 à 11
    paddingRight: 5,
  },
  modeReglementTable: {
    width: '100%',
  },
  modeReglementRow: {
    flexDirection: 'row',
    height: 50,
    
    border: '1px solid black',
  },
  modeReglementCell: {
    flex: 1,
    
    borderRight: '1px solid black',
    padding: 8,
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
    width: 15,
    height: 15,
    border: '1px solid black',
    marginRight: 5,
  },
  rectangleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    
  },
  signatureTable: {
    width: '100%',
    border: '1px solid black',
    marginBottom: 8,
  },
   signatureTableB: {
    width: '100%',
    border: '1px solid black',
    marginBottom: 8,
  },
  signatureRow: {
    flexDirection: 'row',
    height: 180,
  },
  signatureRowB: {
    flexDirection: 'row',
    height: 120,
  },
  signatureCell: {
    flex: 1,
    border: '1px solid black',
    padding: 12,
    justifyContent: 'space-between',
  },
  italic: {
    fontStyle: 'italic',
    marginBottom: 8,
    fontSize: 11, // Augmenté de 9 à 11
    lineHeight: 1.4, // Augmenté de 1.3 à 1.4
  },
  footer: {
    marginTop: 10,
    fontSize: 10, // Augmenté de 8 à 10
    lineHeight: 1.3, // Augmenté de 1.2 à 1.3
  },
  boldText: {
    fontWeight: 'bold',
  },
  confidentialityTitle: {
    fontSize: 18, // Augmenté de 16 à 18
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    marginTop: 10,
  },
  articleHeader: {
   backgroundColor: '#224d62',
    color: 'white',
    textAlign: 'center',
    padding: 5,
    fontSize: 15, // Augmenté de 13 à 15
    fontWeight: 'bold',
  },
  articleText: {
    marginBottom: 8,
    fontSize: 11, // Augmenté de 9 à 11
    lineHeight: 1.4, // Augmenté de 1.3 à 1.4
  },
  redText: {
    color: '#ba0c2f',
  },
  contractSignatureDate: {
    marginTop: 15,
    marginBottom: 10,
    fontSize: 12, // Augmenté de 10 à 12
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
    if (request.identity?.photoURL) return request.identity.photoURL
    if (request.identity?.photoPath) return request.identity.photoPath
    if (typeof request.identity?.photo === 'string' && request.identity.photo.startsWith('http')) {
      return request.identity.photo
    }
    if (request.documents?.documentPhotoFrontURL) return request.documents.documentPhotoFrontURL
    if (request.documents?.documentPhotoFrontPath) return request.documents.documentPhotoFrontPath
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
                  fontSize: 9, // Augmenté de 7 à 9
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
                <Text><Text style={styles.boldText}>Nationalité:</Text> {getNationalityName(request.identity?.nationality)}</Text>
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
                {/* test*/}

                <View style={styles.rectangleRow}>
                  <View ></View>
                </View>
                <View style={styles.rectangleRow}>
                  <View ></View>
                </View>
                <View style={styles.rectangleRow}>
                  <View ></View>
                </View>

                {/* fin test */}
            
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
                 {/* test*/}

                <View style={styles.rectangleRow}>
                  <View ></View>
                </View>
                <View style={styles.rectangleRow}>
                  <View ></View>
                </View>
                <View style={styles.rectangleRow}>
                  <View ></View>
                </View>

                {/* fin test */}
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
              <Text style={{ fontSize: 11 }}>Signature de l'adhérent suivi de la mention "lu et approuvé"</Text>
              <Text style={{ fontSize: 11 }}>Date : ................../...................../..................</Text>
            </View>
            <View style={styles.signatureCell}>
              <Text style={{ fontSize: 11 ,textAlign:'center'}}>Signature et cachet du Secrétariat Exécutif</Text>
              <Text style={{ fontSize: 11 }}>Date : ................../...................../..................</Text>
            </View>
          </View>
        </View>

        {/* Texte d'engagement */}
        <Text style={styles.italic}>
          J'adhère contractuellement à l'Association LE KARA conformément aux dispositions y afférentes,
          je m'engage à respecter l'intégralité des dispositions Règlementaires qui la structurent
          et pour lesquelles je confirme avoir pris connaissance avant d'apposer ma signature.
        </Text>

        {/* Pied de page */}
        <View style={styles.footer}>
          <Text>L'ASSOCIATION LE KARA. <Text style={styles.boldText}>Intégrité - Solidarité - Dynamisme</Text></Text>
          <Text>Siège : Awougou, Owendo</Text>
          <Text>R.D N°: 0650 /MIS/SG/DGELP/DPPALC/KMOG-</Text>
          <Text>Tél : 066-95-13-14 / 074-36-97-29</Text>
          <Text>E-mail :</Text>
        </View>
      </Page>

      {/* Page 2 - Contrat de Confidentialité */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.confidentialityTitle}>CONTRAT DE CONFIDENTIALITÉ</Text>

        <View style={styles.stripedTable}>
          <View style={styles.stripedRow}>
            <Text >Entre L'ASSOCIATION LE KARA</Text>
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
        <Text style={styles.articleText}> </Text>
        <Text style={styles.articleText}>
          Il est préalablement établi l'obligation de réserve d'un membre de KARA
          exerçant ou pas une fonction au sein du bureau et le respect des différents codes
          qui s'imposent à son statut.
        </Text>

        <Text style={styles.articleHeader}>Article 2</Text>
         <Text style={styles.articleText}> </Text>
        <Text style={styles.articleText}>
          Le bénéficiaire des informations reconnaît que tous les droits relatifs à l'information
          obtenue existent et ne peuvent être divulgué et communiquer que par le donneur.
        </Text>

        <Text style={styles.articleHeader}>Article 3</Text>
         <Text style={styles.articleText}> </Text>
        <Text style={styles.articleText}>
          Le bénéficiaire accepte les conditions de confidentialité des informations reçues
          et s'engage à les respecter.
        </Text>

        <Text style={styles.articleHeader}>Article 4</Text>
         <Text style={styles.articleText}> </Text>
        <Text style={styles.articleText}>
          Cet engagement dans l'hypothèse d'une vulgarisation d'informations avérées ou à des fins
          diffamatoires faites par le receveur est passible d'une sanction pénale et vaut radiation
          de KARA.
        </Text>

        <Text style={styles.articleHeader}>Article 5</Text>
         <Text style={styles.articleText}> </Text>
        <Text style={[styles.articleText, styles.redText]}>
          Il est interdit à tout bénéficiaire des services de l'Association LE KARA de contracter un service
          supplémentaire qui ne lui est pas accessible par un prête-nom ou toute autre personne qui
          accepterait une telle manœuvre. Le coupable perdra son Épargne en cours, s'exposera à la
          radiation au sein de KARA et s'exposera aux poursuites judiciaires.
        </Text>

        <Text style={styles.contractSignatureDate}>
          Fait à …………………................... le ……......./……...... …./..……......…
        </Text>

        {/* Table des signatures pour le contrat */}
        <View style={styles.signatureTableB}>
          <View style={styles.signatureRowB}>
            <View style={styles.signatureCell}>
              <Text style={{ fontSize: 11 }}>Signature du BÉNÉFICIAIRE suivi de la mention "lu et approuvé"</Text>
            </View>
            <View style={styles.signatureCell}>
              <Text style={{ fontSize: 11 ,textAlign:'center'}}>Signature du SECRÉTAIRE EXÉCUTIF</Text>
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
  const isMobile = useIsMobile()

  const handleDownloadPDF = async () => {
    setIsExporting(true)

    try {
      const blob = await pdf(<MutuelleKaraPDF request={request} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      // Nouveau format: Adhesion_MK_prenom nom_YYYY-MM-DD
      const firstName = (request.identity.firstName || '').trim()
      const lastName = (request.identity.lastName || '').trim()
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Membre'
      const today = new Date().toISOString().split('T')[0]
      link.download = `Adhesion_MK_${fullName}_${today}.pdf`
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
      <DialogContent className="!w-[95vw] !max-w-[1400px] max-h-[95vh] lg:max-h-[95vh] overflow-y-auto lg:overflow-hidden bg-gradient-to-br from-white to-gray-50 border-0 shadow-2xl">
        {/* Header - responsive uniquement pour mobile */}
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 lg:pb-6 border-b border-gray-200">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="p-2 lg:p-3 rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg flex-shrink-0">
                <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
                  📋 Fiche d'Adhésion Contractuelle
                </DialogTitle>
                <p className="text-sm lg:text-base text-gray-600 truncate">
                  {request.identity.firstName} {request.identity.lastName}
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="mr-2 lg:mr-10 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-10 px-4 lg:h-12 lg:px-6 flex-shrink-0"
          >
            {isExporting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden lg:inline">Génération...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                <span className="hidden lg:inline">Télécharger PDF</span>
              </div>
            )}
          </Button>
        </DialogHeader>

        {/* Contenu principal - desktop inchangé, mobile optimisé */}
        <div className="flex-1 h-[calc(95vh-120px)] lg:h-[calc(95vh-150px)] overflow-hidden">
          {/* Version mobile uniquement */}
          <div className="lg:hidden h-full">
            <Card className="h-full bg-gradient-to-br from-white via-gray-50/30 to-white border-0 shadow-lg">
              <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center space-y-4">
                {/* Icône et titre mobile */}
                <div className="space-y-3">
                  <div className="mx-auto w-14 h-14 bg-gradient-to-br from-[#234D65] to-[#2c5a73] rounded-full flex items-center justify-center shadow-lg">
                    <Smartphone className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      Prévisualisation mobile
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Le PDF est prêt ! Ouvrez-le dans votre navigateur ou téléchargez-le.
                    </p>
                  </div>
                </div>

                {/* Informations du document mobile */}
                <div className="bg-gray-50 rounded-lg p-3 w-full space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Document:</span>
                    <span className="font-medium text-gray-900">Fiche d'adhésion</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Membre:</span>
                    <span className="font-medium text-gray-900 truncate max-w-[140px]">
                      {request.identity.firstName} {request.identity.lastName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Pages:</span>
                    <span className="font-medium text-gray-900">2 pages</span>
                  </div>
                </div>

                {/* Boutons d'action mobile */}
                <BlobProvider document={<MutuelleKaraPDF request={request} />}>
                  {({ url, loading }) => (
                    <div className="w-full space-y-2">
                      <Button
                        asChild
                        disabled={loading || !url}
                        className="w-full h-11 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <a href={url ?? '#'} target="_blank" rel="noopener noreferrer">
                          <Eye className="w-4 h-4 mr-2" />
                          Ouvrir dans le navigateur
                        </a>
                      </Button>
                      
                      <Button
                        onClick={handleDownloadPDF}
                        disabled={isExporting || loading}
                        variant="outline"
                        className="w-full h-11 border-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white transition-all duration-300"
                      >
                        {isExporting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Téléchargement...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger PDF
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </BlobProvider>

                {/* Aide mobile */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 w-full">
                  <div className="flex items-start gap-2">
                    <Monitor className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      <strong>Astuce:</strong> Pour une meilleure expérience de visualisation, 
                      utilisez un ordinateur ou une tablette.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Version desktop - INCHANGÉE */}
          <div className="hidden lg:block h-full rounded-xl overflow-hidden shadow-inner bg-white border">
            <PDFViewer style={{ 
              width: '100%', 
              height: '100%',
              border: 'none',
              borderRadius: '0.75rem'
            }}>
              <MutuelleKaraPDF request={request} />
            </PDFViewer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MemberDetailsModal