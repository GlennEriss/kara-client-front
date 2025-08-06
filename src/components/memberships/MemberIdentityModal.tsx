'use client'
import React, { useState } from 'react'
import { Download, FileText, Calendar, MapPin, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { MembershipRequest } from '@/types/types'
import { PDFViewer, Document, Page, Text, View, StyleSheet, pdf, Image as PDFImage } from '@react-pdf/renderer'
import { toast } from 'sonner'

// Styles pour le document PDF d'identité
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
    marginBottom: 30,
    borderBottom: '2px solid #224d62',
    paddingBottom: 15,
  },
  logo: {
    width: 60,
    height: 60,
  },
  headerText: {
    flex: 1,
    marginLeft: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#224d62',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  headerInfo: {
    textAlign: 'right',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#224d62',
    marginBottom: 15,
    borderBottom: '1px solid #224d62',
    paddingBottom: 5,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  infoItem: {
    width: '50%',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 12,
    color: '#000',
  },
  documentCard: {
    border: '1px solid #ddd',
    borderRadius: 5,
    padding: 15,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#224d62',
    marginBottom: 10,
  },
  documentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  documentLabel: {
    fontSize: 11,
    color: '#666',
    width: '40%',
  },
  documentValue: {
    fontSize: 11,
    color: '#000',
    width: '60%',
  },
  photoSection: {
    marginTop: 20,
  },
  photoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoCard: {
    width: '48%',
    border: '1px solid #ddd',
    borderRadius: 5,
    padding: 10,
  },
  photoTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#224d62',
    marginBottom: 10,
    textAlign: 'center',
  },
  photoPlaceholder: {
    width: '100%',
    height: 120,
    border: '2px dashed #ccc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  statusSection: {
    backgroundColor: '#e8f4f8',
    border: '1px solid #b3d9e6',
    borderRadius: 5,
    padding: 15,
    marginTop: 20,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#224d62',
    marginBottom: 10,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  statusCheck: {
    fontSize: 12,
    color: '#28a745',
    marginRight: 8,
  },
  statusText: {
    fontSize: 11,
    color: '#666',
  },
  footer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: 5,
  },
  footerText: {
    fontSize: 9,
    color: '#856404',
    textAlign: 'center',
    lineHeight: 1.3,
  },
})

