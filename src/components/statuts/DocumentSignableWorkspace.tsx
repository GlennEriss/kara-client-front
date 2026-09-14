'use client'

import { BlobProvider, PDFViewer, pdf, type DocumentProps } from '@react-pdf/renderer'
import { CheckCircle2, Download, Eye, Loader2, Monitor, PenLine, Send, Smartphone } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { SignaturePad } from '@/components/shared/SignaturePad'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/domains/auth/hooks/useAuth'
import {
  signataireFillDataParDefaut,
  type SignataireFillData,
} from './documentFill'
import {
  lireDocumentPublie,
  publierDocument,
  type AssociationDocumentId,
} from './publication'

interface DocumentSignableWorkspaceProps {
  /** Nom du document, affiché sur la carte mobile. */
  titre: string
  /** Fabrique le document react-pdf à partir du remplissage courant. */
  construireDocument: (fillData: SignataireFillData) => React.ReactElement<DocumentProps>
  /** Nom du fichier téléchargé, sans extension. */
  nomFichier: string
  /** Lieu pré-rempli dans « Fait à …, le … ». */
  lieuParDefaut: string
  /** Contrôles propres au document, affichés au-dessus de l'aperçu. */
  enTete?: React.ReactNode
  /** Encart affiché sous l'en-tête (avertissement, note…). */
  avertissement?: React.ReactNode
  /** Document publiable aux membres ; omis, le bouton n'apparaît pas. */
  publication?: {
    documentId: AssociationDocumentId
    version: string
  }
}

/**
 * Espace de travail des documents institutionnels signés par le Comité
 * Exécutif : panneau de remplissage à gauche, aperçu PDF à droite.
 *
 * Statuts et Règlement Intérieur portent le même bloc de signature, ils
 * partagent donc ce composant ; seul le document rendu change.
 */
