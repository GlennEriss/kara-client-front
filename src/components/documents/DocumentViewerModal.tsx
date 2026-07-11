'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { downloadFile } from '@/utils/downloadFile'
import { AlertCircle, Download, FileText, Monitor, Smartphone } from 'lucide-react'
import { toast } from 'sonner'

interface DocumentViewerModalProps {
  isOpen: boolean
  onClose: () => void
  /** URL du document (Firebase Storage). Si absente → message « non disponible ». */
  url?: string | null
  /** Nom de fichier pour le téléchargement (ex: NOM_PRENOM_CONTRAT.pdf). */
  filename: string
  /** Titre affiché dans l'en-tête (par défaut « Document »). */
  title?: string
  /** Sous-titre optionnel (ex: nom du membre · #id). */
  subtitle?: string
}

/**
 * Modale d'aperçu + téléchargement d'un document, mobile-first.
 *
 * Reprend le mécanisme validé de la Caisse Imprévue :
 * - Mobile : carte d'information + bouton « Télécharger » (l'aperçu iframe est
 *   inconfortable sur petit écran).
 * - Desktop : aperçu iframe du document.
 * - Le téléchargement passe par le proxy `/api/download` (Content-Disposition:
 *   attachment) afin de forcer un vrai téléchargement quel que soit le navigateur.
 */
export default function DocumentViewerModal({
  isOpen,
  onClose,
  url,
  filename,
  title = 'Document',
  subtitle,
}: DocumentViewerModalProps) {
  const handleDownload = () => {
    if (!downloadFile(url, filename)) {
      toast.error('URL du document non disponible')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[95vw] !max-w-[1200px] max-h-[95vh] overflow-y-auto lg:overflow-hidden bg-white border-0 shadow-2xl">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 lg:pb-6 border-b border-gray-200">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="p-2 lg:p-3 rounded-xl bg-gradient-to-br from-[#234D65] to-[#2c5a73] shadow-lg flex-shrink-0">
                <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-[#234D65] to-[#2c5a73] bg-clip-text text-transparent truncate">
                  {title}
                </DialogTitle>
                {subtitle && (
                  <DialogDescription className="text-sm lg:text-base text-gray-600 truncate">
                    {subtitle}
                  </DialogDescription>
                )}
              </div>
            </div>
          </div>
          <Button
            onClick={handleDownload}
            disabled={!url}
            className="mr-2 lg:mr-10 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-10 px-4 lg:h-12 lg:px-6 flex-shrink-0"
          >
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden lg:inline">Télécharger</span>
            </div>
          </Button>
        </DialogHeader>

        {/* Contenu principal */}
        <div className="flex-1 min-h-[600px] lg:h-[calc(95vh-150px)] overflow-hidden">
          {!url ? (
            <Alert className="border-0 bg-gradient-to-r from-orange-50 to-amber-50">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <AlertDescription className="text-orange-700 font-medium">
                Document non disponible
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Version mobile : carte + bouton */}
              <div className="lg:hidden h-full">
                <Card className="h-full bg-gradient-to-br from-white via-gray-50/30 to-white border-0 shadow-lg">
                  <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="space-y-3">
                      <div className="mx-auto w-14 h-14 bg-gradient-to-br from-[#234D65] to-[#2c5a73] rounded-full flex items-center justify-center shadow-lg">
                        <Smartphone className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Document disponible</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          Le document est prêt ! Téléchargez-le pour le consulter.
                        </p>
                      </div>
                    </div>

                    <div className="w-full space-y-2">
                      <Button
                        onClick={handleDownload}
                        className="w-full h-11 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#2c5a73] hover:to-[#234D65] text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Télécharger
                      </Button>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 w-full">
                      <div className="flex items-start gap-2">
                        <Monitor className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-700 leading-relaxed">
                          <strong>Astuce :</strong> pour prévisualiser le document,
                          utilisez un ordinateur ou une tablette.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Version desktop : aperçu iframe */}
              <div className="hidden lg:block h-full rounded-xl overflow-hidden shadow-inner bg-white border">
                <iframe src={url} className="w-full h-full border-none" title={title} />
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
