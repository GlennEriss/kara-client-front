'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SignaturePad } from '@/components/shared/SignaturePad'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import type { MembershipRequest } from '@/types/types'
import { BlobProvider, Document, Image, PDFViewer, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer'
import { ClipboardList, Download, Eye, FileText, Loader2, Monitor, PenLine, Smartphone } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

// Hauteur d'une page A4 en points (utilisée pour caler le numéro de page)
const A4_HEIGHT = 841.89

// Styles optimisés pour tenir sur une page
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    width: '100%',
  },
  logo: {
    width: 52,
    height: 52,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoId: {
    width: 52,
    height: 52,
    border: '1px solid #94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  titleListe: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f4f68',
    textDecoration: 'underline',
    marginBottom: 2,
    marginTop: 2,
  },
  docSubtitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f4f68',
  },
  docDevise: {
    fontSize: 9,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#475569',
    marginBottom: 4,
  },
  preamble: {
    fontSize: 9,
    fontStyle: 'italic',
    textAlign: 'justify',
    color: '#334155',
    lineHeight: 1.25,
    marginBottom: 3,
  },
  infoType: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 3,
    fontSize: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  checkbox: {
    width: 10,
    height: 10,
    border: '1px solid #1f4f68',
    marginRight: 4,
    backgroundColor: 'white',
  },
  checkboxChecked: {
    width: 10,
    height: 10,
    border: '1px solid #1f4f68',
    marginRight: 4,
    backgroundColor: '#1f4f68',
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
    border: '1px solid #cbd5e1',
    marginBottom: 3,
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
  sectionBody: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sectionParagraph: {
    fontSize: 9.5,
    textAlign: 'justify',
    lineHeight: 1.3,
    marginBottom: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  bulletDot: {
    width: 10,
    fontSize: 9.5,
  },
  bulletText: {
    flex: 1,
    fontSize: 9.5,
    textAlign: 'justify',
    lineHeight: 1.3,
  },
  handwrittenNote: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#9f1239',
    marginBottom: 2,
  },
  faitA: {
    fontSize: 10,
    marginTop: 2,
    marginBottom: 1,
  },
  stripedTable: {
    width: '100%',
    border: '1px solid #cbd5e1',
  },
  stripedRow: {
    flexDirection: 'row',
    padding: 2,
    backgroundColor: '#f8fafc',
    minHeight: 12,
  },
  stripedRowEven: {
    flexDirection: 'row',
    padding: 2,
    backgroundColor: 'white',
    minHeight: 12,
  },
  stripedCell: {
    flex: 1,
    fontSize: 9.5,
    paddingRight: 5,
  },
  modeReglementTable: {
    width: '100%',
  },
  modeReglementRow: {
    flexDirection: 'row',
    height: 36,
    border: '1px solid #cbd5e1',
  },
  modeReglementCell: {
    flex: 1,
    borderRight: '1px solid #cbd5e1',
    padding: 4,
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  modeReglementCellLast: {
    flex: 1,
    padding: 4,
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  rectangle: {
    width: 12,
    height: 12,
    border: '1px solid #64748b',
    marginRight: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rectangleChecked: {
    backgroundColor: '#1f4f68',
  },
  rectangleFill: {
    width: 8,
    height: 8,
    backgroundColor: '#1f4f68',
  },
  rectangleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  signatureTable: {
    width: '100%',
    border: '1px solid #cbd5e1',
    marginBottom: 0,
  },
  signatureRow: {
    flexDirection: 'row',
    height: 135,
  },
  signatureCell: {
    flex: 1,
    border: '1px solid #cbd5e1',
    padding: 5,
    justifyContent: 'space-between',
  },
  signatureCellTitle: {
    fontSize: 9.5,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  signatureCellHint: {
    fontSize: 8,
    fontStyle: 'italic',
    color: '#64748b',
    textAlign: 'center',
  },
  signatureImageLarge: {
    width: 190,
    height: 88,
    objectFit: 'contain',
    alignSelf: 'center',
  },
  signaturePlaceholderLarge: {
    width: 190,
    height: 88,
    alignSelf: 'center',
  },
  unsignedSignerName: {
    position: 'absolute',
    bottom: 1,
    left: 0,
    right: 0,
    fontSize: 9,
    textAlign: 'center',
    color: '#334155',
  },
  footer: {
    marginTop: 3,
    fontSize: 7.5,
    lineHeight: 1.2,
    color: '#475569',
  },
  boldText: {
    fontWeight: 'bold',
  },
  // Le numéro de page est positionné depuis le haut : avec un `lineHeight`
  // hérité de la Page, react-pdf résout mal `bottom` et l'élément absolu sort
  // de la page (le numéro disparaît alors du PDF).
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

// Pointillés imprimés quand la donnée n'est pas connue : la ligne reste
// remplissable à la main. Calibrés pour une demi-largeur de tableau.
const FIELD_PLACEHOLDER = '..............................'

const hasValue = (value?: string | null): boolean => !!value && value.trim().length > 0

// Pointillés plus courts pour une valeur insérée au milieu d'une ligne
// (ex. « ....... à ....... » pour la date et le lieu de naissance)
const INLINE_PLACEHOLDER = '................'
const inlineValue = (value?: string | null): string =>
  hasValue(value) ? (value as string) : INLINE_PLACEHOLDER

// Cellule « Libellé : valeur » des tableaux d'identification
const InfoCell = ({ label, value }: { label: string; value?: string | null }) => (
  <Text style={styles.stripedCell}>
    <Text style={styles.boldText}>{label} </Text>
    {hasValue(value) ? value : FIELD_PLACEHOLDER}
  </Text>
)

// Ligne à deux colonnes des sections 1 et 3
const InfoRow = ({ children, even }: { children: React.ReactNode; even?: boolean }) => (
  <View style={even ? styles.stripedRowEven : styles.stripedRow}>{children}</View>
)

// Puce des engagements financiers
const Bullet = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.bulletRow}>
    <Text style={styles.bulletDot}>•</Text>
    <Text style={styles.bulletText}>{children}</Text>
  </View>
)

const PAYMENT_MODE_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'X'] as const
type PaymentModeOption = typeof PAYMENT_MODE_OPTIONS[number]

type MembershipQualityOption = 'adherent' | 'sympathisant' | 'bienfaiteur'

interface AdhesionPdfFillData {
  paymentMode: PaymentModeOption | null
  quality: MembershipQualityOption | null
  headerPhotoDataUrl: string | null
  page1Location: string
  page1MemberDate: string
  page1SecretaryDate: string
  page1MemberSignature: string | null
  page1SecretarySignature: string | null
  // Cotisations de la section 2 : dépendent du niveau (A à E) et ne sont donc
  // pas déductibles du dossier. Vides => pointillés, à remplir à la main.
  contributionFonctionnement: string
  contributionSecours: string
  // Lignes imprimées dans les sections 1 et 3 : pré-remplies depuis le dossier
  // et modifiables, pour compléter ce qui manque (sinon la ligne sort en
  // pointillés, à remplir à la main sur le papier).
  memberFullName: string
  birthDate: string
  birthPlace: string
  identityDocumentNumber: string
  identityDocumentIssuingDate: string
  addressLine: string
  phoneLine: string
  email: string
  professionLine: string
  beneficiaryFullName: string
  beneficiaryRelationship: string
  beneficiaryPhone: string
  beneficiaryIdNumber: string
}

// Champs du document déduits du dossier : servent de valeurs de départ au
// panneau de remplissage.
type AdhesionDocumentFields = Pick<
  AdhesionPdfFillData,
  | 'memberFullName'
  | 'birthDate'
  | 'birthPlace'
  | 'identityDocumentNumber'
  | 'identityDocumentIssuingDate'
  | 'addressLine'
  | 'phoneLine'
  | 'email'
  | 'professionLine'
  | 'beneficiaryFullName'
  | 'beneficiaryRelationship'
  | 'beneficiaryPhone'
  | 'beneficiaryIdNumber'
>

const formatDate = (date: Date | string | any): string => {
  if (!date) return ''

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
      day: '2-digit',
    }).format(dateObj)
  } catch {
    return ''
  }
}

