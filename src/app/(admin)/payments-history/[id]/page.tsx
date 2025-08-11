import React from 'react'
import PaymentHistory from '@/components/payments-history/PaymentHistory'

export default function PaymentHistoryPage({ params }: { params: { id: string } }) {
  return <PaymentHistory requestId={params.id} />
}

