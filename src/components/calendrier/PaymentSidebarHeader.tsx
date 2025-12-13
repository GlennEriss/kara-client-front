"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Phone, Mail } from "lucide-react"
import { translateContractStatus } from "@/utils/contract-status"
import type { CalendarPaymentItem } from "@/hooks/useCalendarCaisseSpeciale"
import type { CaisseType } from "@/services/caisse/types"

interface PaymentSidebarHeaderProps {
  payment: CalendarPaymentItem
  memberName?: string
  memberMatricule?: string
  memberPhotoURL?: string
  memberContacts?: string[]
  onClose: () => void
}

const CAISSE_TYPE_LABELS: Record<CaisseType, string> = {
  JOURNALIERE: "Journalier",
  STANDARD: "Standard",
  LIBRE: "Libre",
}

const STATUS_LABELS = {
  DUE: "À payer",
  PAID: "Payé",
  REFUSED: "Refusé",
}

export function PaymentSidebarHeader({
  payment,
  memberName,
  memberMatricule,
  memberPhotoURL,
  memberContacts,
  onClose,
}: PaymentSidebarHeaderProps) {
  const contract = payment.contract
  const displayName =
    memberName ||
    payment.memberDisplayName ||
    payment.groupDisplayName ||
    "Membre inconnu"

  return (
    <div className="p-4 border-b bg-white">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-lg font-bold">Détails du versement</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Informations du membre */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={memberPhotoURL} alt={displayName} />
          <AvatarFallback>
            {displayName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="font-semibold">{displayName}</div>
          {memberMatricule && (
            <div className="text-sm text-gray-600">Matricule: {memberMatricule}</div>
          )}
          {memberContacts && memberContacts.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              {memberContacts.map((contact, idx) => (
                <div key={idx} className="flex items-center gap-1 text-xs text-gray-500">
                  <Phone className="h-3 w-3" />
                  {contact}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Informations du contrat */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Type de contrat:</span>
          <Badge variant="outline">
            {CAISSE_TYPE_LABELS[contract.caisseType]}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">ID du contrat:</span>
          <span className="text-sm font-mono">#{contract.id?.slice(-8)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Statut:</span>
          <Badge
            variant={
              contract.status === "ACTIVE"
                ? "default"
                : contract.status === "LATE_NO_PENALTY" ||
                  contract.status === "LATE_WITH_PENALTY"
                ? "destructive"
                : "secondary"
            }
          >
            {translateContractStatus(contract.status)}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Montant mensuel:</span>
          <span className="text-sm font-semibold">
            {contract.monthlyAmount.toLocaleString("fr-FR")} FCFA
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Progression:</span>
          <span className="text-sm">
            {contract.currentMonthIndex} / {contract.monthsPlanned} mois
          </span>
        </div>
      </div>
    </div>
  )
}
