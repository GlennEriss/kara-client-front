import React from 'react'
import { Toaster } from "@/components/ui/sonner"
import AuthFirebaseProvider from './AuthFirebaseProvider'
import ReactQueryProvider from './ReactQueryProvider'

export default function Providers({ children }: React.PropsWithChildren) {
  return (
    <AuthFirebaseProvider>
      <ReactQueryProvider>
        {children}
      </ReactQueryProvider>
      <Toaster />
    </AuthFirebaseProvider>
  )
}
