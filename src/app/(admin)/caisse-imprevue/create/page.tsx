import FormCaisseImprevue from '@/components/caisse-imprevue/FormCaisseImprevue'
import { FormCaisseImprevueProvider } from '@/providers/FormCaisseImprevueProvider'
import React from 'react'

export default function CreateCaisseImprevuePage() {
  return (
    <FormCaisseImprevueProvider>
      <FormCaisseImprevue />
    </FormCaisseImprevueProvider>
  )
}
