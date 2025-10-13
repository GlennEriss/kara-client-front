'use client'
import React from 'react'
import ListSubscriptionCISection from '@/components/caisse-imprevue/ListSubscriptionCISection'
import { SubscriptionCIProvider } from '@/components/caisse-imprevue/SubscriptionCIContext'

export default function CaisseImprevuePage() {
  return (
    <SubscriptionCIProvider>
      <ListSubscriptionCISection />
    </SubscriptionCIProvider>
  )
}
