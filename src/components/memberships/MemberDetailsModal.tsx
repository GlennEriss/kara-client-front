'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { getNationalityName } from '@/constantes/nationality'
import type { MembershipRequest } from '@/types/types'
import { BlobProvider, Document, Image, PDFViewer, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer'
import { Download, Eye, FileText, Loader2, Monitor, PenLine, RotateCcw, Smartphone } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

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
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  rectangle: {
    width: 15,
    height: 15,
    border: '1px solid black',
    marginRight: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rectangleChecked: {
    backgroundColor: '#111',
  },
  rectangleFill: {
    width: 11,
    height: 11,
    backgroundColor: '#111',
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
    marginBottom: 0,
  },
  signatureRow: {
    flexDirection: 'row',
    height: 180,
  },
  signatureRowB: {
    flexDirection: 'row',
    height: 86,
  },
  signatureCell: {
    flex: 1,
    border: '1px solid black',
    padding: 12,
    justifyContent: 'space-between',
  },
  signatureImageLarge: {
    width: 150,
    height: 56,
    objectFit: 'contain',
    alignSelf: 'center',
  },
  signaturePlaceholderLarge: {
    width: 150,
    height: 56,
    alignSelf: 'center',
  },
  signatureImageSmall: {
    width: 130,
    height: 40,
    objectFit: 'contain',
    alignSelf: 'center',
  },
  signaturePlaceholderSmall: {
    width: 130,
    height: 40,
    alignSelf: 'center',
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
    marginTop: 10,
    marginBottom: 6,
    fontSize: 12, // Augmenté de 10 à 12
  },
  pageNumber: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    color: '#111827',
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

const PAYMENT_MODE_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'X'] as const
type PaymentModeOption = typeof PAYMENT_MODE_OPTIONS[number]

type MembershipQualityOption = 'adherent' | 'sympathisant' | 'bienfaiteur'

interface AdhesionPdfFillData {
  paymentMode: PaymentModeOption | null
  quality: MembershipQualityOption | null
  headerPhotoDataUrl: string | null
  page1MemberDate: string
  page1SecretaryDate: string
  article5Date: string
  article5Location: string
  page1MemberSignature: string | null
  page1SecretarySignature: string | null
  article5BeneficiarySignature: string | null
  article5SecretarySignature: string | null
}

const qualityLabels: Record<MembershipQualityOption, string> = {
  adherent: 'Membre Adhérent',
  sympathisant: 'Membre Sympathisant',
  bienfaiteur: 'Membre Bienfaiteur',
}

const formatDateForPdf = (value: string): string => {
  if (!value) return '........../........../..........'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

const SignaturePad = ({
  title,
  value,
  onChange,
}: {
  title: string
  value: string | null
  onChange: (value: string | null) => void
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const setupCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    canvas.width = Math.floor(rect.width * ratio)
    canvas.height = Math.floor(rect.height * ratio)

    const context = canvas.getContext('2d')
    if (!context) return null
    context.scale(ratio, ratio)
    context.lineWidth = 2
    context.lineCap = 'round'
    context.strokeStyle = '#1f2937'
    return context
  }

  useEffect(() => {
    const context = setupCanvas()
    if (!context) return

    // Ligne de base de signature
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    context.strokeStyle = '#d1d5db'
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(12, rect.height - 18)
    context.lineTo(rect.width - 12, rect.height - 18)
    context.stroke()
    context.strokeStyle = '#1f2937'
    context.lineWidth = 2

    if (value) {
      const image = new window.Image()
      image.onload = () => {
        context.drawImage(image, 0, 0, rect.width, rect.height)
      }
      image.src = value
    }
  }, [value])

  const getCanvasPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      rect,
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    const position = getCanvasPosition(event)
    if (!canvas || !context || !position) return

    canvas.setPointerCapture(event.pointerId)
    setIsDrawing(true)
    context.beginPath()
    context.moveTo(position.x, position.y)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const context = canvasRef.current?.getContext('2d')
    const position = getCanvasPosition(event)
    if (!context || !position) return
    context.lineTo(position.x, position.y)
    context.stroke()
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !isDrawing) return
    canvas.releasePointerCapture(event.pointerId)
    setIsDrawing(false)
    onChange(canvas.toDataURL('image/png'))
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const rect = canvas.getBoundingClientRect()
    context.clearRect(0, 0, rect.width, rect.height)
    context.strokeStyle = '#d1d5db'
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(12, rect.height - 18)
    context.lineTo(rect.width - 12, rect.height - 18)
    context.stroke()
    context.strokeStyle = '#1f2937'
    context.lineWidth = 2
    onChange(null)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-kara-primary-dark">{title}</p>
        <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={handleClear}>
          <RotateCcw className="mr-1 h-3 w-3" />
          Effacer
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        className="h-24 w-full cursor-crosshair rounded-md border border-dashed border-gray-300 bg-white touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  )
}

/**
 * Formate les contacts par paires pour l'affichage
 * - 2 numéros : num1/num2 sur une ligne
 * - 3 numéros : num1/num2 sur une ligne, num3 en dessous
 * - 4 numéros : num1/num2 sur une ligne, num3/num4 en dessous
 */
const formatContactsByPairs = (contacts: string[]): string[] => {
  if (!contacts || contacts.length === 0) return []
  
  const pairs: string[] = []
  for (let i = 0; i < contacts.length; i += 2) {
    if (i + 1 < contacts.length) {
      // Paire complète : num1/num2
      pairs.push(`${contacts[i]}/${contacts[i + 1]}`)
    } else {
      // Numéro seul (impair) : num3
      pairs.push(contacts[i])
    }
  }
  return pairs
}

// Composant principal du document PDF
const MutuelleKaraPDF = ({
  request,
  fillData,
}: {
  request: MembershipRequest
  fillData: AdhesionPdfFillData
}) => {
  const getPhotoURL = () => {
    if (fillData.headerPhotoDataUrl) return fillData.headerPhotoDataUrl
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
    } catch {
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

  const isQualityChecked = (quality: MembershipQualityOption) => fillData.quality === quality
  const isModeChecked = (mode: PaymentModeOption) => fillData.paymentMode === mode

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
          <Checkbox checked={isQualityChecked('adherent')} label="Membre Adhérent" />
          <Checkbox checked={isQualityChecked('sympathisant')} label="Membre Sympathisant" />
          <Checkbox checked={isQualityChecked('bienfaiteur')} label="Membre Bienfaiteur" />
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
                <View style={{ flexDirection: 'row' }}>
                  <Text style={styles.boldText}>Téléphone: </Text>
                  <View style={{ flexDirection: 'column' }}>
                    {(request.identity.contacts && request.identity.contacts.length > 0) ? (
                      formatContactsByPairs(request.identity.contacts).map((formattedContact: string, index: number) => (
                        <Text key={index}>{formattedContact}</Text>
                      ))
                    ) : (
                      <Text>-</Text>
                    )}
                  </View>
                </View>
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
                  <View style={styles.rectangle}>
                    {isModeChecked('A') ? <View style={styles.rectangleFill} /> : null}
                  </View>
                  <Text>A</Text>
                </View>
                <View style={styles.rectangleRow}>
                  <View style={styles.rectangle}>
                    {isModeChecked('B') ? <View style={styles.rectangleFill} /> : null}
                  </View>
                  <Text>B</Text>
                </View>
              </View>
              <View style={styles.modeReglementCell}>
                <View style={styles.rectangleRow}>
                  <View style={styles.rectangle}>
                    {isModeChecked('C') ? <View style={styles.rectangleFill} /> : null}
                  </View>
                  <Text>C</Text>
                </View>
                <View style={styles.rectangleRow}>
                  <View style={styles.rectangle}>
                    {isModeChecked('D') ? <View style={styles.rectangleFill} /> : null}
                  </View>
                  <Text>D</Text>
                </View>
              </View>
              <View style={styles.modeReglementCellLast}>
                <View style={styles.rectangleRow}>
                  <View style={styles.rectangle}>
                    {isModeChecked('E') ? <View style={styles.rectangleFill} /> : null}
                  </View>
                  <Text>E</Text>
                </View>
                <View style={styles.rectangleRow}>
                  <View style={styles.rectangle}>
                    {isModeChecked('X') ? <View style={styles.rectangleFill} /> : null}
                  </View>
                  <Text>X</Text>
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
              {fillData.page1MemberSignature ? (
                <Image src={fillData.page1MemberSignature} style={styles.signatureImageLarge} cache={false} />
              ) : (
                <View style={styles.signaturePlaceholderLarge} />
              )}
              <Text style={{ fontSize: 11 }}>Date : {formatDateForPdf(fillData.page1MemberDate)}</Text>
            </View>
            <View style={styles.signatureCell}>
              <Text style={{ fontSize: 11, textAlign: 'center' }}>Signature et cachet du Secrétariat Exécutif</Text>
              {fillData.page1SecretarySignature ? (
                <Image src={fillData.page1SecretarySignature} style={styles.signatureImageLarge} cache={false} />
              ) : (
                <View style={styles.signaturePlaceholderLarge} />
              )}
              <Text style={{ fontSize: 11 }}>Date : {formatDateForPdf(fillData.page1SecretaryDate)}</Text>
            </View>
          </View>
        </View>

        {/* Texte d'engagement */}
        <Text style={styles.italic}>
          J'adhère contractuellement à l'Association LE KARA conformément aux dispositions y afférentes,{' '}
          <Text style={styles.boldText}>
            je m'engage à respecter l'intégralité des dispositions règlementaires et statuaires qui la structurent
            et pour lesquelles je confirme avoir pris connaissance avant d'apposer ma signature.
          </Text>
        </Text>

        {/* Pied de page */}
        <View style={styles.footer}>
          <Text>L'ASSOCIATION LE KARA. <Text style={styles.boldText}>Intégrité - Solidarité - Dynamisme</Text></Text>
          <Text>Siège : Awougou, Owendo</Text>
          <Text>R.D N°: 0650 /MIS/SG/DGELP/DPPALC/KMOG-</Text>
          <Text>Tél : 066-95-13-14 / 074-36-97-29</Text>
          <Text>E-mail :</Text>
        </View>

        <Text fixed style={styles.pageNumber}>Page 1 / 2</Text>
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
              <Checkbox checked={isQualityChecked('adherent')} label="Membre Adhérent" />
              <Checkbox checked={isQualityChecked('sympathisant')} label="Membre Sympathisant" />
              <Checkbox checked={isQualityChecked('bienfaiteur')} label="Membre Bienfaiteur" />
            </View>
          </View>
          <View style={styles.stripedRowEven}>
            <View style={{ flexDirection: 'column' }}>
              {(request.identity.contacts && request.identity.contacts.length > 0) ? (
                formatContactsByPairs(request.identity.contacts).map((formattedContact: string, index: number) => (
                  <Text key={index}>N° de téléphone : {formattedContact}</Text>
                ))
              ) : (
                <Text>N° de téléphone : Non renseigné</Text>
              )}
            </View>
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
          Fait à {fillData.article5Location || '..............................'} le {formatDateForPdf(fillData.article5Date)}
        </Text>

        {/* Table des signatures pour le contrat */}
        <View style={styles.signatureTableB}>
          <View style={styles.signatureRowB}>
            <View style={styles.signatureCell}>
              <Text style={{ fontSize: 11 }}>Signature du BÉNÉFICIAIRE suivi de la mention "lu et approuvé"</Text>
              {fillData.article5BeneficiarySignature ? (
                <Image src={fillData.article5BeneficiarySignature} style={styles.signatureImageSmall} cache={false} />
              ) : (
                <View style={styles.signaturePlaceholderSmall} />
              )}
            </View>
            <View style={styles.signatureCell}>
              <Text style={{ fontSize: 11, textAlign: 'center' }}>Signature du SECRÉTAIRE EXÉCUTIF</Text>
              {fillData.article5SecretarySignature ? (
                <Image src={fillData.article5SecretarySignature} style={styles.signatureImageSmall} cache={false} />
              ) : (
                <View style={styles.signaturePlaceholderSmall} />
              )}
            </View>
          </View>
        </View>

        <Text fixed style={styles.pageNumber}>Page 2 / 2</Text>
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
  const [fillData, setFillData] = useState<AdhesionPdfFillData>({
    paymentMode: null,
    quality: null,
    headerPhotoDataUrl: null,
    page1MemberDate: '',
    page1SecretaryDate: '',
    article5Date: '',
    article5Location: '',
    page1MemberSignature: null,
    page1SecretarySignature: null,
    article5BeneficiarySignature: null,
    article5SecretarySignature: null,
  })
  const [previewFillData, setPreviewFillData] = useState<AdhesionPdfFillData>(fillData)
  const [isPreviewRefreshing, setIsPreviewRefreshing] = useState(false)
  const skipDebouncePreviewRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return

    const today = new Date().toISOString().split('T')[0]
    const initialData: AdhesionPdfFillData = {
      paymentMode: null,
      quality: null,
      headerPhotoDataUrl: null,
      page1MemberDate: today,
      page1SecretaryDate: today,
      article5Date: today,
      article5Location: request.address?.city || request.address?.province || '',
      page1MemberSignature: null,
      page1SecretarySignature: null,
      article5BeneficiarySignature: null,
      article5SecretarySignature: null,
    }

    setFillData(initialData)
    setPreviewFillData(initialData)
    setIsPreviewRefreshing(false)
  }, [isOpen, request.id, request.address?.city, request.address?.province])

  useEffect(() => {
    if (!isOpen) return
    if (skipDebouncePreviewRef.current) {
      skipDebouncePreviewRef.current = false
      setPreviewFillData(fillData)
      setIsPreviewRefreshing(false)
      return
    }
    setIsPreviewRefreshing(true)
    const timer = window.setTimeout(() => {
      setPreviewFillData(fillData)
      setIsPreviewRefreshing(false)
    }, 180)

    return () => window.clearTimeout(timer)
  }, [fillData, isOpen])

  // Vérifier si un PDF uploadé existe (pour les demandes approuvées)
  const hasUploadedPdf = request.adhesionPdfURL && request.status === 'approved'

  const pdfDocument = useMemo(
    () => <MutuelleKaraPDF request={request} fillData={previewFillData} />,
    [request, previewFillData]
  )

  const convertImageToPdfDataUrl = async (file: File): Promise<string> => {
    const objectUrl = URL.createObjectURL(file)

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new window.Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Impossible de charger l’image'))
        img.src = objectUrl
      })

      const maxDimension = 700
      const ratio = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
      const targetWidth = Math.max(1, Math.round(image.naturalWidth * ratio))
      const targetHeight = Math.max(1, Math.round(image.naturalHeight * ratio))

      const canvas = document.createElement('canvas')
      canvas.width = targetWidth
      canvas.height = targetHeight
      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('Impossible de préparer le canvas image')
      }

      context.drawImage(image, 0, 0, targetWidth, targetHeight)
      return canvas.toDataURL('image/jpeg', 0.9)
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }

  const handleHeaderPhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image (JPG, PNG, WEBP)')
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image trop volumineuse (max 8MB)')
      return
    }

    try {
      const dataUrl = await convertImageToPdfDataUrl(file)
      skipDebouncePreviewRef.current = true
      setFillData((prev) => ({ ...prev, headerPhotoDataUrl: dataUrl }))
      toast.success('Photo ajoutée dans le cadrant')
    } catch (error) {
      console.error(error)
      toast.error('Impossible de charger cette photo')
    } finally {
      // Permet de recharger le même fichier si besoin
      event.target.value = ''
    }
  }

  const handleDownloadPDF = async () => {
    setIsExporting(true)

    try {
      // Toujours télécharger la version générée actuelle (avec pagination)
      const blob = await pdf(<MutuelleKaraPDF request={request} fillData={fillData} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      // Nouveau format: firstname lastname_ADHESION_MK_YYYY.pdf
      const firstName = (request.identity.firstName || '').trim()
      const lastName = (request.identity.lastName || '').trim()
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Membre'
      const fullNameUpper = fullName.toUpperCase()
      const year = new Date().getFullYear()
      link.download = `${fullNameUpper}_ADHESION_MK_${year}.pdf`
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
        description: 'Une erreur est survenue lors du téléchargement du PDF. Veuillez réessayer.',
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
          <div className="mr-2 lg:mr-10 flex items-center gap-2 flex-shrink-0">
            {hasUploadedPdf && request.adhesionPdfURL && (
              <Button
                asChild
                variant="outline"
                className="h-10 px-3 lg:h-12 lg:px-4 border-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white transition-all duration-300"
              >
                <a href={request.adhesionPdfURL} target="_blank" rel="noopener noreferrer">
                  <Eye className="w-4 h-4 mr-0 lg:mr-2" />
                  <span className="hidden lg:inline">Fiche d&apos;adhésion téléversée</span>
                </a>
              </Button>
            )}

            <Button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-10 px-4 lg:h-12 lg:px-6"
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
          </div>
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
                <BlobProvider document={pdfDocument}>
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

                      {hasUploadedPdf && request.adhesionPdfURL && (
                        <Button
                          asChild
                          variant="outline"
                          className="w-full h-11 border-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white transition-all duration-300"
                        >
                          <a href={request.adhesionPdfURL} target="_blank" rel="noopener noreferrer">
                            <Eye className="w-4 h-4 mr-2" />
                            Voir la fiche téléversée
                          </a>
                        </Button>
                      )}
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

          {/* Version desktop */}
          <div className="hidden lg:flex h-full gap-4">
            <Card className="w-[420px] h-full overflow-y-auto border border-gray-200 shadow-sm">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <PenLine className="w-4 h-4 text-kara-primary-dark" />
                  <h3 className="text-sm font-bold text-kara-primary-dark">Remplissage du PDF</h3>
                </div>
                {isPreviewRefreshing ? (
                  <p className="text-[11px] text-kara-primary-dark/70">Aperçu PDF en mise à jour...</p>
                ) : null}

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-kara-primary-dark">Mode de règlement (cliquez pour cocher)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_MODE_OPTIONS.map((mode) => (
                      <Button
                        key={mode}
                        type="button"
                        variant={fillData.paymentMode === mode ? 'default' : 'outline'}
                        onClick={() => {
                          skipDebouncePreviewRef.current = true
                          setFillData((prev) => ({
                            ...prev,
                            paymentMode: prev.paymentMode === mode ? null : mode,
                          }))
                        }}
                        className={
                          fillData.paymentMode === mode
                            ? 'bg-kara-primary-dark hover:bg-kara-primary-dark/90'
                            : 'border-kara-primary-dark/30 text-kara-primary-dark hover:bg-kara-primary-dark hover:text-white'
                        }
                      >
                        {mode}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-kara-primary-dark">Qualité (cliquez pour cocher)</p>
                  <div className="space-y-2">
                    {(Object.keys(qualityLabels) as MembershipQualityOption[]).map((quality) => (
                      <button
                        key={quality}
                        type="button"
                        onClick={() => {
                          skipDebouncePreviewRef.current = true
                          setFillData((prev) => ({
                            ...prev,
                            quality: prev.quality === quality ? null : quality,
                          }))
                        }}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                          fillData.quality === quality
                            ? 'border-kara-primary-dark bg-kara-primary-dark/10 text-kara-primary-dark font-semibold'
                            : 'border-gray-200 hover:border-kara-primary-dark/40'
                        }`}
                      >
                        {qualityLabels[quality]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-kara-primary-dark">Dates et lieu</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <p className="text-[11px] text-gray-600">Date signature adhérent</p>
                      <Input
                        type="date"
                        value={fillData.page1MemberDate}
                        onChange={(event) =>
                          setFillData((prev) => ({ ...prev, page1MemberDate: event.target.value }))
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-gray-600">Date signature secrétariat</p>
                      <Input
                        type="date"
                        value={fillData.page1SecretaryDate}
                        onChange={(event) =>
                          setFillData((prev) => ({ ...prev, page1SecretaryDate: event.target.value }))
                        }
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <p className="text-[11px] text-gray-600">Lieu (Article 5)</p>
                      <Input
                        type="text"
                        value={fillData.article5Location}
                        placeholder="Libreville"
                        onChange={(event) =>
                          setFillData((prev) => ({ ...prev, article5Location: event.target.value }))
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-gray-600">Date (Article 5)</p>
                      <Input
                        type="date"
                        value={fillData.article5Date}
                        onChange={(event) =>
                          setFillData((prev) => ({ ...prev, article5Date: event.target.value }))
                        }
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-kara-primary-dark">Photo du cadrant (en haut à droite)</p>
                  <Input type="file" accept="image/*" onChange={handleHeaderPhotoChange} className="h-10 text-xs" />
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 overflow-hidden rounded-md border border-gray-300 bg-gray-50">
                      {fillData.headerPhotoDataUrl ? (
                        <img
                          src={fillData.headerPhotoDataUrl}
                          alt="Prévisualisation cadrant"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-500">
                          Vide
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!fillData.headerPhotoDataUrl}
                      onClick={() => {
                        skipDebouncePreviewRef.current = true
                        setFillData((prev) => ({ ...prev, headerPhotoDataUrl: null }))
                      }}
                    >
                      Retirer la photo
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-kara-primary-dark">Signatures numériques</p>
                  <SignaturePad
                    title="Signature adhérent (page 1)"
                    value={fillData.page1MemberSignature}
                    onChange={(value) => setFillData((prev) => ({ ...prev, page1MemberSignature: value }))}
                  />
                  <SignaturePad
                    title="Signature secrétariat (page 1)"
                    value={fillData.page1SecretarySignature}
                    onChange={(value) => setFillData((prev) => ({ ...prev, page1SecretarySignature: value }))}
                  />
                  <SignaturePad
                    title="Signature bénéficiaire (Article 5)"
                    value={fillData.article5BeneficiarySignature}
                    onChange={(value) => setFillData((prev) => ({ ...prev, article5BeneficiarySignature: value }))}
                  />
                  <SignaturePad
                    title="Signature secrétariat (Article 5)"
                    value={fillData.article5SecretarySignature}
                    onChange={(value) => setFillData((prev) => ({ ...prev, article5SecretarySignature: value }))}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex-1 rounded-xl overflow-hidden shadow-inner bg-white border">
              <PDFViewer
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: '0.75rem',
                }}
              >
                {pdfDocument}
              </PDFViewer>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MemberDetailsModal
