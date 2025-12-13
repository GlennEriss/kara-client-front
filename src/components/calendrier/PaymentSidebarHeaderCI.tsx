"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Phone, Mail } from "lucide-react"
import type { CalendarPaymentItemCI } from "@/hooks/useCalendarCaisseImprevue"
import type { CaisseImprevuePaymentFrequency } from "@/types/types"

interface PaymentSidebarHeaderCIProps {
  payment: CalendarPaymentItemCI
  onClose: () => void
}

const PAYMENT_FREQUENCY_LABELS: Record<CaisseImprevuePaymentFrequency, string> = {
  DAILY: "Journalier",
  MONTHLY: "Mensuel",
}

const CONTRACT_STATUS_LABELS = {
  ACTIVE: "Actif",
  FINISHED: "Terminé",
  CANCELED: "Résilié",
}

export function PaymentSidebarHeaderCI({
  payment,
  onClose,
}: PaymentSidebarHeaderCIProps) {
  const contract = payment.contract
  const displayName = payment.memberDisplayName || "Membre inconnu"
  const memberPhotoURL = contract.memberPhotoUrl
  const memberContacts = contract.memberContacts || []
  const memberEmail = contract.memberEmail

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
          {contract.memberId && (
            <div className="text-sm text-gray-600">Matricule: {contract.memberId.slice(-8)}</div>
          )}
          {memberContacts.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              {memberContacts.map((contact, idx) => (
                <div key={idx} className="flex items-center gap-1 text-xs text-gray-500">
                  <Phone className="h-3 w-3" />
                  {contact}
                </div>
              ))}
            </div>
          )}
          {memberEmail && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <Mail className="h-3 w-3" />
              {memberEmail}
            </div>
          )}
        </div>
      </div>

      {/* Informations du contrat */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Type de contrat:</span>
          <Badge variant="outline">
            {PAYMENT_FREQUENCY_LABELS[contract.paymentFrequency]}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">ID du contrat:</span>
          <span className="text-sm font-mono">#{contract.id.slice(-8)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Statut:</span>
          <Badge
            variant={
              contract.status === "ACTIVE"
                ? "default"
                : contract.status === "FINISHED"
                ? "secondary"
                : "destructive"
            }
          >
            {CONTRACT_STATUS_LABELS[contract.status]}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Forfait:</span>
          <span className="text-sm font-semibold">
            {contract.subscriptionCICode}
            {contract.subscriptionCILabel && ` - ${contract.subscriptionCILabel}`}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Montant mensuel:</span>
          <span className="text-sm font-semibold">
            {contract.subscriptionCIAmountPerMonth.toLocaleString("fr-FR")} FCFA
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Progression:</span>
          <span className="text-sm">
            {contract.totalMonthsPaid} / {contract.subscriptionCIDuration} mois
          </span>
        </div>
      </div>
    </div>
  )
}
