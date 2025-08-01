import React from 'react'
import { Toaster } from "@/components/ui/sonner"
import AuthFirebaseProvider from './AuthFirebaseProvider'

export default function Providers({ children }: React.PropsWithChildren) {
  return (
    <AuthFirebaseProvider>
      {children}
      <Toaster />
    </AuthFirebaseProvider>
  )
}
