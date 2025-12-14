"use client"

import { X, Phone, Mail, Calendar, Wallet, TrendingUp, PiggyBank } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { CalendarPaymentItemCI } from "@/hooks/useCalendarCaisseImprevue"
import type { CaisseImprevuePaymentFrequency } from "@/types/types"

interface PaymentSidebarHeaderCIProps {
  payment: CalendarPaymentItemCI
  onClose: () => void
}

const PAYMENT_FREQUENCY_CONFIG: Record<CaisseImprevuePaymentFrequency, { label: string; color: string }> = {
  DAILY: { label: "Journalier", color: "blue" },
  MONTHLY: { label: "Mensuel", color: "purple" },
}

const CONTRACT_STATUS_CONFIG = {
  ACTIVE: { label: "Actif", color: "emerald" },
  FINISHED: { label: "Terminé", color: "blue" },
  CANCELED: { label: "Résilié", color: "red" },
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
  
  const frequencyConfig = PAYMENT_FREQUENCY_CONFIG[contract.paymentFrequency]
  const statusConfig = CONTRACT_STATUS_CONFIG[contract.status] || { label: contract.status, color: "gray" }

  return (
    <div className="relative overflow-hidden">
      {/* Fond avec dégradé */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#234D65] via-[#2c5a73] to-[#1a3a4d]" />
      <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,white)]" />
      <div className="absolute -top-20 -right-20 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
      
      <div className="relative p-6 text-white">
        {/* Bouton fermer */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10 rounded-full hidden sm:flex"
        >
          <X className="h-5 w-5" />
        </Button>

        {/* En-tête */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg">
            <PiggyBank className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Détails du versement</h2>
            <p className="text-white/70 text-sm">Contrat #{contract.id.slice(-8)}</p>
          </div>
        </div>

        {/* Informations du membre */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-4">
          <div className="flex items-center gap-4">
            {memberPhotoURL ? (
              <img 
                src={memberPhotoURL} 
                alt={displayName}
                className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
            )}
            <div className="flex-1">
              <div className="font-semibold text-lg">{displayName}</div>
              {contract.memberId && (
                <div className="text-white/60 text-sm">Matricule: {contract.memberId.slice(-10)}</div>
              )}
              {memberContacts.length > 0 && (
                <div className="flex items-center gap-2 text-white/70 text-sm mt-1">
                  <Phone className="h-3.5 w-3.5" />
                  {memberContacts[0]}
                </div>
              )}
              {memberEmail && (
                <div className="flex items-center gap-2 text-white/70 text-sm mt-1">
                  <Mail className="h-3.5 w-3.5" />
                  {memberEmail}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Badges de statut */}
        <div className="flex flex-wrap gap-2">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
            frequencyConfig.color === "blue" 
              ? "bg-blue-500/20 text-blue-200 border border-blue-400/30"
              : "bg-purple-500/20 text-purple-200 border border-purple-400/30"
          )}>
            <Calendar className="h-3.5 w-3.5" />
            {frequencyConfig.label}
          </span>
          <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
            statusConfig.color === "emerald" 
              ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30"
              : statusConfig.color === "blue"
              ? "bg-blue-500/20 text-blue-200 border border-blue-400/30"
              : statusConfig.color === "red"
              ? "bg-red-500/20 text-red-200 border border-red-400/30"
              : "bg-gray-500/20 text-gray-200 border border-gray-400/30"
          )}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Informations du contrat */}
      <div className="bg-white px-6 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-600">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-blue-600 font-medium">Forfait</div>
              <div className="text-sm font-bold text-blue-900">
                {contract.subscriptionCICode}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-emerald-600 font-medium">Progression</div>
              <div className="text-sm font-bold text-emerald-900">
                {contract.totalMonthsPaid} / {contract.subscriptionCIDuration}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
