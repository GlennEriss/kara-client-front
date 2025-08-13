'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

// Mapping des routes vers leurs labels pour le breadcrumb
const routeLabels: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
  '/membership-requests': 'Demandes d\'adhésion',
  '/memberships': 'Membres',
  '/admin': 'Administrateurs',
  '/settings': 'Paramètres',
  '/jobs': 'Métiers',
  '/companies': 'Entreprises',
  '/payments-history': 'Historique des paiements',
  '/groups': 'Groupes',
}

// Fonction pour obtenir le label d'une route
const getRouteLabel = (path: string): string => {
  // Vérifier d'abord les routes exactes
  if (routeLabels[path]) {
    return routeLabels[path]
  }

  // Gestion spéciale pour les routes avec ID
  if (path.match(/^\/membership-requests\/[^\/]+$/)) {
    return 'Détails'
  }
  if (path.match(/^\/memberships\/[^\/]+$/)) {
    return 'Détails'
  }
  if (path.match(/^\/payments-history\/[^\/]+$/)) {
    return 'Détails'
  }

  // Vérifier les routes qui commencent par un pattern
  for (const [route, label] of Object.entries(routeLabels)) {
    if (path.startsWith(route + '/')) {
      return label
    }
  }

  // Fallback pour les routes non reconnues
  return 'Page'
}

// Fonction pour générer les segments du breadcrumb
const generateBreadcrumbSegments = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbSegments = []

  // Ajouter le segment racine (Dashboard)
  breadcrumbSegments.push({
    label: 'Dashboard',
    href: '/dashboard',
    isCurrent: pathname === '/dashboard'
  })

  // Traiter les autres segments
  let currentPath = ''
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    currentPath += `/${segment}`
    
    // Ignorer le premier segment "dashboard" car déjà ajouté
    if (i === 0 && segment === 'dashboard') {
      continue
    }

    const label = getRouteLabel(currentPath)
    const isCurrent = currentPath === pathname

    breadcrumbSegments.push({
      label,
      href: isCurrent ? undefined : currentPath,
      isCurrent
    })
  }

  return breadcrumbSegments
}

export function DashboardBreadcrumb() {
  const pathname = usePathname()
  const segments = generateBreadcrumbSegments(pathname)

  // Ne pas afficher le breadcrumb si on est sur la page d'accueil du dashboard
  if (pathname === '/dashboard' && segments.length === 1) {
    return null
  }

  return (
    <Breadcrumb>
      <BreadcrumbList className="text-sm">
        {segments.map((segment, index) => (
          <React.Fragment key={segment.href || index}>
            <BreadcrumbItem>
              {segment.isCurrent ? (
                <BreadcrumbPage className="text-gray-600 font-medium">
                  {segment.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link 
                    href={segment.href!}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {segment.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < segments.length - 1 && (
              <BreadcrumbSeparator className="text-gray-400" />
            )}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
} 