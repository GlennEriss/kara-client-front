'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { listRefundsCI } from '@/db/caisse/refunds.db'
import { useContractPaymentStats } from '@/hooks/caisse-imprevue'
import { useMember } from '@/hooks/useMembers'
import { BlobProvider, PDFViewer, pdf } from '@react-pdf/renderer'
import { Download, FileText, Loader2, Monitor, PenLine, RotateCcw, Smartphone } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import QuittanceCaisseImprevuePDF, { type QuittanceCaisseImprevuePdfFillData } from './QuittanceCaisseImprevuePDF'

interface RemboursementCIPDFModalProps {
  isOpen: boolean
  onClose: () => void
  contractId: string
  contractData?: any
}

const EMPTY_FILL_DATA: QuittanceCaisseImprevuePdfFillData = {
  secretarySignature: null,
  memberSignature: null,
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

const RemboursementCIPDFModal: React.FC<RemboursementCIPDFModalProps> = ({
  isOpen,
  onClose,
  contractId,
  contractData
}) => {
  const [isExporting, setIsExporting] = useState(false)
  const [refunds, setRefunds] = useState<any[]>([])
  const [fillData, setFillData] = useState<QuittanceCaisseImprevuePdfFillData>(EMPTY_FILL_DATA)
  const [previewFillData, setPreviewFillData] = useState<QuittanceCaisseImprevuePdfFillData>(EMPTY_FILL_DATA)
  const [isPreviewRefreshing, setIsPreviewRefreshing] = useState(false)
  const skipDebouncePreviewRef = useRef(false)

  // Récupérer les informations du membre si memberId est disponible
  const { data: memberData, isLoading: memberLoading } = useMember(contractData?.memberId || '')
  
  // Récupérer les statistiques de paiement pour obtenir le montant total versé
  const { data: paymentStats } = useContractPaymentStats(contractId)

  // Charger les refunds pour récupérer le montant nominal
  React.useEffect(() => {
    const loadRefunds = async () => {
      if (contractId) {
        try {
          const refundsData = await listRefundsCI(contractId)
          setRefunds(refundsData)
        } catch (error) {
          console.error('Error loading refunds:', error)
        }
      }
    }
    loadRefunds()
  }, [contractId, isOpen])

  // Trouver le refund actif pour récupérer le montant nominal
  const activeRefund = React.useMemo(() => {
    return refunds.find((r: any) => 
      (r.type === 'FINAL' || r.type === 'EARLY') && 
      (r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'PAID')
    )
  }, [refunds])

  useEffect(() => {
    if (!isOpen) return
    setFillData(EMPTY_FILL_DATA)
    setPreviewFillData(EMPTY_FILL_DATA)
    setIsPreviewRefreshing(false)
  }, [isOpen, contractId])

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
      <QuittanceCaisseImprevuePDF
        contract={contractData}
        refund={activeRefund}
        memberData={memberData}
        totalAmountPaid={paymentStats?.totalAmountPaid}
        fillData={previewFillData}
      />
    ),
    [contractData, activeRefund, memberData, paymentStats?.totalAmountPaid, previewFillData]
  )

  const handleDownloadPDF = async () => {
    setIsExporting(true)

    try {
      const blob = await pdf(
        <QuittanceCaisseImprevuePDF 
          contract={contractData} 
          refund={activeRefund}
          memberData={memberData}
          totalAmountPaid={paymentStats?.totalAmountPaid}
          fillData={fillData}
        />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Format: MK_CI_firstname_lastname
      const firstName = contractData?.memberFirstName || memberData?.firstName || ''
      const lastName = contractData?.memberLastName || memberData?.lastName || ''
      const sanitizeName = (name: string) => name.replace(/[^a-zA-ZÀ-ÿ]/g, '').toUpperCase()
      const fileName = `MK_CI_${sanitizeName(firstName)}_${sanitizeName(lastName)}.pdf`
      
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('✅ PDF téléchargé avec succès', {
        description: 'Le document de remboursement a été généré et téléchargé dans votre dossier de téléchargements.',
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
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 lg:pb-6 border-b border-gray-200">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="p-2 lg:p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg flex-shrink-0">
                <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
                  Document de Remboursement - Caisse Imprévue
                </DialogTitle>
                <p className="text-sm lg:text-base text-gray-600 truncate">
                  Contrat #{contractId.slice(-6)}
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="mr-2 lg:mr-10 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-10 px-4 lg:h-12 lg:px-6 flex-shrink-0"
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
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
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
                    <div className="mx-auto w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
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
                      <span className="font-medium text-gray-900">Remboursement CI</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Contrat:</span>
                      <span className="font-medium text-gray-900">#{contractId.slice(-6)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Pages:</span>
                      <span className="font-medium text-gray-900">3 pages</span>
                    </div>
                  </div>

                  {/* Boutons d'action mobile */}
                  <BlobProvider document={pdfDocument}>
                    {({ url, loading }) => (
                      <div className="w-full space-y-2">
                        <Button
                          asChild
                          disabled={loading || !url}
                          className="w-full h-11 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          <a href={url ?? '#'} target="_blank" rel="noopener noreferrer">
                            <FileText className="w-4 h-4 mr-2" />
                            Ouvrir dans le navigateur
                          </a>
                        </Button>

                        <Button
                          onClick={handleDownloadPDF}
                          disabled={isExporting}
                          variant="outline"
                          className="w-full h-11 border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white transition-all duration-300"
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
                      <h3 className="text-sm font-bold text-kara-primary-dark">Remplissage de la quittance</h3>
                    </div>

                    {isPreviewRefreshing ? (
                      <p className="text-[11px] text-kara-primary-dark/70">Aperçu PDF en mise à jour...</p>
                    ) : null}

                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-kara-primary-dark">Signatures numériques</p>
                      <SignaturePad
                        title="Signature du Secrétaire exécutif"
                        value={fillData.secretarySignature}
                        onChange={(value) => {
                          skipDebouncePreviewRef.current = true
                          setFillData((prev) => ({ ...prev, secretarySignature: value }))
                        }}
                      />
                      <SignaturePad
                        title="Signature de l'épargnant (Lu et Approuvé)"
                        value={fillData.memberSignature}
                        onChange={(value) => {
                          skipDebouncePreviewRef.current = true
                          setFillData((prev) => ({ ...prev, memberSignature: value }))
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex-1 rounded-xl overflow-hidden shadow-inner bg-white border">
                  <PDFViewer style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: '0.75rem',
                  }}>
                    {pdfDocument}
                  </PDFViewer>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default RemboursementCIPDFModal
