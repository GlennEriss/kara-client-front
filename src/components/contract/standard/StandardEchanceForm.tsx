"use client"

import React, { useState } from "react"
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useFormContext } from "react-hook-form"
import { Eye } from "lucide-react"
import type { IndividualContractFormData, GroupContractFormData } from "@/schemas/contract.standard.schema"
import type { CaissePayment, CaisseContract } from "@/services/caisse/types"
import PaymentInvoiceModal from "./PaymentInvoiceModal"

// ————————————————————————————————————————————————————————————
// Helpers UI
// ————————————————————————————————————————————————————————————
const brand = {
  bg: "bg-[#234D65]",
  bgSoft: "bg-[#234D65]/10",
  text: "text-[#234D65]",
  ring: "ring-[#234D65]/30",
  hover: "hover:bg-[#1a3a4f]",
}

function classNames(...cls: (string | false | undefined)[]) {
  return cls.filter(Boolean).join(" ")
}

// ————————————————————————————————————————————————————————————
// Component
// ————————————————————————————————————————————————————————————

type Props = {
  payments: CaissePayment[]
  isClosed: boolean
  contractData: CaisseContract
  isGroupContract?: boolean
}

export default function StandardEchanceForm({ payments, isClosed, contractData, isGroupContract = false }: Props) {
  const { watch } = useFormContext<IndividualContractFormData | GroupContractFormData>()
  const selectedMonthIndex = watch("selectedMonthIndex")
  
  // État pour le modal de facture
  const [selectedPayment, setSelectedPayment] = useState<CaissePayment | null>(null)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)

  function paymentStatusLabel(s: string): string {
    const map: Record<string, string> = { DUE: "À payer", PAID: "Payé", REFUSED: "Refusé" }
    return map[s] || s
  }

  // Trouver la prochaine échéance à payer (la première non payée)
  const getNextDueMonthIndex = () => {
    const sortedPayments = [...payments].sort((a, b) => a.dueMonthIndex - b.dueMonthIndex)
    const nextDue = sortedPayments.find(p => p.status === "DUE")
    return nextDue ? nextDue.dueMonthIndex : -1
  }

  const nextDueMonthIndex = getNextDueMonthIndex()

  // Fonction pour ouvrir le modal de facture
  const handleViewInvoice = (payment: CaissePayment) => {
    setSelectedPayment(payment)
    setIsInvoiceModalOpen(true)
  }

  // Fonction pour calculer le montant restant à payer pour les contrats de groupe
  const calculateRemainingAmount = (payment: any) => {
    if (!isGroupContract || payment.status === "PAID") {
      return null
    }

    const targetAmount = payment.amount || contractData.monthlyAmount || 0
    const contributions = payment.groupContributions || []
    const paidAmount = contributions.reduce((sum: number, contrib: any) => sum + contrib.amount, 0)
    const remainingAmount = Math.max(0, targetAmount - paidAmount)
    
    return {
      targetAmount,
      paidAmount,
      remainingAmount
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-slate-900">Calendrier des échéances</h2>
      
      <FormField
        name="selectedMonthIndex"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <RadioGroup
                value={field.value?.toString() || ""}
                onValueChange={(value) => field.onChange(parseInt(value))}
                className="grid grid-cols-1 gap-3 md:grid-cols-3"
              >
                {payments.map((p: any) => {
                  let badge: React.ReactNode = null
                  if (p.status === "DUE" && p.dueAt) {
                    const now = new Date()
                    const due = new Date(p.dueAt)
                    const days = Math.floor((now.getTime() - due.getTime()) / 86400000)
                    if (days > 12) badge = <Badge variant="destructive">{">"}J+12</Badge>
                    else if (days >= 4) badge = <Badge variant="secondary">J+4..J+12</Badge>
                    else if (days >= 0) badge = <Badge variant="secondary">J+0..J+3</Badge>
                  }

                  // Une échéance est sélectionnable seulement si :
                  // 1. Elle est à payer (DUE)
                  // 2. Le contrat n'est pas fermé
                  // 3. C'est la prochaine échéance à payer (paiement séquentiel)
                  const isSelectable = p.status === "DUE" && !isClosed && p.dueMonthIndex === nextDueMonthIndex
                  const isSelected = selectedMonthIndex === p.dueMonthIndex

                  // Déterminer les couleurs selon le statut
                  let cardColors = ""
                  
                  if (p.status === "PAID") {
                    cardColors = "border-green-200 bg-green-50"
                  } else if (p.status === "DUE") {
                    // Différencier les échéances disponibles des futures
                    if (p.dueMonthIndex === nextDueMonthIndex) {
                      cardColors = "border-blue-200 bg-blue-50"
                    } else {
                      cardColors = "border-gray-200 bg-gray-50"
                    }
                  } else if (p.status === "REFUSED") {
                    cardColors = "border-red-200 bg-red-50"
                  } else {
                    cardColors = "border-slate-200 bg-slate-50"
                  }

                  // Couleur de sélection
                  if (isSelected) {
                    cardColors = `${brand.ring} ring-2 border-[#234D65] bg-[#234D65]/5`
                  }

                  return (
                    <div
                      key={p.id}
                      className={classNames(
                        "rounded-2xl border p-4 shadow-sm transition-all",
                        cardColors,
                        isSelected ? `${brand.ring} ring-2` : "hover:shadow-md",
                        !isSelectable && "opacity-70"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className={classNames(
                          "font-medium text-lg",
                          p.status === "PAID" ? "text-green-700" :
                            p.status === "DUE" ? 
                              (p.dueMonthIndex === nextDueMonthIndex ? "text-blue-700" : "text-gray-500") :
                              p.status === "REFUSED" ? "text-red-700" :
                                "text-slate-700"
                        )}>
                          M{p.dueMonthIndex + 1}
                        </div>
                        <div className="flex items-center gap-2">
                          {badge}
                          <Badge variant={
                            p.status === "PAID" ? "secondary" :
                              p.status === "DUE" ? 
                                (p.dueMonthIndex === nextDueMonthIndex ? "secondary" : "outline") :
                                p.status === "REFUSED" ? "destructive" :
                                  "outline"
                          } className={
                            p.status === "PAID" ? "bg-green-100 text-green-800 border-green-200" :
                              p.status === "DUE" && p.dueMonthIndex === nextDueMonthIndex ? "bg-blue-100 text-blue-800 border-blue-200" :
                                p.status === "DUE" ? "bg-gray-100 text-gray-500 border-gray-200" : ""
                          }>
                            {p.status === "DUE" && p.dueMonthIndex !== nextDueMonthIndex ? "À venir" : paymentStatusLabel(p.status)}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div>Échéance: {p.dueAt ? new Date(p.dueAt).toLocaleDateString("fr-FR") : "—"}</div>
                        <div>Payé le: {p.paidAt ? new Date(p.paidAt).toLocaleDateString("fr-FR") : "—"}</div>
                        {p.penaltyApplied ? (
                          <div className="col-span-2 text-red-600 font-medium">Pénalité: {p.penaltyApplied} FCFA</div>
                        ) : null}
                        
                        {/* Affichage du montant restant pour les contrats de groupe */}
                        {isGroupContract && p.status === "DUE" && (() => {
                          const remainingInfo = calculateRemainingAmount(p)
                          if (!remainingInfo) return null
                          
                          return (
                            <div className="col-span-2 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-600">Montant cible:</span>
                                <span className="font-medium">{remainingInfo.targetAmount.toLocaleString("fr-FR")} FCFA</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-600">Déjà versé:</span>
                                <span className="font-medium text-green-600">{remainingInfo.paidAmount.toLocaleString("fr-FR")} FCFA</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-600">Reste à payer:</span>
                                <span className={`font-medium ${remainingInfo.remainingAmount > 0 ? "text-orange-600" : "text-green-600"}`}>
                                  {remainingInfo.remainingAmount.toLocaleString("fr-FR")} FCFA
                                </span>
                              </div>
                              {remainingInfo.remainingAmount > 0 && (
                                <div className="mt-2 h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-1 bg-orange-500 rounded-full transition-all duration-300"
                                    style={{ width: `${(remainingInfo.paidAmount / remainingInfo.targetAmount) * 100}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>

                      {p.status === "PAID" ? (
                        // Bouton pour voir la facture si payé
                        <button
                          type="button"
                          onClick={() => handleViewInvoice(p)}
                          className="mt-3 flex items-center justify-center gap-2 rounded-lg border bg-[#234D65] px-3 py-2 text-sm text-white transition-colors cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                          Voir la facture
                        </button>
                      ) : (
                        // Radio button pour les échéances non payées
                        <label className={classNames(
                          "mt-3 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                          isSelectable ?
                            "hover:border-[#234D65] hover:shadow-sm" :
                            "cursor-not-allowed opacity-60",
                          isSelected ? "bg-[#234D65] text-white border-[#234D65]" : "bg-white"
                        )}>
                          <RadioGroupItem
                            value={p.dueMonthIndex.toString()}
                            disabled={!isSelectable}
                            className="accent-[#234D65]"
                          />
                          <span className={isSelected ? "text-white" : ""}>
                            {isSelectable ? "Sélectionner pour payer" : 
                              p.status === "DUE" && p.dueMonthIndex !== nextDueMonthIndex ? "À venir" :
                                "Non disponible"}
                          </span>
                        </label>
                      )}
                    </div>
                  )
                })}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Modal de facture */}
      <PaymentInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        payment={selectedPayment}
        contractData={contractData}
      />
    </div>
  )
}
