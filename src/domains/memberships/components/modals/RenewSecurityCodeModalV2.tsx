/**
 * Modal de confirmation pour régénérer le code de sécurité V2
 * 
 * Affiche un avertissement clair et demande confirmation avant de régénérer le code.
 */

'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RotateCcw, Loader2, AlertTriangle } from 'lucide-react'
import { useState } from 'react'

interface RenewSecurityCodeModalV2Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  requestId: string
  memberName: string
  currentCode?: string
  currentExpiry?: Date | string
  isLoading?: boolean
}

/**
 * Formate le code de sécurité (AB12-CD34)
 */
function formatSecurityCode(code: string): string {
  if (!code || code.length !== 6) return code
  return `${code.slice(0, 2)}-${code.slice(2, 4)}-${code.slice(4, 6)}`
}

export function RenewSecurityCodeModalV2({
  isOpen,
  onClose,
  onConfirm,
  requestId,
  memberName,
  currentCode,
  currentExpiry,
  isLoading = false,
}: RenewSecurityCodeModalV2Props) {
  const [isConfirmed, setIsConfirmed] = useState(false)

  const handleConfirm = async () => {
    if (!isConfirmed) return
    await onConfirm()
    setIsConfirmed(false)
  }

  const handleClose = () => {
    if (!isLoading) {
      setIsConfirmed(false)
      onClose()
    }
  }

  const formattedCurrentCode = currentCode ? formatSecurityCode(currentCode) : 'N/A'

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="renew-code-modal">
        <DialogHeader>
          <DialogTitle 
            className="flex items-center gap-2 text-xl font-bold text-kara-primary-dark"
            data-testid="renew-code-modal-title"
          >
            <RotateCcw className="w-5 h-5 text-amber-600" />
            Régénérer le code de sécurité
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Régénérer le code invalide l'ancien code. Le demandeur devra utiliser le nouveau code pour accéder aux corrections.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Avertissement */}
          <div 
            className="p-3 bg-amber-50 border border-amber-200 rounded-lg"
            data-testid="renew-code-modal-warning"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900 mb-1">
                  Attention
                </p>
                <p className="text-xs text-amber-700">
                  Régénérer le code invalide l'ancien code. Le demandeur devra utiliser le nouveau code pour accéder aux corrections.
                </p>
              </div>
            </div>
          </div>

          {/* Code actuel */}
          {currentCode && (
            <div className="space-y-2" data-testid="renew-code-modal-current-code">
              <Label className="text-sm font-semibold text-kara-primary-dark">
                Code actuel
              </Label>
              <div 
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm font-mono font-semibold"
                data-testid="renew-code-modal-current-code-value"
              >
                {formattedCurrentCode}
              </div>
            </div>
          )}

          {/* Expiration actuelle */}
          {currentExpiry && (
            <div className="space-y-2" data-testid="renew-code-modal-current-expiry">
              <Label className="text-sm font-semibold text-kara-primary-dark">
                Expire le
              </Label>
              <div 
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm"
                data-testid="renew-code-modal-current-expiry-value"
              >
                {typeof currentExpiry === 'string' 
                  ? new Date(currentExpiry).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : currentExpiry.toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
              </div>
            </div>
          )}

          {/* Checkbox de confirmation */}
          <div className="space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                disabled={isLoading}
                className="mt-1"
                data-testid="renew-code-modal-confirm-checkbox"
              />
              <span className="text-sm text-gray-700" data-testid="renew-code-modal-confirm-label">
                Je comprends que régénérer le code invalide l'ancien code et que le demandeur devra utiliser le nouveau code.
              </span>
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="border-gray-300"
            data-testid="renew-code-modal-cancel-button"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isConfirmed || isLoading}
            className="bg-amber-600 hover:bg-amber-700 text-white"
            data-testid="renew-code-modal-renew-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Régénération...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-2" />
                Régénérer le code
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
