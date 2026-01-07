'use client'

import React, { useEffect } from 'react'
import Register from '@/components/register/Register'
import { RegisterProvider } from '@/providers/RegisterProvider'
import { useRegister } from '@/providers/RegisterProvider'
import routes from '@/constantes/routes'
import { useRouter } from 'next/navigation'

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
      router.replace(routes.admin.memberships)
    }
  }, [isSubmitted, correctionRequest, router])

  if (isSubmitted && !correctionRequest) {
    return null
  }

  return <Register />
}
