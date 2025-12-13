"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Phone } from "lucide-react"
import type { CalendarCommissionItem } from "@/hooks/useCalendarPlacement"
import type { PayoutMode } from "@/types/types"
import { getUserById } from "@/db/user.db"

interface CommissionSidebarHeaderPlacementProps {
  commission: CalendarCommissionItem
  onClose: () => void
}

const PAYOUT_MODE_LABELS: Record<PayoutMode, string> = {
  MonthlyCommission_CapitalEnd: "Commission mensuelle",
  CapitalPlusCommission_End: "Capital + commissions à la fin",
}

const PLACEMENT_STATUS_LABELS = {
  Draft: "Brouillon",
  Active: "Actif",
  Closed: "Clos",
  EarlyExit: "Retrait anticipé",
  Canceled: "Annulé",
}

export function CommissionSidebarHeaderPlacement({
  commission,
  onClose,
}: CommissionSidebarHeaderPlacementProps) {
  const placement = commission.placement
  const benefactorDisplayName = commission.benefactorDisplayName
  const benefactorPhone = placement.benefactorPhone

  return (
    <div className="p-4 border-b bg-white">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-lg font-bold">Détails de la commission</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Informations du bienfaiteur */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback>
            {benefactorDisplayName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="font-semibold">{benefactorDisplayName}</div>
          {placement.benefactorId && (
            <div className="text-sm text-gray-600">ID: {placement.benefactorId.slice(-8)}</div>
          )}
          {benefactorPhone && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <Phone className="h-3 w-3" />
              {benefactorPhone}
            </div>
          )}
        </div>
      </div>

      {/* Informations du placement */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Mode de règlement:</span>
          <Badge variant="outline">
            {PAYOUT_MODE_LABELS[placement.payoutMode]}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">ID du placement:</span>
          <span className="text-sm font-mono">#{placement.id.slice(-8)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Statut:</span>
          <Badge
            variant={
              placement.status === "Active"
                ? "default"
                : placement.status === "Closed"
                ? "secondary"
                : "destructive"
            }
          >
            {PLACEMENT_STATUS_LABELS[placement.status]}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Montant du placement:</span>
          <span className="text-sm font-semibold">
            {placement.amount.toLocaleString("fr-FR")} FCFA
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Taux de commission:</span>
          <span className="text-sm font-semibold">
            {placement.rate}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Durée:</span>
          <span className="text-sm">
            {placement.periodMonths} mois
          </span>
        </div>
        {placement.startDate && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Date de début:</span>
            <span className="text-sm">
              {placement.startDate instanceof Date 
                ? placement.startDate.toLocaleDateString("fr-FR")
                : new Date(placement.startDate).toLocaleDateString("fr-FR")}
            </span>
          </div>
        )}
        {placement.endDate && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Date de fin:</span>
            <span className="text-sm">
              {placement.endDate instanceof Date 
                ? placement.endDate.toLocaleDateString("fr-FR")
                : new Date(placement.endDate).toLocaleDateString("fr-FR")}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
