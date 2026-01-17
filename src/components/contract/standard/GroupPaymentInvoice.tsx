"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, User, Receipt, Users, Shield } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Image from "next/image"
import type { CaissePayment, CaisseContract } from "@/services/caisse/types"
import { useAdmin } from "@/hooks/admin/useAdmin"
import { useAuth } from "@/hooks/useAuth"

// ————————————————————————————————————————————————————————————
// Helpers UI
// ————————————————————————————————————————————————————————————
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
  const { user } = useAuth()
  const { data: admin, isLoading: isLoadingAdmin } = useAdmin(payment.updatedBy)
  
  // Déterminer les informations de l'administrateur
  const adminInfo = React.useMemo(() => {
    if (!payment.updatedBy) return null
    
    // Si c'est l'utilisateur connecté, utiliser ses informations
    if (user?.uid === payment.updatedBy) {
      return {
        firstName: user.displayName?.split(' ')[0] || 'Utilisateur',
        lastName: user.displayName?.split(' ').slice(1).join(' ') || 'Connecté',
        civility: 'Monsieur', // Valeur par défaut
        roles: ['Admin'], // Valeur par défaut
        email: user.email || undefined,
        isActive: true
      }
    }
    
    // Sinon, utiliser les données de l'admin récupérées
    return admin
  }, [user, admin, payment.updatedBy])
  
  const formatDate = (date?: Date | string | any) => {
    if (!date) return "—"
    
    let dateObj: Date
    
    // Gérer différents types de dates (Firestore Timestamp, string, Date)
    if (typeof date === 'string') {
      dateObj = new Date(date)
    } else if (date && typeof date.toDate === 'function') {
      // Firestore Timestamp
      dateObj = date.toDate()
    } else if (date instanceof Date) {
      dateObj = date
    } else {
      return "—"
    }
    
    // Vérifier si la date est valide
    if (!dateObj || isNaN(dateObj.getTime())) {
      return "—"
    }
    
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
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Informations de l'échéance
        </h3>
        <div className="space-y-3 p-4 rounded-lg border bg-slate-50">
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
          <div className="flex justify-between">
            <span className={payment.penaltyApplied && payment.penaltyApplied > 0 ? "text-red-600" : "text-slate-600"}>Pénalité :</span>
            <span className={`font-medium ${payment.penaltyApplied && payment.penaltyApplied > 0 ? "text-red-600" : "text-slate-600"}`}>
              {formatAmount(payment.penaltyApplied || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Résumé des contributions */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Résumé des contributions
        </h3>
        <div className="space-y-3 p-4 rounded-lg border bg-slate-50">
          <div className="flex justify-between">
            <span className="text-slate-600">Nombre de contributeurs :</span>
            <span className="font-medium">{contributions.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Date de paiement :</span>
            <span className="font-medium">{formatDate(payment.paidAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Mode de paiement :</span>
            <span className="font-medium">{getPaymentModeLabel(payment.mode)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Heure :</span>
            <span className="font-medium">{payment.time || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Statut :</span>
            <span className="font-medium text-green-600">Objectif atteint</span>
          </div>
        </div>
      </div>

      {/* Accordéon des contributions */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Détail des contributions ({contributions.length})
        </h3>
        
        <Accordion type="multiple" className="w-full">
          {contributions.map((contribution, index) => (
            <AccordionItem key={contribution.id} value={contribution.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-4 text-left">
                  <span className="font-medium">Contribution #{index + 1}</span>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span>{contribution.memberName}</span>
                    <span className="font-mono text-xs">{contribution.memberMatricule}</span>
                    <span className="font-medium text-green-600">{formatAmount(contribution.amount)}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs ml-auto">
                  {getPaymentModeLabel(contribution.mode)}
                </Badge>
              </AccordionTrigger>
              <AccordionContent>
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
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Informations de l'administrateur */}
      {payment.updatedBy && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Administrateur ayant traité le paiement
          </h3>
          <div className="space-y-3 p-4 rounded-lg border bg-slate-50">
            {isLoadingAdmin ? (
              <div className="flex items-center gap-2 text-slate-600">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                Chargement des informations...
              </div>
            ) : adminInfo ? (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-600">Nom :</span>
                  <span className="font-medium">{adminInfo.firstName} {adminInfo.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Civilité :</span>
                  <span className="font-medium">{adminInfo.civility}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Rôles :</span>
                  <div className="flex gap-1">
                    {adminInfo.roles.map((role, _index) => (
                      <Badge key={_index} variant="outline" className="text-xs">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
                {adminInfo.email && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Email :</span>
                    <span className="font-medium">{adminInfo.email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">Statut :</span>
                  <Badge variant={adminInfo.isActive ? "default" : "secondary"}>
                    {adminInfo.isActive ? "Actif" : "Inactif"}
                  </Badge>
                </div>
              </>
            ) : (
              <div className="text-slate-500 text-sm">
                Administrateur non trouvé (ID: {payment.updatedBy})
              </div>
            )}
          </div>
        </div>
      )}

      {/* Informations du contrat */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
          <User className="h-4 w-4" />
          Informations du contrat
        </h3>
        <div className="space-y-3 p-4 rounded-lg border bg-slate-50">
          <div className="space-y-1">
            <span className="text-slate-600">ID du contrat :</span>
            <div className="font-medium font-mono text-xs break-all bg-white p-2 rounded border">
              {contractData.id}
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Type :</span>
            <span className="font-medium">Contrat de groupe</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Type de caisse :</span>
            <span className="font-medium">{contractData.caisseType}</span>
          </div>
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

      {/* Preuve de paiement */}
      {payment.proofUrl && (
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Preuve de paiement
          </h3>
          <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
            <div className="space-y-3">
              <p className="text-sm text-blue-800">
                ✓ Preuve de paiement téléversée et validée
              </p>
              <div className="relative w-full max-w-md mx-auto">
                <Image
                  src={payment.proofUrl}
                  alt="Preuve de paiement"
                  width={400}
                  height={300}
                  className="rounded-lg border shadow-sm"
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <p className="text-xs text-blue-600 text-center">
                ID: {payment.id}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
