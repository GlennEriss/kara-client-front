import React from 'react'
import { Toaster } from "@/components/ui/sonner"
import ReactQueryProvider from './ReactQueryProvider'

export default function Providers({ children }: React.PropsWithChildren) {
  return (
    <ReactQueryProvider>
      {children}
      <Toaster />
    </ReactQueryProvider>
  )
}