const buildDocumentFields = (request: MembershipRequest): AdhesionDocumentFields => {
  const address = request.address || ({} as MembershipRequest['address'])
  const contacts = (request.identity?.contacts || []).filter(Boolean)
  const whatsapp = request.identity?.whatsappNumber
  const phones = whatsapp && !contacts.includes(whatsapp) ? [...contacts, whatsapp] : contacts
  const beneficiary = request.identity?.beneficiary

  return {
    memberFullName: [request.identity?.lastName?.toUpperCase(), request.identity?.firstName]
      .filter(Boolean)
      .join(' ')
      .trim(),
    birthDate: formatDate(request.identity?.birthDate),
    birthPlace: request.identity?.birthPlace?.toUpperCase() || '',
    identityDocumentNumber: request.documents?.identityDocumentNumber || '',
    identityDocumentIssuingDate: formatDate(request.documents?.issuingDate),
    addressLine: [address.district, address.arrondissement, address.city, address.province]
      .filter(Boolean)
      .join(', '),
    phoneLine: phones.join(' / '),
    email: request.identity?.email || '',
    professionLine: [request.company?.profession, request.company?.companyName]
      .filter(Boolean)
      .join(' / '),
    beneficiaryFullName: [beneficiary?.lastName?.toUpperCase(), beneficiary?.firstName]
      .filter(Boolean)
      .join(' ')
      .trim(),
    beneficiaryRelationship: beneficiary?.relationship || '',
    beneficiaryPhone: beneficiary?.phone || '',
    beneficiaryIdNumber: beneficiary?.idNumber || '',
  }
}

