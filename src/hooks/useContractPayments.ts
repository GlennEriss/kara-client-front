import { useState, useEffect } from 'react'
import { listPayments } from '@/db/caisse/payments.db'

export interface Payment {
  id: string
  dueMonthIndex: number
  dueAt?: Date
  paidAt?: Date
  amount: number
  status: 'PENDING' | 'PAID' | 'OVERDUE'
  contribs?: Array<{
    memberId: string
    amount: number
    paidAt?: Date
    status: 'PENDING' | 'PAID'
  }>
  createdAt?: Date
  updatedAt?: Date
}

export function useContractPayments(contractId: string) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!contractId) {
      setIsLoading(false)
      return
    }

    const fetchPayments = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const paymentsData = await listPayments(contractId)
        setPayments(paymentsData)
      } catch (err) {
        console.error('Erreur lors de la récupération des versements:', err)
        setError('Impossible de récupérer les versements')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPayments()
  }, [contractId])

  const refetch = async () => {
    if (!contractId) return
    
    try {
      setIsLoading(true)
      setError(null)
      const paymentsData = await listPayments(contractId)
      setPayments(paymentsData)
    } catch (err) {
      console.error('Erreur lors de la récupération des versements:', err)
      setError('Impossible de récupérer les versements')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    payments,
    isLoading,
    error,
    refetch
  }
}
