import { toast } from "sonner"
import { pay } from "@/services/caisse/mutations"
import { UseFormReturn } from "react-hook-form"

export class StandardContractMediator {
  /**
   * Calcule le nombre de paiements effectués
   * @param payments - Liste des paiements du contrat
   * @returns Nombre de paiements avec le statut "PAID"
   */
  static calculatePaidCount(payments: any[]): number {
    if (!payments || !Array.isArray(payments)) {
      return 0
    }
    
    return payments.filter((payment: any) => payment.status === "PAID").length
  }

  /**
   * Calcule le pourcentage de progression du contrat
   * @param paidCount - Nombre de paiements effectués
   * @param totalMonths - Nombre total de mois planifiés
   * @returns Pourcentage de progression (0-100)
   */
  static calculateProgress(paidCount: number, totalMonths: number): number {
    if (!totalMonths || totalMonths === 0) {
      return 0
    }
    
    return Math.min(100, Math.round((paidCount / totalMonths) * 100))
  }

  /**
   * Calcule le montant total dû
   * @param monthlyAmount - Montant mensuel
   * @param totalMonths - Nombre total de mois planifiés
   * @returns Montant total dû
   */
  static calculateTotalDue(monthlyAmount: number, totalMonths: number): number {
    return (monthlyAmount || 0) * (totalMonths || 0)
  }

  /**
   * Calcule le montant restant à payer
   * @param totalDue - Montant total dû
   * @param nominalPaid - Montant nominal payé
   * @returns Montant restant à payer
   */
  static calculateRemainingAmount(totalDue: number, nominalPaid: number): number {
    return Math.max(0, totalDue - (nominalPaid || 0))
  }

  /**
   * Calcule le bonus actuel basé sur les paramètres de caisse
   * @param nominalPaid - Montant nominal payé
   * @param bonusPercentage - Pourcentage de bonus actuel des paramètres de caisse
   * @returns Montant du bonus actuel
   */
  static calculateCurrentBonus(nominalPaid: number, bonusPercentage: number): number {
    if (!nominalPaid || !bonusPercentage) {
      return 0
    }
    
    return Math.round((nominalPaid * bonusPercentage) / 100)
  }

  /**
   * Gère le processus de paiement d'une échéance
   * @param data - Données du formulaire et du contrat
   */
  static async onPay(data: {
    // Form instance
    form: UseFormReturn<any>
    
    // Données du contrat
    selectedMonthIndex: number
    contractId: string
    contractData: any
    isGroupContract: boolean
    groupMembers?: any[]
    selectedGroupMemberId?: string | null
    file?: File
    refetch: () => Promise<any>
  }) {
    const {
      form,
      selectedMonthIndex,
      contractId,
      contractData,
      isGroupContract,
      groupMembers,
      selectedGroupMemberId,
      file,
      refetch
    } = data

    // Récupérer les valeurs du formulaire
    const formData = form.getValues()

    // Validation des données obligatoires
    if (!file) {
      throw new Error("Veuillez téléverser une preuve (capture) avant de payer.")
    }

    try {
      if (isGroupContract && groupMembers) {
        // Validation spécifique pour les contrats de groupe
        if (!selectedGroupMemberId) {
          throw new Error("Veuillez sélectionner le membre du groupe qui effectue le versement.")
        }

        // Utiliser la fonction payGroup pour les contrats de groupe
        const selectedMember = groupMembers.find(m => m.id === selectedGroupMemberId)
        if (!selectedMember) {
          throw new Error("Membre du groupe non trouvé")
        }

        const { payGroup } = await import('@/services/caisse/mutations')
        await payGroup({
          contractId,
          dueMonthIndex: selectedMonthIndex,
          memberId: selectedMember.id,
          memberName: `${selectedMember.firstName} ${selectedMember.lastName}`,
          memberMatricule: selectedMember.matricule || '',
          memberPhotoURL: selectedMember.photoURL || undefined,
          memberContacts: selectedMember.contacts || [],
          amount: contractData.monthlyAmount || 0,
          file,
          paidAt: new Date(`${formData.paymentDate}T${formData.paymentTime}`),
          time: formData.paymentTime,
          mode: formData.paymentMode
        })

        toast.success("Contribution ajoutée au versement collectif")
      } else {
        // Utiliser la fonction pay normale pour les contrats individuels
        await pay({
          contractId,
          dueMonthIndex: selectedMonthIndex,
          memberId: contractData.memberId,
          file,
          paidAt: new Date(`${formData.paymentDate}T${formData.paymentTime}`),
          time: formData.paymentTime,
          mode: formData.paymentMode,
        })
        toast.success("Paiement enregistré")
      }

      // Rafraîchir les données
      await refetch()
      
      // Reset du formulaire
      form.reset()
      
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du paiement")
      throw error
    }
  }
}