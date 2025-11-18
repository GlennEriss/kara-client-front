import { CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react'

// Traduction des statuts de contrat (Caisse Spéciale et Caisse Imprévue)
export const translateContractStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    // Caisse Spéciale
    'DRAFT': 'En cours',
    'ACTIVE': 'Actif',
    'LATE_NO_PENALTY': 'Retard (J+0..3)',
    'LATE_WITH_PENALTY': 'Retard (J+4..12)',
    'DEFAULTED_AFTER_J12': 'Résilié (>J+12)',
    'EARLY_WITHDRAW_REQUESTED': 'Retrait anticipé demandé',
    'FINAL_REFUND_PENDING': 'Remboursement final en attente',
    'EARLY_REFUND_PENDING': 'Remboursement anticipé en attente',
    'RESCINDED': 'Résilié',
    'CLOSED': 'Clos',
    // Caisse Imprévue
    'CANCELED': 'Résilié',
    'FINISHED': 'Terminé'
  }
  return statusMap[status] || status
}

// Configuration des couleurs et icônes pour les statuts
export const getContractStatusConfig = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return {
        bg: 'bg-gradient-to-r from-green-500 to-green-600',
        text: 'text-white',
        icon: CheckCircle,
        label: translateContractStatus(status)
      }
    case 'LATE_NO_PENALTY':
      return {
        bg: 'bg-gradient-to-r from-orange-500 to-orange-600',
        text: 'text-white',
        icon: Clock,
        label: translateContractStatus(status)
      }
    case 'LATE_WITH_PENALTY':
      return {
        bg: 'bg-gradient-to-r from-red-500 to-red-600',
        text: 'text-white',
        icon: AlertTriangle,
        label: translateContractStatus(status)
      }
    case 'DEFAULTED_AFTER_J12':
    case 'RESCINDED':
    case 'CANCELED':
      return {
        bg: 'bg-gradient-to-r from-red-600 to-red-700',
        text: 'text-white',
        icon: XCircle,
        label: translateContractStatus(status)
      }
    case 'FINAL_REFUND_PENDING':
    case 'EARLY_REFUND_PENDING':
    case 'EARLY_WITHDRAW_REQUESTED':
      return {
        bg: 'bg-gradient-to-r from-amber-500 to-amber-600',
        text: 'text-white',
        icon: Clock,
        label: translateContractStatus(status)
      }
    case 'CLOSED':
    case 'FINISHED':
      return {
        bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
        text: 'text-white',
        icon: CheckCircle,
        label: translateContractStatus(status)
      }
    case 'DRAFT':
    default:
      return {
        bg: 'bg-gradient-to-r from-gray-500 to-gray-600',
        text: 'text-white',
        icon: Clock,
        label: translateContractStatus(status)
      }
  }
}

