"use client"

import LayoutDashboard from '@/components/layout/LayoutDashboard'
import { RouteAccessGuard } from '@/components/auth/PermissionGate'
import { DocumentViewerProvider } from '@/components/documents/DocumentViewerProvider'
import React, { useEffect } from 'react'

export default function AdminLayout({ children }:  React.PropsWithChildren) {
  useEffect(() => {
    // Désactiver le scroll sur le body pour éviter le double scroll
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    
    return () => {
      // Réactiver le scroll quand on quitte l'admin
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  return (
    <LayoutDashboard>
        <DocumentViewerProvider>
          <RouteAccessGuard>{children}</RouteAccessGuard>
        </DocumentViewerProvider>
    </LayoutDashboard>
  )
}
