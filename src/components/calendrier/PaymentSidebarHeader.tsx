"use client"

import { X, Phone, Calendar, Wallet, Clock, TrendingUp, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
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

const CAISSE_TYPE_CONFIG: Record<CaisseType, { label: string; color: string }> = {
  JOURNALIERE: { label: "Journalier", color: "blue" },
  STANDARD: { label: "Standard", color: "purple" },
  LIBRE: { label: "Libre", color: "amber" },
  STANDARD_CHARITABLE: { label: "Standard Charitable", color: "purple" },
  JOURNALIERE_CHARITABLE: { label: "Journalière Charitable", color: "blue" },
  LIBRE_CHARITABLE: { label: "Libre Charitable", color: "amber" },
}

const STATUS_CONFIG: Record<string, { color: string }> = {
  ACTIVE: { color: "emerald" },
  LATE_NO_PENALTY: { color: "amber" },
  LATE_WITH_PENALTY: { color: "red" },
  COMPLETED: { color: "blue" },
  TERMINATED: { color: "gray" },
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
  
  const caisseConfig = CAISSE_TYPE_CONFIG[contract.caisseType]
  const statusConfig = STATUS_CONFIG[contract.status] || { color: "gray" }

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
            <FileText className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Détails du versement</h2>
            <p className="text-white/70 text-sm">Contrat #{contract.id?.slice(-8)}</p>
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
              {memberMatricule && (
                <div className="text-white/60 text-sm">Matricule: {memberMatricule.slice(-10)}</div>
              )}
              {memberContacts && memberContacts.length > 0 && (
                <div className="flex items-center gap-2 text-white/70 text-sm mt-1">
                  <Phone className="h-3.5 w-3.5" />
                  {memberContacts[0]}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Badges de statut */}
        <div className="flex flex-wrap gap-2">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
            caisseConfig.color === "blue" 
              ? "bg-blue-500/20 text-blue-200 border border-blue-400/30"
              : caisseConfig.color === "purple"
              ? "bg-purple-500/20 text-purple-200 border border-purple-400/30"
              : "bg-amber-500/20 text-amber-200 border border-amber-400/30"
          )}>
            <Wallet className="h-3.5 w-3.5" />
            {caisseConfig.label}
          </span>
          <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
            statusConfig.color === "emerald" 
              ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/30"
              : statusConfig.color === "amber"
              ? "bg-amber-500/20 text-amber-200 border border-amber-400/30"
              : statusConfig.color === "red"
              ? "bg-red-500/20 text-red-200 border border-red-400/30"
              : statusConfig.color === "blue"
              ? "bg-blue-500/20 text-blue-200 border border-blue-400/30"
              : "bg-gray-500/20 text-gray-200 border border-gray-400/30"
          )}>
            {translateContractStatus(contract.status)}
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
              <div className="text-xs text-blue-600 font-medium">Montant</div>
              <div className="text-sm font-bold text-blue-900">
                {contract.monthlyAmount.toLocaleString("fr-FR")} F
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-emerald-600 font-medium">Progression</div>
              <div className="text-sm font-bold text-emerald-900">{contract.currentMonthIndex} / {contract.monthsPlanned}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
