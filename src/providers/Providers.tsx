import React from 'react'
import { MobileToolsRuntime } from '@/domains/mobile/browser/MobileToolsRuntime'
import { Toaster } from "@/components/ui/sonner"
import ReactQueryProvider from './ReactQueryProvider'

export default function Providers({ children }: React.PropsWithChildren) {
  return (
    <ReactQueryProvider>
      <MobileToolsRuntime />
      {children}
      <Toaster />
    </ReactQueryProvider>
  )
}
