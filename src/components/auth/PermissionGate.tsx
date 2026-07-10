'use client'

import React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMyAccess } from '@/hooks/useMyAccess'
import { requiredViewPermissionForPath } from '@/constantes/permissions'
import routes from '@/constantes/routes'

/**
 * Affiche `children` uniquement si l'admin possède la (ou l'une des) permission(s).
 * À utiliser pour masquer un bouton/une action. Les superAdmins voient toujours tout.
 */
export function PermissionGate({
  permission,
  anyOf,
  fallback = null,
  children,
}: {
  permission?: string
  anyOf?: string[]
  fallback?: React.ReactNode
  children: React.ReactNode
}) {
  const { can, canAny } = useMyAccess()
  const allowed = permission ? can(permission) : anyOf ? canAny(anyOf) : true
  return <>{allowed ? children : fallback}</>
}

/** Écran « Accès refusé » réutilisable. */
export function AccessDenied() {
  const router = useRouter()
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
        <ShieldAlert className="h-8 w-8 text-red-500" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">Accès refusé</h2>
        <p className="mt-1 max-w-md text-sm text-gray-500">
          Vous n'avez pas les droits nécessaires pour accéder à cette section. Contactez un super administrateur si vous pensez qu'il s'agit d'une erreur.
        </p>
      </div>
      <Button
        onClick={() => router.push(routes.admin.dashboard)}
        className="bg-[#234D65] text-white hover:bg-[#234D65]/90"
      >
        Retour au tableau de bord
      </Button>
    </div>
  )
}

/**
 * Garde de page : rend `children` si l'admin a la permission `permission`,
 * sinon un écran « Accès refusé ». Pendant le chargement des droits, n'affiche rien.
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: string
  children: React.ReactNode
}) {
  const { can, isLoading } = useMyAccess()
  if (isLoading) return null
  if (!can(permission)) return <AccessDenied />
  return <>{children}</>
}

/**
 * Garde d'accès centralisée par URL, montée une seule fois dans le layout admin.
 * Déduit la permission requise à partir du chemin courant et bloque si l'admin
 * ne l'a pas. Aucune permission requise → passe. SuperAdmin → passe toujours.
 */
export function RouteAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { can, isLoading } = useMyAccess()

  const required = requiredViewPermissionForPath(pathname || '')

  // Pas de restriction sur ce chemin → on affiche.
  if (!required) return <>{children}</>
  // On attend la résolution des droits pour éviter un flash « Accès refusé ».
  if (isLoading) return null
  if (!can(required)) return <AccessDenied />
  return <>{children}</>
}
