/**
 * Utilitaires pour les calculs de crédit spéciale
 */

export interface ScheduleItem {
  month: number
  date: Date
  payment: number
  interest: number
  principal: number
  remaining: number
}

export interface CalculateScheduleParams {
  amount: number
  interestRate: number
  monthlyPayment: number
  firstPaymentDate: Date
  maxDuration?: number
}

/**
 * Fonction d'arrondi personnalisée
 * Si la partie décimale < 0.5, on garde l'entier
 * Si la partie décimale >= 0.5, on arrondit à l'entier supérieur
 */
export function customRound(value: number): number {
  const decimal = value % 1
  if (decimal < 0.5) {
    return Math.floor(value)
  } else {
    return Math.ceil(value)
  }
}

/**
 * Calcule l'échéancier de remboursement pour un crédit
 * @param params - Paramètres du calcul
 * @returns Tableau des échéances avec détails
 */
export function calculateSchedule(params: CalculateScheduleParams): ScheduleItem[] {
  const { amount, interestRate, monthlyPayment, firstPaymentDate, maxDuration = Infinity } = params
  
  const monthlyRate = interestRate / 100
  const schedule: ScheduleItem[] = []
  let remaining = amount

  for (let i = 0; i < maxDuration; i++) {
    const date = new Date(firstPaymentDate)
    date.setMonth(date.getMonth() + i)
    
    // Si le solde est déjà à 0 (ou très proche de 0), ne pas ajouter de ligne
    if (remaining <= 0.01) {
      break
    }
    
    // 1. Calcul des intérêts sur le solde actuel (sans arrondi pour le calcul)
    const interest = remaining * monthlyRate
    // 2. Montant global = reste dû + intérêts (sans arrondi pour le calcul)
    const balanceWithInterest = remaining + interest
    
    // 3. Versement effectué
    let payment: number
    
    if (balanceWithInterest <= monthlyPayment) {
      // Si le montant global (avec intérêts) est inférieur ou égal à la mensualité souhaitée,
      // on paie le montant global (capital + intérêts)
      payment = balanceWithInterest
      remaining = 0
    } else {
      // Si le montant global est supérieur à la mensualité souhaitée,
      // on paie la mensualité souhaitée
      payment = monthlyPayment
      // 4. Nouveau solde après versement = montant global - paiement
      remaining = Math.max(0, balanceWithInterest - payment)
    }

    // Arrondir uniquement pour l'affichage, mais garder remaining non arrondi pour les calculs suivants
    const roundedPayment = customRound(payment)
    const roundedInterest = customRound(interest)
    const roundedBalanceWithInterest = customRound(balanceWithInterest)
    const roundedRemaining = customRound(remaining)

    schedule.push({
      month: i + 1,
      date,
      payment: roundedPayment,
      interest: roundedInterest,
      principal: roundedBalanceWithInterest,
      remaining: roundedRemaining,
    })
    
    // Si le solde est à 0 après ce paiement, on peut arrêter
    if (remaining <= 0.01) {
      break
    }
  }

  return schedule
}