const buildInitialFillData = (request: MembershipRequest): AdhesionPdfFillData => {
  const today = new Date().toISOString().split('T')[0]
  return {
    paymentMode: null,
    quality: null,
    headerPhotoDataUrl: null,
    page1Location: request.address?.city || 'Owendo',
    page1MemberDate: today,
    page1SecretaryDate: today,
    page1MemberSignature: null,
    page1SecretarySignature: null,
    contributionFonctionnement: '',
    contributionSecours: '',
    ...buildDocumentFields(request),
  }
}

// Champ texte du panneau de remplissage : vide => la ligne sort en pointillés
const FillField = ({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
}) => (
  <div className="space-y-1">
    <p className="text-[11px] text-gray-600">{label}</p>
    <Input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="h-9"
    />
  </div>
)

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

// Composant principal du document PDF
export const MutuelleKaraPDF = ({
  request,
  fillData,
}: {
  request: MembershipRequest
  fillData: AdhesionPdfFillData
}) => {
  // Suit le nom saisi dans le panneau de remplissage, pour que le rappel sous
  // le cadre de signature reste cohérent avec la section 1.
  const memberFullName =
    fillData.memberFullName?.trim() ||
    [request.identity?.lastName, request.identity?.firstName].filter(Boolean).join(' ').trim() ||
    request.id ||
    'Membre'

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

  const isQualityChecked = (quality: MembershipQualityOption) => fillData.quality === quality
  const isModeChecked = (mode: PaymentModeOption) => fillData.paymentMode === mode

  const engagementLocation = fillData.page1Location?.trim() || 'Owendo'

  return (
    <Document>
      {/* Page 1 - Engagement d'adhésion et de prévoyance sociale */}
      <Page size="A4" style={styles.page}>
        <Text
          fixed
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
        />
        {/* En-tête avec logo et photo */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Image
              src={window.location.origin + '/Logo-Kara.jpg'}
              style={{ width: 52, height: 52, objectFit: 'cover' }}
              cache={false}
            />
          </View>
          <View style={styles.photoId}>
            {getPhotoURL() ? (
              <Image
                src={getPhotoURL()!}
                style={{ width: 52, height: 52, objectFit: 'cover' }}
                cache={false}
              />
            ) : (
              <View style={{
                width: 52,
                height: 52,
                border: '1px solid #94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8fafc'
              }}>
                <Text style={{
                  fontSize: 9,
                  textAlign: 'center',
                  color: '#64748b'
                }}>
                  PHOTO{'\n'}IDENTITÉ
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Titre, entité et devise */}
        <Text style={styles.titleListe}>
          ENGAGEMENT D'ADHÉSION ET DE PRÉVOYANCE SOCIALE
        </Text>
        <Text style={styles.docSubtitle}>ASSOCIATION DE SECOURS MUTUEL KARA</Text>
        <Text style={styles.docDevise}>Devise : Intégrité – Solidarité – Dynamisme</Text>

        {/* Préambule */}
        <Text style={styles.preamble}>
          Cet acte constitue un contrat synallagmatique d'adhésion souscrit conformément à la Loi n° 35/62
          régissant les associations au Gabon et au Règlement Intérieur de KARA. Il formalise les droits et
          devoirs du membre adhérent et confirme la nature non financière (absence de crédit/prêt) des
          secours apportés.
        </Text>

        {/* Qualité du membre */}
        <View style={styles.infoType}>
          <Checkbox checked={isQualityChecked('adherent')} label="Membre Adhérent" />
          <Checkbox checked={isQualityChecked('sympathisant')} label="Membre Sympathisant" />
          <Checkbox checked={isQualityChecked('bienfaiteur')} label="Membre Bienfaiteur" />
        </View>

        {/* 1. Identification du membre adhérent */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>1. IDENTIFICATION DU MEMBRE ADHÉRENT</Text>
          <View style={styles.stripedTable}>
            <InfoRow>
              <InfoCell label="Nom(s) et Prénom(s) :" value={fillData.memberFullName} />
              <InfoCell
                label="Date et Lieu de Naissance :"
                value={`${inlineValue(fillData.birthDate)} à ${inlineValue(fillData.birthPlace)}`}
              />
            </InfoRow>
            <InfoRow even>
              <InfoCell label="N° CNI/Passeport :" value={fillData.identityDocumentNumber} />
              <InfoCell label="Délivré(e) le :" value={fillData.identityDocumentIssuingDate} />
            </InfoRow>
            <InfoRow>
              <InfoCell label="Adresse / Quartier :" value={fillData.addressLine} />
              <InfoCell label="Téléphone / WhatsApp :" value={fillData.phoneLine} />
            </InfoRow>
            <InfoRow even>
              <InfoCell label="Email :" value={fillData.email} />
              <InfoCell label="Profession / Employeur :" value={fillData.professionLine} />
            </InfoRow>
          </View>
        </View>

        {/* 2. Engagements et obligations financières */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>2. ENGAGEMENTS ET OBLIGATIONS FINANCIÈRES</Text>
          <View style={styles.sectionBody}>
            <Text style={styles.sectionParagraph}>
              Je soussigné(e), nommé(e) ci-dessus, déclare adhérer librement à l'Association de Secours
              Mutuel KARA et m'engage formellement à :
            </Text>
            <Bullet>
              Verser le droit d'entrée unique et non remboursable de{' '}
              <Text style={styles.boldText}>10 000 FCFA</Text> lors de ma souscription ;
            </Bullet>
            {/* Montants dépendant du niveau de contribution (A à E, cf.
                GRILLE_CONTRIBUTIONS) : saisis dans le panneau de remplissage,
                sinon imprimés en pointillés. Les inscrire en dur reviendrait à
                imposer le Niveau A à tout le monde. */}
            <Bullet>
              S'acquitter régulièrement de la cotisation mensuelle ordinaire de{' '}
              <Text style={styles.boldText}>{inlineValue(fillData.contributionFonctionnement)} FCFA</Text>{' '}
              (fonctionnement) au plus tard le 5 de chaque mois ;
            </Bullet>
            <Bullet>
              S'acquitter de la cotisation mensuelle obligatoire de{' '}
              <Text style={styles.boldText}>{inlineValue(fillData.contributionSecours)} FCFA</Text>{' '}
              destinée au Fonds de Secours Mutuel ;
            </Bullet>
            <Bullet>
              Respecter la <Text style={styles.boldText}>période de carence de trois (3) mois</Text> à compter
              de la date de signature des présentes avant de pouvoir solliciter une allocation de secours.
            </Bullet>
          </View>
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

        {/* 3. Déclaration du bénéficiaire désigné */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>3. DÉCLARATION DU BÉNÉFICIAIRE DÉSIGNÉ (EN CAS DE DÉCÈS)</Text>
          <View style={styles.sectionBody}>
            <Text style={styles.sectionParagraph}>
              En cas de décès du membre soussigné, l'allocation de secours prévue à l'Article 5 du Règlement
              Intérieur (<Text style={styles.boldText}>30 000 FCFA</Text>) sera versée à l'ayant droit désigné
              ci-après :
            </Text>
          </View>
          <View style={styles.stripedTable}>
            <InfoRow>
              <InfoCell label="Nom & Prénom de l'Ayant-Droit :" value={fillData.beneficiaryFullName} />
              <InfoCell label="Lien de Parenté :" value={fillData.beneficiaryRelationship} />
            </InfoRow>
            <InfoRow even>
              <InfoCell label="Téléphone :" value={fillData.beneficiaryPhone} />
              <InfoCell label="N° CNI de l'Ayant-Droit :" value={fillData.beneficiaryIdNumber} />
            </InfoRow>
          </View>
        </View>

        {/* 4. Acceptation du règlement et signature */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>4. ACCEPTATION DU RÈGLEMENT ET SIGNATURE</Text>
          <View style={styles.sectionBody}>
            <Text style={styles.sectionParagraph}>
              Je reconnais avoir pris connaissance des Statuts et du Règlement Intérieur de l'Association KARA
              et m'engage à m'y conformer strictement.
            </Text>
            <Text style={styles.faitA}>
              Fait à {engagementLocation}, le {formatDateForPdf(fillData.page1MemberDate)}
            </Text>
            <Text style={styles.handwrittenNote}>
              (Inscrire la mention manuscrite « Lu et approuvé, bon pour engagement »)
            </Text>
          </View>
          <View style={styles.signatureTable}>
            <View style={styles.signatureRow}>
              <View style={styles.signatureCell}>
                <Text style={styles.signatureCellTitle}>Le Membre Adhérent</Text>
                {fillData.page1MemberSignature ? (
                  <Image src={fillData.page1MemberSignature} style={styles.signatureImageLarge} cache={false} />
                ) : (
                  <View style={styles.signaturePlaceholderLarge}>
                    <Text style={styles.unsignedSignerName}>{memberFullName}</Text>
                  </View>
                )}
                <Text style={styles.signatureCellHint}>(Signature)</Text>
              </View>
              <View style={styles.signatureCell}>
                <Text style={styles.signatureCellTitle}>Pour le Comité Exécutif</Text>
                {fillData.page1SecretarySignature ? (
                  <Image src={fillData.page1SecretarySignature} style={styles.signatureImageLarge} cache={false} />
                ) : (
                  <View style={styles.signaturePlaceholderLarge} />
                )}
                <Text style={styles.signatureCellHint}>
                  (Signature et Cachet) — {formatDateForPdf(fillData.page1SecretaryDate)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Pied de page */}
        <View style={styles.footer}>
          <Text>ASSOCIATION DE SECOURS MUTUEL KARA. <Text style={styles.boldText}>Intégrité - Solidarité - Dynamisme</Text></Text>
          <Text>Siège : Awougou, Owendo</Text>
          <Text>R.D N°: 0650 /MIS/SG/DGELP/DPPALC/KMOG-</Text>
          <Text>Tél : 066-95-13-14 / 074-36-97-29</Text>
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
  const [fillData, setFillData] = useState<AdhesionPdfFillData>(() => buildInitialFillData(request))
  const [previewFillData, setPreviewFillData] = useState<AdhesionPdfFillData>(fillData)
  const [isPreviewRefreshing, setIsPreviewRefreshing] = useState(false)
  const skipDebouncePreviewRef = useRef(false)

  // Réinitialise le remplissage à chaque ouverture / changement de dossier :
  // les champs du document repartent des données du membre.
  useEffect(() => {
    if (!isOpen) return

    const initialData = buildInitialFillData(request)
    setFillData(initialData)
    setPreviewFillData(initialData)
    setIsPreviewRefreshing(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, request.id])

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
      <DialogContent className="!w-[95vw] !max-w-[1400px] max-h-[95vh] lg:max-h-[95vh] overflow-y-auto lg:overflow-hidden bg-white border-0 shadow-2xl">
        {/* Header - responsive uniquement pour mobile */}
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 lg:pb-6 border-b border-gray-200">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="p-2 lg:p-3 rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg flex-shrink-0">
                <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg lg:text-2xl font-bold">
                  <span className="inline-flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-[#234D65] lg:h-6 lg:w-6" />
                    <span className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
                      Fiche d&apos;Adhésion Contractuelle
                    </span>
                  </span>
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
                    <span className="font-medium text-gray-900">1 page</span>
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
                  <p className="text-xs font-semibold text-kara-primary-dark">
                    1. Identification du membre adhérent
                  </p>
                  <p className="text-[10px] text-gray-500 leading-snug">
                    Pré-rempli avec le dossier du membre. Un champ laissé vide s&apos;imprime en
                    pointillés, à compléter à la main sur le document.
                  </p>
                  <FillField
                    label="Nom(s) et Prénom(s)"
                    value={fillData.memberFullName}
                    placeholder="NDONG OBAME Jean Baptiste"
                    onChange={(value) => setFillData((prev) => ({ ...prev, memberFullName: value }))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <FillField
                      label="Date de naissance"
                      value={fillData.birthDate}
                      placeholder="12/04/1988"
                      onChange={(value) => setFillData((prev) => ({ ...prev, birthDate: value }))}
                    />
                    <FillField
                      label="Lieu de naissance"
                      value={fillData.birthPlace}
                      placeholder="LIBREVILLE"
                      onChange={(value) => setFillData((prev) => ({ ...prev, birthPlace: value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FillField
                      label="N° CNI / Passeport"
                      value={fillData.identityDocumentNumber}
                      placeholder="CNI-123456"
                      onChange={(value) =>
                        setFillData((prev) => ({ ...prev, identityDocumentNumber: value }))
                      }
                    />
                    <FillField
                      label="Délivré(e) le"
                      value={fillData.identityDocumentIssuingDate}
                      placeholder="30/09/2021"
                      onChange={(value) =>
                        setFillData((prev) => ({ ...prev, identityDocumentIssuingDate: value }))
                      }
                    />
                  </div>
                  <FillField
                    label="Adresse / Quartier"
                    value={fillData.addressLine}
                    placeholder="Owendo, Quartier Awougou"
                    onChange={(value) => setFillData((prev) => ({ ...prev, addressLine: value }))}
                  />
                  <FillField
                    label="Téléphone / WhatsApp"
                    value={fillData.phoneLine}
                    placeholder="+241 77 12 34 56"
                    onChange={(value) => setFillData((prev) => ({ ...prev, phoneLine: value }))}
                  />
                  <FillField
                    label="Email"
                    value={fillData.email}
                    placeholder="membre@example.ga"
                    onChange={(value) => setFillData((prev) => ({ ...prev, email: value }))}
                  />
                  <FillField
                    label="Profession / Employeur"
                    value={fillData.professionLine}
                    placeholder="Technicien réseau / SEEG"
                    onChange={(value) => setFillData((prev) => ({ ...prev, professionLine: value }))}
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-kara-primary-dark">
                    2. Cotisations mensuelles
                  </p>
                  <p className="text-[10px] text-gray-500 leading-snug">
                    Dépendent du niveau coché ci-dessus : Niveau A 5 000 / 5 000, B 10 000 / 10 000,
                    C 15 000 / 15 000, D 20 000 / 20 000, E 25 000 / 25 000.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <FillField
                      label="Fonctionnement (FCFA)"
                      value={fillData.contributionFonctionnement}
                      placeholder="5 000"
                      onChange={(value) =>
                        setFillData((prev) => ({ ...prev, contributionFonctionnement: value }))
                      }
                    />
                    <FillField
                      label="Fonds de Secours (FCFA)"
                      value={fillData.contributionSecours}
                      placeholder="5 000"
                      onChange={(value) =>
                        setFillData((prev) => ({ ...prev, contributionSecours: value }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-kara-primary-dark">
                    3. Bénéficiaire désigné (ayant-droit)
                  </p>
                  <FillField
                    label="Nom & Prénom de l'ayant-droit"
                    value={fillData.beneficiaryFullName}
                    placeholder="NDONG Marie Claire"
                    onChange={(value) =>
                      setFillData((prev) => ({ ...prev, beneficiaryFullName: value }))
                    }
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <FillField
                      label="Lien de parenté"
                      value={fillData.beneficiaryRelationship}
                      placeholder="Épouse"
                      onChange={(value) =>
                        setFillData((prev) => ({ ...prev, beneficiaryRelationship: value }))
                      }
                    />
                    <FillField
                      label="Téléphone"
                      value={fillData.beneficiaryPhone}
                      placeholder="+241 74 55 66 77"
                      onChange={(value) =>
                        setFillData((prev) => ({ ...prev, beneficiaryPhone: value }))
                      }
                    />
                  </div>
                  <FillField
                    label="N° CNI de l'ayant-droit"
                    value={fillData.beneficiaryIdNumber}
                    placeholder="CNI-998877"
                    onChange={(value) =>
                      setFillData((prev) => ({ ...prev, beneficiaryIdNumber: value }))
                    }
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-kara-primary-dark">Dates et lieu</p>
                  <div className="space-y-1">
                    <p className="text-[11px] text-gray-600">Lieu de l&apos;engagement (section 4)</p>
                    <Input
                      type="text"
                      value={fillData.page1Location}
                      placeholder="Owendo"
                      onChange={(event) =>
                        setFillData((prev) => ({ ...prev, page1Location: event.target.value }))
                      }
                      className="h-9"
                    />
                  </div>
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
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-kara-primary-dark">Photo du cadrant (en haut à droite)</p>
                  <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleHeaderPhotoChange} className="h-10 text-xs" />
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
                    title="Signature du Membre Adhérent"
                    value={fillData.page1MemberSignature}
                    onChange={(value) => setFillData((prev) => ({ ...prev, page1MemberSignature: value }))}
                  />
                  <SignaturePad
                    title="Signature et cachet du Comité Exécutif"
                    value={fillData.page1SecretarySignature}
                    onChange={(value) => setFillData((prev) => ({ ...prev, page1SecretarySignature: value }))}
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
