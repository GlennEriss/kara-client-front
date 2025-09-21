"use client"

import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, CreditCard, User, FileText, Receipt, ChevronDown, ChevronRight, Users } from "lucide-react"
import type { CaissePayment, GroupPaymentContribution, CaisseContract } from "@/services/caisse/types"

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
interface GroupPaymentInvoiceProps {
  payment: CaissePayment
  contractData: CaisseContract
}

// ————————————————————————————————————————————————————————————
// Component
// ————————————————————————————————————————————————————————————
export default function GroupPaymentInvoice({ 
  payment, 
  contractData 
}: GroupPaymentInvoiceProps) {
  const [expandedContributions, setExpandedContributions] = useState<Set<string>>(new Set())

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

  const toggleContribution = (contributionId: string) => {
    const newExpanded = new Set(expandedContributions)
    if (newExpanded.has(contributionId)) {
      newExpanded.delete(contributionId)
    } else {
      newExpanded.add(contributionId)
    }
    setExpandedContributions(newExpanded)
  }

  const contributions = payment.groupContributions || []
  const totalAmount = contributions.reduce((sum, contrib) => sum + contrib.amount, 0)

  return (
    <div className="space-y-6">
      {/* Statut du paiement */}
      <div className="flex items-center justify-between p-4 rounded-lg border bg-green-50 border-green-200">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="font-medium text-green-800">Paiement collectif confirmé</span>
        </div>
        <Badge className="bg-green-100 text-green-800 border-green-200">
          Payé
        </Badge>
      </div>

      {/* Résumé de l'échéance */}
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
              <span className="text-slate-600">Montant cible :</span>
              <span className="font-medium">{formatAmount(payment.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Montant collecté :</span>
              <span className="font-medium text-green-600">{formatAmount(totalAmount)}</span>
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
            <Users className="h-4 w-4" />
            Résumé des contributions
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Nombre de contributeurs :</span>
              <span className="font-medium">{contributions.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Date de paiement :</span>
              <span className="font-medium">{formatDate(payment.paidAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Statut :</span>
              <span className="font-medium text-green-600">Objectif atteint</span>
            </div>
          </div>
        </div>
      </div>

      {/* Accordéon des contributions */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Détail des contributions ({contributions.length})
        </h3>
        
        <div className="space-y-2">
          {contributions.map((contribution, index) => {
            const isExpanded = expandedContributions.has(contribution.id)
            
            return (
              <div key={contribution.id} className="border rounded-lg">
                {/* En-tête de la contribution */}
                <button
                  onClick={() => toggleContribution(contribution.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      )}
                      <span className="font-medium">Contribution #{index + 1}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>{contribution.memberName}</span>
                      <span className="font-mono text-xs">{contribution.memberMatricule}</span>
                      <span className="font-medium text-green-600">{formatAmount(contribution.amount)}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {getPaymentModeLabel(contribution.mode)}
                  </Badge>
                </button>

                {/* Contenu détaillé de la contribution */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t bg-slate-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Membre :</span>
                          <span className="font-medium">{contribution.memberName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Matricule :</span>
                          <span className="font-medium font-mono">{contribution.memberMatricule}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Montant :</span>
                          <span className="font-medium">{formatAmount(contribution.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Mode de paiement :</span>
                          <span className="font-medium">{getPaymentModeLabel(contribution.mode)}</span>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Heure :</span>
                          <span className="font-medium">{contribution.time}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Date :</span>
                          <span className="font-medium">{formatDate(contribution.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">ID de paiement :</span>
                          <span className="font-medium font-mono text-xs">{contribution.id}</span>
                        </div>
                        {contribution.proofUrl && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Preuve :</span>
                            <span className="font-medium text-green-600">✓ Téléversée</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
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
              <span className="font-medium">Contrat de groupe</span>
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
    </div>
  )
}
