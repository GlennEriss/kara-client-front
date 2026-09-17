'use client'

import { BlobProvider, PDFViewer, pdf } from '@react-pdf/renderer'
import { Download, Eye, HeartHandshake, Loader2, Monitor, PenLine, Smartphone } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { SignaturePad } from '@/components/shared/SignaturePad'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import QuittanceSecoursPDF, {
  EVENEMENTS_SECOURS,
  MODES_REGLEMENT_SECOURS,
  quittanceSecoursFillDataParDefaut,
  type EvenementSecours,
  type ModeReglementSecours,
  type QuittanceSecoursFillData,
} from './QuittanceSecoursPDF'

interface QuittanceSecoursPDFModalProps {
  isOpen: boolean
  onClose: () => void
  /** Membre du contrat : sert à pré-remplir l'identification du bénéficiaire. */
  member: {
    firstName?: string
    lastName?: string
    matricule?: string
    phone?: string
  }
}

/**
 * Remplissage et édition du procès-verbal de liquidation d'un secours.
 *
 * Le document est produit au moment du versement : le Comité Exécutif saisit
 * l'événement, le montant et le mode de règlement, puis fait signer le
 * bénéficiaire. Tout champ vide sort en pointillés, pour une signature papier.
 */
const QuittanceSecoursPDFModal: React.FC<QuittanceSecoursPDFModalProps> = ({
  isOpen,
  onClose,
  member,
}) => {
  const [isExporting, setIsExporting] = useState(false)
  const [fillData, setFillData] = useState<QuittanceSecoursFillData>(
    quittanceSecoursFillDataParDefaut,
  )
  const [previewFillData, setPreviewFillData] = useState(fillData)
  const [isPreviewRefreshing, setIsPreviewRefreshing] = useState(false)
  // Une case ou une signature doivent rafraîchir l'aperçu sans attendre
  const skipDebouncePreviewRef = useRef(false)

  const nomComplet = [member.lastName?.toUpperCase(), member.firstName]
    .filter(Boolean)
    .join(' ')
    .trim()

  // Repart du dossier du membre à chaque ouverture : une quittance vaut pour un
  // versement, elle ne se reprend pas d'une fois sur l'autre.
  useEffect(() => {
    if (!isOpen) return
    const today = new Date().toISOString().split('T')[0]
    const initial: QuittanceSecoursFillData = {
      ...quittanceSecoursFillDataParDefaut(),
      beneficiaireNom: nomComplet,
      soussigneNom: nomComplet,
      matricule: member.matricule ?? '',
      telephone: member.phone ?? '',
      date: today,
    }
    skipDebouncePreviewRef.current = true
    setFillData(initial)
    setPreviewFillData(initial)
    setIsPreviewRefreshing(false)
  }, [isOpen, nomComplet, member.matricule, member.phone])

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

  const pdfDocument = useMemo(
    () => <QuittanceSecoursPDF fillData={previewFillData} />,
    [previewFillData],
  )

  const choisir = <T,>(champ: keyof QuittanceSecoursFillData, valeur: T) => {
    skipDebouncePreviewRef.current = true
    setFillData((prev) => ({ ...prev, [champ]: valeur }))
  }

  const handleDownload = async () => {
    setIsExporting(true)
    try {
      const blob = await pdf(<QuittanceSecoursPDF fillData={fillData} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const nom = (nomComplet || 'MEMBRE').replace(/\s+/g, '_').toUpperCase()
      link.download = `QUITTANCE_SECOURS_${nom}_${new Date().getFullYear()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('Quittance de secours téléchargée')
    } catch (error) {
      console.error('Erreur lors du téléchargement de la quittance de secours:', error)
      toast.error('Impossible de générer la quittance')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[95vw] !max-w-[1400px] max-h-[95vh] overflow-y-auto lg:overflow-hidden bg-white">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b border-gray-200 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg lg:text-xl">
            <HeartHandshake className="h-5 w-5 text-[#234D65]" />
            <span className="bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent font-bold">
              Quittance de secours — {nomComplet || 'Membre'}
            </span>
          </DialogTitle>
          <Button
            onClick={handleDownload}
            disabled={isExporting}
            className="mr-8 bg-gradient-to-r from-[#234D65] to-[#2c5a73] text-white border-0"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Télécharger
              </>
            )}
          </Button>
        </DialogHeader>

        {/* Mobile : le lecteur PDF embarqué est inutilisable */}
        <div className="lg:hidden">
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center gap-4 p-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#234D65] to-[#2c5a73]">
                <Smartphone className="h-7 w-7 text-white" />
              </div>
              <p className="text-sm text-gray-600">
                Le remplissage se fait depuis un ordinateur. Vous pouvez ouvrir ou télécharger le
                document.
              </p>
              <BlobProvider document={pdfDocument}>
                {({ url, loading }) => (
                  <Button asChild disabled={loading || !url} className="h-11 w-full">
                    <a href={url ?? '#'} target="_blank" rel="noopener noreferrer">
                      <Eye className="mr-2 h-4 w-4" />
                      Ouvrir dans le navigateur
                    </a>
                  </Button>
                )}
              </BlobProvider>
              <div className="flex w-full items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <p className="text-left text-xs text-blue-700">
                  Pour remplir et faire signer, utilisez un ordinateur ou une tablette.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Desktop : panneau de remplissage + aperçu */}
        <div className="hidden h-[calc(95vh-150px)] gap-4 lg:flex">
          <Card className="h-full w-[420px] overflow-y-auto border border-gray-200 shadow-sm">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center gap-2">
                <PenLine className="h-4 w-4 text-kara-primary-dark" />
                <h3 className="text-sm font-bold text-kara-primary-dark">Remplissage du PDF</h3>
              </div>
              {isPreviewRefreshing ? (
                <p className="text-[11px] text-kara-primary-dark/70">
                  Aperçu PDF en mise à jour...
                </p>
              ) : null}
              <p className="text-[11px] leading-relaxed text-gray-500">
                Un champ laissé vide s&apos;imprime en pointillés, à compléter à la main.
              </p>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-kara-primary-dark">
                  1. Identification du bénéficiaire
                </p>
                <div className="space-y-1">
                  <p className="text-[11px] text-gray-600">Nom(s) et Prénom(s) du membre</p>
                  <Input
                    value={fillData.beneficiaireNom}
                    onChange={(e) =>
                      setFillData((prev) => ({
                        ...prev,
                        beneficiaireNom: e.target.value,
                        soussigneNom: e.target.value,
                      }))
                    }
                    className="h-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-[11px] text-gray-600">Matricule (préfixe KARA- ajouté)</p>
                    <Input
                      value={fillData.matricule}
                      onChange={(e) =>
                        setFillData((prev) => ({ ...prev, matricule: e.target.value }))
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-gray-600">Téléphone</p>
                    <Input
                      value={fillData.telephone}
                      placeholder="77 12 34 56"
                      onChange={(e) =>
                        setFillData((prev) => ({ ...prev, telephone: e.target.value }))
                      }
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-gray-600">N° CNI/Passeport du réceptionnaire</p>
                  <Input
                    value={fillData.cniReceptionnaire}
                    onChange={(e) =>
                      setFillData((prev) => ({ ...prev, cniReceptionnaire: e.target.value }))
                    }
                    className="h-9"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={fillData.cotisationsAJour}
                    onChange={(e) => choisir('cotisationsAJour', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#234D65]"
                  />
                  Cotisations à jour
                </label>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-kara-primary-dark">
                  2. Motif et liquidation
                </p>
                <div className="space-y-1">
                  <p className="text-[11px] text-gray-600">Nature de l&apos;événement social</p>
                  <div className="grid grid-cols-2 gap-2">
                    {EVENEMENTS_SECOURS.map((evenement) => (
                      <Button
                        key={evenement}
                        type="button"
                        size="sm"
                        variant={fillData.evenement === evenement ? 'default' : 'outline'}
                        onClick={() =>
                          choisir<EvenementSecours | null>(
                            'evenement',
                            fillData.evenement === evenement ? null : evenement,
                          )
                        }
                        className={cn(
                          fillData.evenement === evenement
                            ? 'bg-kara-primary-dark hover:bg-kara-primary-dark/90'
                            : 'border-kara-primary-dark/30 text-kara-primary-dark',
                        )}
                      >
                        {evenement}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-gray-600">Pièce justificative produite</p>
                  <Input
                    value={fillData.pieceJustificative}
                    placeholder="Acte de décès n° …"
                    onChange={(e) =>
                      setFillData((prev) => ({ ...prev, pieceJustificative: e.target.value }))
                    }
                    className="h-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-[11px] text-gray-600">Montant (chiffres)</p>
                    <Input
                      value={fillData.montantChiffres}
                      placeholder="30 000"
                      onChange={(e) =>
                        setFillData((prev) => ({ ...prev, montantChiffres: e.target.value }))
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-gray-600">Montant (lettres)</p>
                    <Input
                      value={fillData.montantLettres}
                      placeholder="Trente mille"
                      onChange={(e) =>
                        setFillData((prev) => ({ ...prev, montantLettres: e.target.value }))
                      }
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-gray-600">Mode de règlement</p>
                  <div className="flex flex-col gap-2">
                    {MODES_REGLEMENT_SECOURS.map((mode) => (
                      <Button
                        key={mode}
                        type="button"
                        size="sm"
                        variant={fillData.modeReglement === mode ? 'default' : 'outline'}
                        onClick={() =>
                          choisir<ModeReglementSecours | null>(
                            'modeReglement',
                            fillData.modeReglement === mode ? null : mode,
                          )
                        }
                        className={cn(
                          fillData.modeReglement === mode
                            ? 'bg-kara-primary-dark hover:bg-kara-primary-dark/90'
                            : 'border-kara-primary-dark/30 text-kara-primary-dark',
                        )}
                      >
                        {mode}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-kara-primary-dark">3. Décharge</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-[11px] text-gray-600">Lieu</p>
                    <Input
                      value={fillData.lieu}
                      placeholder="Owendo"
                      onChange={(e) => setFillData((prev) => ({ ...prev, lieu: e.target.value }))}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-gray-600">Date</p>
                    <Input
                      type="date"
                      value={fillData.date}
                      onChange={(e) => setFillData((prev) => ({ ...prev, date: e.target.value }))}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-kara-primary-dark">
                  Signatures numériques
                </p>
                <SignaturePad
                  title="Signature du bénéficiaire"
                  value={fillData.beneficiaireSignature}
                  onChange={(value) => choisir('beneficiaireSignature', value)}
                />
                <SignaturePad
                  title="Signature et cachet du Comité Exécutif"
                  value={fillData.comiteSignature}
                  onChange={(value) => choisir('comiteSignature', value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex-1 overflow-hidden rounded-xl border bg-white shadow-inner">
            <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
              {pdfDocument}
            </PDFViewer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default QuittanceSecoursPDFModal
