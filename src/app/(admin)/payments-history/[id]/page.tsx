import React from 'react'
import PaymentHistory from '@/components/payments-history/PaymentHistory'

export default async function PaymentHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PaymentHistory requestId={id} />
}

