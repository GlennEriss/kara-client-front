"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, CreditCard, User, FileText, Receipt } from "lucide-react"
import type { CaissePayment, IndividualPaymentContribution, CaisseContract } from "@/services/caisse/types"

// ————————————————————————————————————————————————————————————
// Helpers UI
// ————————————————————————————————————————————————————————————
const brand = {
  bg: "bg-[#234D65]",
  bgSoft: "bg-[#234D65]/10",
  text: "text-[#234D65]",
}

function classNames(...cls: (string | false | undefined)[]) {
  return cls.filter(Boolean).join(" ")
}

// ————————————————————————————————————————————————————————————
// Types
// ————————————————————————————————————————————————————————————
interface IndividualPaymentInvoiceProps {
  payment: CaissePayment
  contractData: CaisseContract
}

// ————————————————————————————————————————————————————————————
// Component
// ————————————————————————————————————————————————————————————
export default function IndividualPaymentInvoice({ 
  payment, 
  contractData 
}: IndividualPaymentInvoiceProps) {
  const formatDate = (date?: Date | string) => {
    if (!date) return "—"
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString("fr-FR", {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatAmount = (amount?: number) => {
    if (!amount) return "—"
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF'
    }).format(amount)
  }

  const getPaymentModeLabel = (mode?: string) => {
    const modes: Record<string, string> = {
      'airtel_money': 'Airtel Money',
      'mobicash': 'Mobicash',
      'cash': 'Espèce',
      'bank_transfer': 'Virement bancaire'
    }
    return modes[mode || ''] || mode || '—'
  }

  // Récupérer la dernière contribution (la plus récente)
  const latestContribution = payment.contribs?.[payment.contribs.length - 1]

  return (
    <div className="space-y-6">
      {/* Statut du paiement */}
      <div className="flex items-center justify-between p-4 rounded-lg border bg-green-50 border-green-200">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="font-medium text-green-800">Paiement confirmé</span>
        </div>
        <Badge className="bg-green-100 text-green-800 border-green-200">
          Payé
        </Badge>
      </div>

      {/* Informations de l'échéance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Informations de l'échéance
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Échéance :</span>
              <span className="font-medium">M{payment.dueMonthIndex + 1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Date d'échéance :</span>
              <span className="font-medium">{formatDate(payment.dueAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Montant :</span>
              <span className="font-medium">{formatAmount(payment.amount)}</span>
            </div>
            {payment.penaltyApplied && payment.penaltyApplied > 0 && (
              <div className="flex justify-between">
                <span className="text-red-600">Pénalité :</span>
                <span className="font-medium text-red-600">{formatAmount(payment.penaltyApplied)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Informations de paiement
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Date de paiement :</span>
              <span className="font-medium">{formatDate(payment.paidAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Mode de paiement :</span>
              <span className="font-medium">{getPaymentModeLabel(latestContribution?.mode)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Heure :</span>
              <span className="font-medium">{latestContribution?.time || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">ID de paiement :</span>
              <span className="font-medium font-mono text-xs">{latestContribution?.id || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Informations du contrat */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <User className="h-4 w-4" />
          Informations du contrat
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border bg-slate-50">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">ID du contrat :</span>
              <span className="font-medium font-mono text-xs">{contractData.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Type :</span>
              <span className="font-medium">Contrat individuel</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Type de caisse :</span>
              <span className="font-medium">{contractData.caisseType}</span>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Montant mensuel :</span>
              <span className="font-medium">{formatAmount(contractData.monthlyAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Durée :</span>
              <span className="font-medium">{contractData.monthsPlanned} mois</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Mois actuel :</span>
              <span className="font-medium">{contractData.currentMonthIndex + 1}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preuve de paiement */}
      {payment.proofUrl && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Preuve de paiement
          </h3>
          <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-800">
              ✓ Preuve de paiement téléversée et validée
            </p>
            <p className="text-xs text-blue-600 mt-1">
              ID: {latestContribution?.id}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
