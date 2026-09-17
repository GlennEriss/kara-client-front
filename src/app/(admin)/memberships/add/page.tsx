'use client'

import Register from '@/components/register/Register'
import routes from '@/constantes/routes'
import { RegisterProvider, useRegister } from '@/providers/RegisterProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AddMemberPage() {
  return (
    <RegisterProvider>
      <AddMemberContent />
    </RegisterProvider>
  )
}

function AddMemberContent() {
  const router = useRouter()
  const { isSubmitted, correctionRequest } = useRegister()

  useEffect(() => {
    if (isSubmitted && !correctionRequest) {
      // Une création admin produit une demande d'adhésion à traiter, pas un
      // membre déjà actif : on renvoie donc vers la liste des demandes.
      router.replace(routes.admin.membershipRequests)
    }
  }, [isSubmitted, correctionRequest, router])

  if (isSubmitted && !correctionRequest) {
    return null
  }

  return <Register />
}
