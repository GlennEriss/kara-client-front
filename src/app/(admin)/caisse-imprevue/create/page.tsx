import FormCaisseImprevue from '@/components/caisse-imprevue/FormCaisseImprevue'
import { FormCaisseImprevueProvider } from '@/providers/FormCaisseImprevueProvider'

export default function CreateCaisseImprevuePage() {
  return (
    <FormCaisseImprevueProvider>
      <FormCaisseImprevue />
    </FormCaisseImprevueProvider>
  )
}
