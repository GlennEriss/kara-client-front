'use client'

import React from 'react'

interface AuthFirebaseProviderProps {
  children: React.ReactNode
}

export default function AuthFirebaseProvider({ children }: AuthFirebaseProviderProps) {
  // Conservé pour compat historique, mais la gestion de session est désormais server-side (cookie HttpOnly).
  return <>{children}</>
}
