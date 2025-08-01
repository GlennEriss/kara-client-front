"use client"

import LayoutDashboard from '@/components/layout/LayoutDashboard'
import React from 'react'

export default function AdminLayout({ children }:  React.PropsWithChildren) {
  return (
    <LayoutDashboard>
        {children}
    </LayoutDashboard>
  )
}
