/**
 * Service de simulation pour les Demandes Caisse Imprévue V2
 * 
 * Calcule les versements selon la fréquence (DAILY vs MONTHLY)
 */

import type { CaisseImprevueDemand, CaisseImprevuePaymentFrequency } from '../entities/demand.types'

export interface PaymentScheduleItem {
  monthIndex: number
  date: Date
  amount: number
  cumulative: number
  paymentCount: number // Nombre de versements pour ce mois (1 pour MONTHLY, ~30 pour DAILY)
}

export interface PaymentSchedule {
  items: PaymentScheduleItem[]
  totalAmount: number
  totalMonths: number
  totalPayments: number
}

export class DemandSimulationService {
  private static instance: DemandSimulationService

  private constructor() {}

  static getInstance(): DemandSimulationService {
    if (!DemandSimulationService.instance) {
      DemandSimulationService.instance = new DemandSimulationService()
    }
    return DemandSimulationService.instance
  }

  /**
   * Calcule le plan de remboursement selon la fréquence
   */
  calculatePaymentSchedule(
    demand: CaisseImprevueDemand
  ): PaymentSchedule {
    const { paymentFrequency, subscriptionCIAmountPerMonth, subscriptionCIDuration, desiredStartDate } = demand

    // Convertir desiredStartDate en Date valide
    let startDate: Date
    if (desiredStartDate instanceof Date) {
      startDate = desiredStartDate
    } else if (desiredStartDate && typeof (desiredStartDate as any).toDate === 'function') {
      // Timestamp Firestore
      startDate = (desiredStartDate as any).toDate()
    } else {
      // String ou autre
      startDate = new Date(desiredStartDate)
    }

    // Vérifier que la date est valide
    if (isNaN(startDate.getTime())) {
      console.error('Date de début invalide:', desiredStartDate)
      startDate = new Date() // Utiliser la date actuelle comme fallback
    }
    const items: PaymentScheduleItem[] = []
    let cumulative = 0

    if (paymentFrequency === 'MONTHLY') {
      // Versements mensuels
      for (let monthIndex = 0; monthIndex < subscriptionCIDuration; monthIndex++) {
        const paymentDate = new Date(startDate)
        paymentDate.setMonth(paymentDate.getMonth() + monthIndex)

        cumulative += subscriptionCIAmountPerMonth

        items.push({
          monthIndex: monthIndex + 1,
          date: paymentDate,
          amount: subscriptionCIAmountPerMonth,
          cumulative,
          paymentCount: 1,
        })
      }
    } else if (paymentFrequency === 'DAILY') {
      // Versements quotidiens
      // Calculer le montant quotidien
      const daysPerMonth = 30 // Approximation
      const dailyAmount = subscriptionCIAmountPerMonth / daysPerMonth

      let currentDate = new Date(startDate)
      let monthIndex = 1
      let monthStart = new Date(currentDate)
      let monthCumulative = 0
      let monthPaymentCount = 0

      for (let day = 0; day < subscriptionCIDuration * daysPerMonth; day++) {
        // Nouveau mois ?
        if (day > 0 && currentDate.getDate() === 1) {
          // Enregistrer le mois précédent
          items.push({
            monthIndex,
            date: new Date(monthStart),
            amount: monthCumulative,
            cumulative,
            paymentCount: monthPaymentCount,
          })

          monthIndex++
          monthStart = new Date(currentDate)
          monthCumulative = 0
          monthPaymentCount = 0
        }

        cumulative += dailyAmount
        monthCumulative += dailyAmount
        monthPaymentCount++

        // Passer au jour suivant
        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Enregistrer le dernier mois
      if (monthCumulative > 0) {
        items.push({
          monthIndex,
          date: new Date(monthStart),
          amount: monthCumulative,
          cumulative,
          paymentCount: monthPaymentCount,
        })
      }
    }

    return {
      items,
      totalAmount: cumulative,
      totalMonths: subscriptionCIDuration,
      totalPayments: items.reduce((sum, item) => sum + item.paymentCount, 0),
    }
  }

  /**
   * Formate le plan de remboursement pour l'affichage
   */
  formatScheduleForDisplay(schedule: PaymentSchedule): {
    items: Array<{
      month: number
      date: string
      amount: string
      cumulative: string
      paymentCount: string
    }>
    total: {
      months: string
      amount: string
      payments: string
    }
  } {
    return {
      items: schedule.items.map((item) => ({
        month: item.monthIndex,
        date: item.date.toLocaleDateString('fr-FR'),
        amount: `${item.amount.toLocaleString('fr-FR')} FCFA`,
        cumulative: `${item.cumulative.toLocaleString('fr-FR')} FCFA`,
        paymentCount: `${item.paymentCount} versement${item.paymentCount > 1 ? 's' : ''}`,
      })),
      total: {
        months: `${schedule.totalMonths} mois`,
        amount: `${schedule.totalAmount.toLocaleString('fr-FR')} FCFA`,
        payments: `${schedule.totalPayments} versement${schedule.totalPayments > 1 ? 's' : ''}`,
      },
    }
  }
}