const DocumentSignableWorkspace: React.FC<DocumentSignableWorkspaceProps> = ({
  titre,
  construireDocument,
  nomFichier,
  lieuParDefaut,
  enTete,
  avertissement,
  publication,
}) => {
  const { user } = useAuth()
  const [isExporting, setIsExporting] = useState(false)
  const [fillData, setFillData] = useState<SignataireFillData>(() =>
    signataireFillDataParDefaut(lieuParDefaut),
  )
  const [previewFillData, setPreviewFillData] = useState<SignataireFillData>(fillData)
  const [isPreviewRefreshing, setIsPreviewRefreshing] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publieLe, setPublieLe] = useState<string | null>(null)
  // Une signature ou un bouton doivent rafraîchir l'aperçu sans attendre
  const skipDebouncePreviewRef = useRef(false)

  // Au chargement, on repart de ce qui est publié : l'admin corrige la
  // publication en vigueur au lieu de la ressaisir.
  useEffect(() => {
    if (!publication) return
    let annule = false

    lireDocumentPublie(publication.documentId)
      .then((publie) => {
        if (annule || !publie) return
        skipDebouncePreviewRef.current = true
        setFillData({
          lieu: publie.lieu ?? lieuParDefaut,
          date: publie.date ?? '',
          secretaireNom: publie.secretaireNom ?? '',
          secretaireSignature: publie.secretaireSignature ?? null,
          conseillerNom: publie.conseillerNom ?? '',
          conseillerSignature: publie.conseillerSignature ?? null,
        })
        setPublieLe(publie.date ?? null)
      })
      .catch(() => {
        // Pas de publication lisible : on reste sur un document vierge.
      })

    return () => {
      annule = true
    }
  }, [publication, lieuParDefaut])

  useEffect(() => {
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
  }, [fillData])

  const pdfDocument = useMemo(
    () => construireDocument(previewFillData),
    [construireDocument, previewFillData],
  )

  const setSignature = (
    champ: 'secretaireSignature' | 'conseillerSignature',
    valeur: string | null,
  ) => {
    skipDebouncePreviewRef.current = true
    setFillData((prev) => ({ ...prev, [champ]: valeur }))
  }

  const handlePublish = async () => {
    if (!publication) return
    if (!fillData.date) {
      toast.error('Renseignez la date d\'adoption avant de publier')
      return
    }

    setIsPublishing(true)
    try {
      await publierDocument(
        publication.documentId,
        fillData,
        publication.version,
        user?.uid ?? null,
      )
      setPublieLe(fillData.date)
      toast.success('Document publié aux membres')
    } catch (error) {
      console.error('Erreur lors de la publication du document:', error)
      toast.error('Impossible de publier le document')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleDownload = async () => {
    setIsExporting(true)
    try {
      const blob = await pdf(construireDocument(fillData)).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${nomFichier}_${new Date().getFullYear()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('✅ Document téléchargé')
    } catch (error) {
      console.error('Erreur lors du téléchargement du document:', error)
      toast.error('❌ Impossible de générer le PDF')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">{enTete}</div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
        {publication && (
          <Button
            onClick={handlePublish}
            disabled={isPublishing}
            variant="outline"
            className="border-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publication...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Publier aux membres
              </>
            )}
          </Button>
        )}
        <Button
          onClick={handleDownload}
          disabled={isExporting}
          className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Génération...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </>
          )}
        </Button>
        </div>
      </div>

      {publication && (
        <p className="flex items-center gap-2 text-xs text-gray-600">
          <CheckCircle2
            className={`h-4 w-4 shrink-0 ${publieLe ? 'text-emerald-600' : 'text-gray-300'}`}
          />
          {publieLe
            ? `Publié aux membres — texte adopté le ${publieLe.split('-').reverse().join('/')}.`
            : "Jamais publié : les membres voient encore un document non signé. Renseignez la date d'adoption et les signataires, puis publiez."}
        </p>
      )}

      {avertissement}

      {/* Mobile : le lecteur PDF embarqué est inutilisable, on propose l'ouverture */}
      <div className="lg:hidden">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-[#234D65] to-[#2c5a73] rounded-full flex items-center justify-center shadow-lg">
              <Smartphone className="h-7 w-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{titre}</h3>
              <p className="text-sm text-gray-600">
                Ouvrez le document dans votre navigateur ou téléchargez-le. Le remplissage se fait
                depuis un ordinateur.
              </p>
            </div>
            <BlobProvider document={pdfDocument}>
              {({ url, loading }) => (
                <Button asChild disabled={loading || !url} className="w-full h-11">
                  <a href={url ?? '#'} target="_blank" rel="noopener noreferrer">
                    <Eye className="w-4 h-4 mr-2" />
                    Ouvrir dans le navigateur
                  </a>
                </Button>
              )}
            </BlobProvider>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 w-full flex items-start gap-2">
              <Monitor className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700 text-left">
                Pour remplir et signer le document, utilisez un ordinateur ou une tablette.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Desktop : panneau de remplissage + aperçu */}
      <div className="hidden lg:flex h-[calc(100vh-360px)] min-h-[540px] gap-4">
        <Card className="w-[400px] h-full overflow-y-auto border border-gray-200 shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <PenLine className="w-4 h-4 text-kara-primary-dark" />
              <h3 className="text-sm font-bold text-kara-primary-dark">Remplissage du PDF</h3>
            </div>
            {isPreviewRefreshing ? (
              <p className="text-[11px] text-kara-primary-dark/70">Aperçu PDF en mise à jour...</p>
            ) : null}
            <p className="text-[11px] leading-relaxed text-gray-500">
              Un champ laissé vide s&apos;imprime en pointillés, à compléter à la main après
              impression.
            </p>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-kara-primary-dark">Adoption</p>
              <div className="space-y-1">
                <p className="text-[11px] text-gray-600">Lieu</p>
                <Input
                  type="text"
                  value={fillData.lieu}
                  placeholder={lieuParDefaut}
                  onChange={(event) =>
                    setFillData((prev) => ({ ...prev, lieu: event.target.value }))
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-gray-600">Date d&apos;adoption</p>
                <Input
                  type="date"
                  value={fillData.date}
                  onChange={(event) =>
                    setFillData((prev) => ({ ...prev, date: event.target.value }))
                  }
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-kara-primary-dark">Signataires</p>
              <div className="space-y-1">
                <p className="text-[11px] text-gray-600">Nom du Secrétaire Exécutif</p>
                <Input
                  type="text"
                  value={fillData.secretaireNom}
                  placeholder="NDONG OBAME Jean Baptiste"
                  onChange={(event) =>
                    setFillData((prev) => ({ ...prev, secretaireNom: event.target.value }))
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-gray-600">Nom du Conseiller Juridique</p>
                <Input
                  type="text"
                  value={fillData.conseillerNom}
                  placeholder="MBOUMBA Marie Claire"
                  onChange={(event) =>
                    setFillData((prev) => ({ ...prev, conseillerNom: event.target.value }))
                  }
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-kara-primary-dark">Signatures numériques</p>
              <SignaturePad
                title="Signature du Secrétaire Exécutif"
                value={fillData.secretaireSignature}
                onChange={(value) => setSignature('secretaireSignature', value)}
              />
              <SignaturePad
                title="Signature du Conseiller Juridique"
                value={fillData.conseillerSignature}
                onChange={(value) => setSignature('conseillerSignature', value)}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                skipDebouncePreviewRef.current = true
                setFillData(signataireFillDataParDefaut(lieuParDefaut))
              }}
            >
              Vider le remplissage
            </Button>
          </CardContent>
        </Card>

        <div className="flex-1 rounded-xl overflow-hidden border shadow-inner bg-white">
          <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
            {pdfDocument}
          </PDFViewer>
        </div>
      </div>
    </div>
  )
}

export default DocumentSignableWorkspace