// Composant principal du document PDF d'identité
const IdentityDocumentPDF = ({ request }: { request: MembershipRequest }) => {
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
        month: 'long',
        day: 'numeric'
      }).format(dateObj)
    } catch (error) {
      return 'Date invalide'
    }
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* En-tête */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <PDFImage 
              src="/Logo-Kara.webp" 
              style={{ width: 60, height: 60 }}
              cache={false}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>PIÈCE D'IDENTITÉ</Text>
            <Text style={styles.subtitle}>Vérification des Documents d'Identité</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.subtitle}>Date: {formatDate(new Date())}</Text>
            <Text style={styles.subtitle}>Dossier: {request.id}</Text>
          </View>
        </View>

        {/* Informations du demandeur */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations du Demandeur</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Nom complet</Text>
              <Text style={styles.infoValue}>
                {request.identity.firstName} {request.identity.lastName}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Date de naissance</Text>
              <Text style={styles.infoValue}>{formatDate(request.identity.birthDate)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Lieu de naissance</Text>
              <Text style={styles.infoValue}>{request.identity.birthPlace}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Nationalité</Text>
              <Text style={styles.infoValue}>{request.identity.nationality}</Text>
            </View>
          </View>
        </View>

        {/* Informations du document */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations du Document d'Identité</Text>
          <View style={styles.documentCard}>
            <Text style={styles.documentTitle}>{request.documents.identityDocument}</Text>
            <View style={styles.documentInfo}>
              <Text style={styles.documentLabel}>Numéro:</Text>
              <Text style={styles.documentValue}>{request.documents.identityDocumentNumber}</Text>
            </View>
            <View style={styles.documentInfo}>
              <Text style={styles.documentLabel}>Date d'émission:</Text>
              <Text style={styles.documentValue}>{formatDate(request.documents.issuingDate)}</Text>
            </View>
            <View style={styles.documentInfo}>
              <Text style={styles.documentLabel}>Date d'expiration:</Text>
              <Text style={styles.documentValue}>{formatDate(request.documents.expirationDate)}</Text>
            </View>
            <View style={styles.documentInfo}>
              <Text style={styles.documentLabel}>Lieu d'émission:</Text>
              <Text style={styles.documentValue}>{request.documents.issuingPlace}</Text>
            </View>
          </View>
        </View>

        {/* Photos du document */}
        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>Photos du Document</Text>
          <View style={styles.photoGrid}>
            <View style={styles.photoCard}>
              <Text style={styles.photoTitle}>Recto du Document</Text>
              <View style={styles.photoPlaceholder}>
                <Text style={{ fontSize: 10, color: '#999', textAlign: 'center' }}>
                  {request.documents.documentPhotoFrontURL ? 'Photo disponible' : 'Aucune photo'}
                </Text>
              </View>
            </View>
            <View style={styles.photoCard}>
              <Text style={styles.photoTitle}>Verso du Document</Text>
              <View style={styles.photoPlaceholder}>
                <Text style={{ fontSize: 10, color: '#999', textAlign: 'center' }}>
                  {request.documents.documentPhotoBackURL ? 'Photo disponible' : 'Aucune photo'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Statut de vérification */}
        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>Statut de Vérification</Text>
          <View style={styles.statusItem}>
            <Text style={styles.statusCheck}>✓</Text>
            <Text style={styles.statusText}>Document d'identité requis</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusCheck}>
              {request.documents.documentPhotoFrontURL ? '✓' : '⚠'}
            </Text>
            <Text style={styles.statusText}>Photos lisibles</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusCheck}>✓</Text>
            <Text style={styles.statusText}>Informations cohérentes</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusCheck}>⏳</Text>
            <Text style={styles.statusText}>En attente de validation</Text>
          </View>
        </View>

        {/* Note de confidentialité */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            <Text style={{ fontWeight: 'bold' }}>Note de confidentialité :</Text> 
            Ces informations sont strictement confidentielles et ne doivent être consultées 
            que par le personnel autorisé de KARA dans le cadre du processus d'adhésion. 
            Toute divulgation non autorisée est strictement interdite.
          </Text>
        </View>
      </Page>
    </Document>
  )
}

interface MemberIdentityModalProps {
  isOpen: boolean
  onClose: () => void
  request: MembershipRequest
}

const MemberIdentityModal: React.FC<MemberIdentityModalProps> = ({ 
  isOpen, 
  onClose, 
  request 
}) => {
  const [isExporting, setIsExporting] = useState(false)

  // Fonction pour télécharger le PDF
  const handleDownloadPDF = async () => {
    setIsExporting(true)
    
    try {
      toast.loading('📄 Génération du PDF en cours...', {
        id: 'pdf-export-identity',
        duration: 10000,
      })

      const blob = await pdf(<IdentityDocumentPDF request={request} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Documents_Identite_${request.identity.lastName}_${request.identity.firstName}_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      toast.success(' PDF généré avec succès !', {
        id: 'pdf-export-identity',
        description: `Fichier téléchargé : Documents_Identite_${request.identity.lastName}_${request.identity.firstName}_${new Date().toISOString().split('T')[0]}.pdf`,
        duration: 4000,
      })

    } catch (error: any) {
      console.error('Erreur lors du téléchargement du PDF:', error)
      
      toast.error('❌ Erreur lors de la génération du PDF', {
        id: 'pdf-export-identity',
        description: 'Une erreur technique est survenue. Veuillez réessayer.',
        duration: 5000,
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[95vw] !max-w-[1400px] max-h-[95vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="text-xl font-semibold text-[#224D62]">
            Prévisualisation - Pièce d'Identité
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
            <IdentityDocumentPDF request={request} />
          </PDFViewer>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MemberIdentityModal