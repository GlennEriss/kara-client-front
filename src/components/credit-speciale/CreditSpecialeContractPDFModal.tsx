'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ServiceFactory } from '@/factories/ServiceFactory'
import { useMember } from '@/hooks/useMembers'
import { CreditContract } from '@/types/types'
import { BlobProvider, PDFViewer, pdf } from '@react-pdf/renderer'
import { Download, FileText, Loader2, Monitor, PenLine, RotateCcw, Smartphone } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import AdhesionCreditSpecialeV3, {
  EMPTY_ADHESION_CREDIT_SPECIALE_FILL_DATA,
  type AdhesionCreditSpecialeFillData,
} from './AdhesionCreditSpecialeV3'

interface AdhesionCreditSpecialeV2ModalProps {
  isOpen: boolean
  onClose: () => void
  contract: CreditContract
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

const AdhesionCreditSpecialeV2Modal: React.FC<AdhesionCreditSpecialeV2ModalProps> = ({
  isOpen,
  onClose,
  contract
}) => {
  const [isExporting, setIsExporting] = useState(false)
  const [fillData, setFillData] = useState<AdhesionCreditSpecialeFillData>(EMPTY_ADHESION_CREDIT_SPECIALE_FILL_DATA)
  const [previewFillData, setPreviewFillData] = useState<AdhesionCreditSpecialeFillData>(EMPTY_ADHESION_CREDIT_SPECIALE_FILL_DATA)
  const [isPreviewRefreshing, setIsPreviewRefreshing] = useState(false)
  const skipDebouncePreviewRef = useRef(false)

  // Récupérer les informations du membre
  const { data: memberData, isLoading: memberLoading } = useMember(contract.clientId)

  // Récupérer les informations du garant si c'est un membre
  const { data: guarantorData } = useMember(
    contract.guarantorIsMember && contract.guarantorId ? contract.guarantorId : undefined
  )

  useEffect(() => {
    if (!isOpen) return
    setFillData(EMPTY_ADHESION_CREDIT_SPECIALE_FILL_DATA)
    setPreviewFillData(EMPTY_ADHESION_CREDIT_SPECIALE_FILL_DATA)
    setIsPreviewRefreshing(false)
  }, [isOpen, contract.id])

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
    () => (
      <AdhesionCreditSpecialeV3
        contract={contract}
        memberData={memberData}
        guarantorData={guarantorData}
        fillData={previewFillData}
      />
    ),
    [contract, memberData, guarantorData, previewFillData]
  )

  // Fonction pour télécharger le PDF
  const handleDownload = async () => {
    try {
      setIsExporting(true)
      toast.info('Génération du PDF en cours...')

      const doc = (
        <AdhesionCreditSpecialeV3
          contract={contract}
          memberData={memberData}
          guarantorData={guarantorData}
          fillData={fillData}
        />
      )

      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // Nom du fichier : LASTNAME_FIRSTNAME_ACC_EXP_MK_YYYY.pdf (ex: OBIANG_ELLA_ACC_EXP_MK_2026.pdf)
      const year = new Date().getFullYear()
      const first = (memberData?.firstName != null ? String(memberData.firstName) : '').toUpperCase().replace(/\s+/g, '_')
      const last = (memberData?.lastName != null ? String(memberData.lastName) : '').toUpperCase().replace(/\s+/g, '_')
      const fileName = last && first ? `${last}_${first}_ACC_EXP_MK_${year}.pdf` : `ACC_EXP_MK_${contract.id}_${year}.pdf`
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('PDF téléchargé avec succès')
    } catch (error: any) {
      console.error('Erreur lors de la génération du PDF:', error)
      toast.error('Erreur lors de la génération du PDF')
    } finally {
      setIsExporting(false)
    }
  }

