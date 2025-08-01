import React from 'react'
import { Toaster } from "@/components/ui/sonner"

export default function Providers({ children }: React.PropsWithChildren) {
  return (
    <div>
        {children}
        <Toaster />
    </div>
  )
}
