'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useMemberById } from '@/domains/memberships/hooks/useMemberById'
import type { ContractCI } from '@/types/types'
import { BlobProvider, PDFViewer, pdf } from '@react-pdf/renderer'
import { Download, FileText, Loader2, Monitor, PenLine, RotateCcw, Smartphone } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import CaisseImprevuePDFV3, { type CaisseImprevuePdfFillData } from './CaisseImprevuePDFV3'

interface ViewContractCIModalProps {
  isOpen: boolean
  onClose: () => void
  contract: ContractCI | null
}

const EMPTY_FILL_DATA: CaisseImprevuePdfFillData = {
  paymentDueDay: '',
  memberSignature: null,
  secretarySignature: null,
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

export default function ViewContractCIModal({ isOpen, onClose, contract }: ViewContractCIModalProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [fillData, setFillData] = useState<CaisseImprevuePdfFillData>(EMPTY_FILL_DATA)
  const [previewFillData, setPreviewFillData] = useState<CaisseImprevuePdfFillData>(EMPTY_FILL_DATA)
  const [isPreviewRefreshing, setIsPreviewRefreshing] = useState(false)
  const skipDebouncePreviewRef = useRef(false)

  const { data: member, isLoading: memberLoading } = useMemberById(contract?.memberId)

  const contractWithMember = useMemo(() => {
    if (!contract) return null
    return { ...contract, member: member ?? undefined }
  }, [contract, member])

  useEffect(() => {
    if (!isOpen || !contract) return
    setFillData(EMPTY_FILL_DATA)
    setPreviewFillData(EMPTY_FILL_DATA)
    setIsPreviewRefreshing(false)
  }, [isOpen, contract?.id])

  useEffect(() => {
    if (!isOpen || !contract) return
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
  }, [fillData, isOpen, contract])

  const baseContract = contractWithMember ?? contract

  const pdfDocument = useMemo(
    () => <CaisseImprevuePDFV3 contract={baseContract} fillData={previewFillData} />,
    [baseContract, previewFillData]
  )

  const handleDownloadPDF = async () => {
    if (!baseContract) return
    setIsExporting(true)
    try {
      const blob = await pdf(<CaisseImprevuePDFV3 contract={baseContract} fillData={fillData} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      const last = String(baseContract.memberLastName ?? '').toUpperCase().replace(/\s+/g, '_')
      const first = String(baseContract.memberFirstName ?? '').toUpperCase().replace(/\s+/g, '_')
      const year = new Date().getFullYear()
      link.download = `${last}_${first}_CAISSE_IMPREVUE_MK_${year}.pdf`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const isLoading = Boolean(contract?.memberId) && memberLoading

  if (!contract || !baseContract) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[95vw] !max-w-[1400px] max-h-[95vh] overflow-y-auto lg:overflow-hidden bg-white border-0 shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 lg:pb-6 border-b border-gray-200">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="p-2 lg:p-3 rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg flex-shrink-0">
                <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent">
                  <span className="inline-flex items-center gap-2">
                    <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-[#234D65]" />
                    <span>Contrat Caisse Imprévue</span>
                  </span>
                </DialogTitle>
                <DialogDescription className="text-sm lg:text-base text-gray-600 truncate">
                  {contract.memberFirstName} {contract.memberLastName} - Contrat #{contract.id.slice(-6)}
                </DialogDescription>
              </div>
            </div>
          </div>
          <Button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="mr-2 lg:mr-10 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-10 px-4 lg:h-12 lg:px-6 flex-shrink-0"
          >
            <div className="flex items-center gap-2">
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden lg:inline">Génération...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span className="hidden lg:inline">Télécharger PDF</span>
                </>
              )}
            </div>
          </Button>
        </DialogHeader>

        <div className="flex-1 min-h-[600px] lg:h-[calc(95vh-150px)] overflow-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-[#234D65] mx-auto" />
                <p className="text-gray-600">Chargement des informations du membre...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="lg:hidden h-full">
                <Card className="h-full bg-gradient-to-br from-white via-gray-50/30 to-white border-0 shadow-lg">
                  <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="space-y-3">
                      <div className="mx-auto w-14 h-14 bg-gradient-to-br from-[#234D65] to-[#2c5a73] rounded-full flex items-center justify-center shadow-lg">
                        <Smartphone className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Contrat disponible</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          Le contrat PDF est prêt. Ouvrez-le dans le navigateur ou téléchargez-le.
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 w-full space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Contrat:</span>
                        <span className="font-medium text-gray-900">Caisse Imprévue</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Membre:</span>
                        <span className="font-medium text-gray-900">{contract.memberFirstName} {contract.memberLastName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Forfait:</span>
                        <span className="font-medium text-gray-900">{contract.subscriptionCIAmountPerMonth.toLocaleString('fr-FR')} FCFA/mois</span>
                      </div>
                    </div>

                    <BlobProvider document={pdfDocument}>
                      {({ url, loading }) => (
                        <div className="w-full space-y-2">
                          <Button asChild disabled={loading || !url} className="w-full h-11 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg">
                            <a href={url ?? '#'} target="_blank" rel="noopener noreferrer">
                              <FileText className="w-4 h-4 mr-2" />
                              Ouvrir dans le navigateur
                            </a>
                          </Button>
                          <Button
                            onClick={handleDownloadPDF}
                            disabled={isExporting || loading}
                            variant="outline"
                            className="w-full h-11 border-2 border-[#234D65] text-[#234D65] hover:bg-[#234D65] hover:text-white"
                          >
                            {isExporting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Génération...
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4 mr-2" />
                                Télécharger le PDF
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </BlobProvider>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 w-full">
                      <div className="flex items-start gap-2">
                        <Monitor className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-700 leading-relaxed">
                          <strong>Astuce:</strong> Pour remplir le contrat et signer directement, utilisez un ordinateur.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

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

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-kara-primary-dark">Date limite de versement (point 3)</p>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Ex: 05"
                        value={fillData.paymentDueDay}
                        onChange={(event) => {
                          const nextValue = event.target.value.replace(/\D/g, '').slice(0, 2)
                          setFillData((prev) => ({ ...prev, paymentDueDay: nextValue }))
                        }}
                        className="h-9"
                      />
                      <p className="text-[11px] text-gray-500">
                        Jour du mois affiché dans: « au plus tard le ... de chaque mois »
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-kara-primary-dark">Signatures numériques</p>
                      <SignaturePad
                        title="Signature membre (lu et approuvé)"
                        value={fillData.memberSignature}
                        onChange={(value) => {
                          skipDebouncePreviewRef.current = true
                          setFillData((prev) => ({ ...prev, memberSignature: value }))
                        }}
                      />
                      <SignaturePad
                        title="Signature Secrétaire Exécutif"
                        value={fillData.secretarySignature}
                        onChange={(value) => {
                          skipDebouncePreviewRef.current = true
                          setFillData((prev) => ({ ...prev, secretarySignature: value }))
                        }}
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
                    }}
                    showToolbar={true}
                  >
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