  // Générer le PDF pour l'upload
  const handleGenerateAndUpload = async () => {
    try {
      setIsExporting(true)
      toast.info('Génération et enregistrement du PDF en cours...')

      const doc = (
        <AdhesionCreditSpecialeV3
          contract={contract}
          memberData={memberData}
          guarantorData={guarantorData}
          fillData={fillData}
        />
      )

      const blob = await pdf(doc).toBlob()
      const year = new Date().getFullYear()
      const first = (memberData?.firstName != null ? String(memberData.firstName) : '').toUpperCase().replace(/\s+/g, '_')
      const last = (memberData?.lastName != null ? String(memberData.lastName) : '').toUpperCase().replace(/\s+/g, '_')
      const fileName = last && first ? `${last}_${first}_ACC_EXP_MK_${year}.pdf` : `ACC_EXP_MK_${contract.id}_${year}.pdf`
      const file = new File([blob], fileName, { type: 'application/pdf' })

      // Upload via le service
      const service = ServiceFactory.getCreditSpecialeService()
      await service.generateContractPDF(contract.id, false, file)
      
      toast.success('PDF généré et enregistré avec succès')
      onClose()
    } catch (error: any) {
      console.error('Erreur lors de la génération/upload du PDF:', error)
      toast.error(error?.message || 'Erreur lors de la génération du PDF')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[95vw] !max-w-[1400px] max-h-[95vh] lg:max-h-[95vh] overflow-y-auto lg:overflow-hidden bg-gradient-to-br from-white to-gray-50 border-0 shadow-2xl">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 lg:pb-6 border-b border-gray-200">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="p-2 lg:p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg flex-shrink-0">
                <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
                  Contrat de Crédit Spéciale
                </DialogTitle>
                <p className="text-sm lg:text-base text-gray-600 truncate">
                  Contrat #{contract.id?.slice(-6)}
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleDownload}
            disabled={isExporting || memberLoading}
            className="mr-2 lg:mr-10 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-10 px-4 lg:h-12 lg:px-6 flex-shrink-0"
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

        {/* Contenu principal */}
        <div className="flex-1 h-[calc(95vh-120px)] lg:h-[calc(95vh-150px)] overflow-hidden">
          {/* Indicateur de chargement des données du membre */}
          {memberLoading ? (
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Chargement des données du membre...
                  </h3>
                  <p className="text-sm text-gray-600">
                    Récupération des informations personnelles
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Version mobile */}
              <div className="lg:hidden h-full">
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 p-4">
                  {/* Icône et titre mobile */}
                  <div className="space-y-3">
                    <div className="mx-auto w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                      <Smartphone className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        Prévisualisation mobile
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        Le document PDF est prêt ! Ouvrez-le dans votre navigateur ou téléchargez-le.
                      </p>
                    </div>
                  </div>

                  {/* Informations du document mobile */}
                  <div className="bg-gray-50 rounded-lg p-3 w-full space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Document:</span>
                      <span className="font-medium text-gray-900">Contrat Crédit Spéciale</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Contrat:</span>
                      <span className="font-medium text-gray-900">#{contract.id?.slice(-6)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Pages:</span>
                      <span className="font-medium text-gray-900">7 pages</span>
                    </div>
                  </div>

                  {/* Boutons d'action mobile */}
                  <BlobProvider document={pdfDocument}>
                    {({ url, loading }) => (
                      <div className="w-full space-y-2">
                        <Button
                          asChild
                          disabled={loading || !url}
                          className="w-full h-11 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <a href={url ?? '#'} target="_blank" rel="noopener noreferrer">
                            <FileText className="w-4 h-4 mr-2" />
                            Ouvrir dans le navigateur
                          </a>
                        </Button>

                        <Button
                          onClick={handleDownload}
                          disabled={isExporting}
                          variant="outline"
                          className="w-full h-11 border-2 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white transition-all duration-300"
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
                </div>
              </div>

              {/* Version desktop */}
              <div className="hidden lg:flex h-full gap-4">
                <Card className="w-[420px] h-full overflow-y-auto border border-gray-200 shadow-sm">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <PenLine className="w-4 h-4 text-kara-primary-dark" />
                      <h3 className="text-sm font-bold text-kara-primary-dark">Remplissage du contrat</h3>
                    </div>

                    {isPreviewRefreshing ? (
                      <p className="text-[11px] text-kara-primary-dark/70">Aperçu PDF en mise à jour...</p>
                    ) : null}

                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-kara-primary-dark">Signatures numériques</p>
                      <SignaturePad
                        title="Signature membre"
                        value={fillData.memberSignature}
                        onChange={(value) => {
                          skipDebouncePreviewRef.current = true
                          setFillData((prev) => ({ ...prev, memberSignature: value }))
                        }}
                      />
                      <SignaturePad
                        title="Signature secrétaire exécutif"
                        value={fillData.secretarySignature}
                        onChange={(value) => {
                          skipDebouncePreviewRef.current = true
                          setFillData((prev) => ({ ...prev, secretarySignature: value }))
                        }}
                      />
                      <SignaturePad
                        title="Signature caution"
                        value={fillData.guarantorSignature}
                        onChange={(value) => {
                          skipDebouncePreviewRef.current = true
                          setFillData((prev) => ({ ...prev, guarantorSignature: value }))
                        }}
                      />
                    </div>

                    <div className="space-y-3 pt-1">
                      <p className="text-xs font-semibold text-kara-primary-dark">Mentions à compléter</p>

                      <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
                        <p className="text-[11px] font-semibold text-kara-primary-dark uppercase tracking-wide">
                          Reconnaissance de dette
                        </p>
                        <div className="space-y-1.5">
                          <Label htmlFor="reconnaissance-city" className="text-xs text-gray-700">Fait à</Label>
                          <Input
                            id="reconnaissance-city"
                            value={fillData.reconnaissanceCity}
                            onChange={(event) => {
                              skipDebouncePreviewRef.current = true
                              setFillData((prev) => ({ ...prev, reconnaissanceCity: event.target.value }))
                            }}
                            placeholder="Libreville"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="reconnaissance-date" className="text-xs text-gray-700">Le</Label>
                          <Input
                            id="reconnaissance-date"
                            type="date"
                            value={fillData.reconnaissanceDate}
                            onChange={(event) => {
                              skipDebouncePreviewRef.current = true
                              setFillData((prev) => ({ ...prev, reconnaissanceDate: event.target.value }))
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
                        <p className="text-[11px] font-semibold text-kara-primary-dark uppercase tracking-wide">
                          Article 1: Montant et durée
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="accompaniment-exceptionnel"
                              checked={fillData.accompanimentType === 'EXCEPTIONNEL'}
                              onCheckedChange={() => {
                                skipDebouncePreviewRef.current = true
                                setFillData((prev) => ({
                                  ...prev,
                                  accompanimentType: prev.accompanimentType === 'EXCEPTIONNEL' ? null : 'EXCEPTIONNEL',
                                }))
                              }}
                            />
                            <Label htmlFor="accompaniment-exceptionnel" className="text-xs text-gray-700 cursor-pointer">
                              Exceptionnel
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="accompaniment-regulier"
                              checked={fillData.accompanimentType === 'REGULIER'}
                              onCheckedChange={() => {
                                skipDebouncePreviewRef.current = true
                                setFillData((prev) => ({
                                  ...prev,
                                  accompanimentType: prev.accompanimentType === 'REGULIER' ? null : 'REGULIER',
                                }))
                              }}
                            />
                            <Label htmlFor="accompaniment-regulier" className="text-xs text-gray-700 cursor-pointer">
                              Régulier
                            </Label>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
                        <p className="text-[11px] font-semibold text-kara-primary-dark uppercase tracking-wide">
                          Article 5: Sanctions
                        </p>
                        <div className="space-y-1.5">
                          <Label htmlFor="sanctions-city" className="text-xs text-gray-700">Fait à</Label>
                          <Input
                            id="sanctions-city"
                            value={fillData.sanctionsCity}
                            onChange={(event) => {
                              skipDebouncePreviewRef.current = true
                              setFillData((prev) => ({ ...prev, sanctionsCity: event.target.value }))
                            }}
                            placeholder="Libreville"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="sanctions-date" className="text-xs text-gray-700">Le</Label>
                          <Input
                            id="sanctions-date"
                            type="date"
                            value={fillData.sanctionsDate}
                            onChange={(event) => {
                              skipDebouncePreviewRef.current = true
                              setFillData((prev) => ({ ...prev, sanctionsDate: event.target.value }))
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
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
            </>
          )}
        </div>

        {/* Footer avec bouton d'enregistrement */}
        <div className="px-4 lg:px-6 py-3 lg:py-4 border-t border-gray-200 bg-gray-50/50 flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Monitor className="h-4 w-4" />
            <span>Contrat #{contract.id?.slice(-6)}</span>
          </div>
          <Button
            onClick={handleGenerateAndUpload}
            disabled={isExporting || memberLoading}
            className="w-full lg:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Générer et enregistrer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AdhesionCreditSpecialeV2Modal
