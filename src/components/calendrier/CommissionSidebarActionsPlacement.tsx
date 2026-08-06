"use client"

import { Button } from "@/components/ui/button"
import routes from "@/constantes/routes"
import type { CalendarCommissionItem } from "@/hooks/useCalendarPlacement"
import { isCapitalRestitution } from "@/hooks/useCalendarPlacement"
import { roundFcfa } from "@/utils/placementMoney"
import { CreditCard, Download, ExternalLink, Eye, FileText, Info, Loader2 } from "lucide-react"
import Link from "next/link"

interface CommissionSidebarActionsPlacementProps {
  commission: CalendarCommissionItem
  onRecordPayment: () => void
  onViewReceipt: () => void
  onDownloadReceipt: () => void
  isGeneratingReceipt?: boolean
}

export function CommissionSidebarActionsPlacement({
  commission,
  onRecordPayment,
  onViewReceipt,
  onDownloadReceipt,
  isGeneratingReceipt = false,
}: CommissionSidebarActionsPlacementProps) {
  const isPaid = commission.status === "Paid"

  // La restitution du capital n'est pas une commission : elle se solde à la
  // clôture du placement, avec motif et quittance finale signée. Aucun
  // paiement ne peut donc être enregistré depuis le calendrier.
  if (isCapitalRestitution(commission)) {
    return (
      <div className="p-5 bg-gradient-to-t from-gray-50 to-white space-y-3">
        <div className="flex gap-3 rounded-xl border-2 border-indigo-100 bg-indigo-50 p-4">
          <Info className="h-5 w-5 flex-shrink-0 text-indigo-600" />
          <div className="text-sm text-indigo-900">
            <p className="font-semibold">Restitution du capital</p>
            <p className="mt-1 text-indigo-800">
              {roundFcfa(commission.amount).toLocaleString("fr-FR")} FCFA à remettre au bienfaiteur.
              Elle s&apos;enregistre depuis la fiche du placement, à la clôture, avec le motif et la
              quittance finale signée.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="w-full h-12 rounded-xl border-2">
          <Link href={routes.admin.placementDetails(commission.placement.id)}>
            <ExternalLink className="h-5 w-5 mr-2" />
            Ouvrir le placement
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="p-5 bg-gradient-to-t from-gray-50 to-white">
      {isPaid ? (
        <div className="space-y-3">
          <Button
            onClick={onViewReceipt}
            className="w-full h-12 bg-gradient-to-r from-[#234D65] to-[#2c5a73] hover:from-[#1a3a4d] hover:to-[#234D65] text-white shadow-lg shadow-[#234D65]/20 rounded-xl transition-all duration-300 hover:-translate-y-0.5"
          >
            <Eye className="h-5 w-5 mr-2" />
            Voir le reçu
          </Button>
          <Button
            onClick={onDownloadReceipt}
            variant="outline"
            className="w-full h-12 rounded-xl border-2 hover:bg-gray-50 transition-all duration-300"
            disabled={isGeneratingReceipt}
          >
            {isGeneratingReceipt ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                Télécharger le reçu PDF
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Button 
            onClick={onRecordPayment} 
            className="w-full h-14 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-500/30 rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            <div className="text-left">
              <div className="font-semibold">Enregistrer le paiement</div>
              <div className="text-xs text-white/80">{roundFcfa(commission.paidAmount ?? commission.amount).toLocaleString("fr-FR")} FCFA</div>
            </div>
          </Button>
          
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <FileText className="h-3.5 w-3.5" />
            <span>Une preuve de paiement sera demandée</span>
          </div>
        </div>
      )}
    </div>
  )
}
