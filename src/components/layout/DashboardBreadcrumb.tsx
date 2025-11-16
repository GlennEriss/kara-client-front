'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, MoreHorizontal } from 'lucide-react'
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
  '/contracts-history': 'Historique des contrats',
  '/groups': 'Groupes',
  '/memberships/add': 'Nouveau membre',
  '/caisse-speciale': 'Caisse Spéciale',
  '/caisse-speciale/contrats': 'Contrats',
  '/caisse-speciale/settings': 'Paramètres Caisse',
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
  if (path.match(/^\/memberships\/[^\/]+\/subscriptions$/)) {
    return 'Abonnements'
  }
  if (path.match(/^\/payments-history\/[^\/]+$/)) {
    return 'Détails'
  }
  if (path.match(/^\/contracts-history\/[^\/]+$/)) {
    return 'Détails'
  }
  if (path.match(/^\/groups\/[^\/]+$/)) {
    return 'Détails'
  }
  if (path.match(/^\/caisse-speciale\/contrats\/[^\/]+$/)) {
    return 'Détails'
  }
  if (path.match(/^\/caisse-speciale\/contrats\/[^\/]+\/versements$/)) {
    return 'Versements'
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
    label: 'Tableau de bord',
    href: '/dashboard',
    isCurrent: pathname === '/dashboard'
  })

  // Vérifier si on est sur une route avec ID de contrat (caisse-speciale)
  const isContractDetailRoute = pathname.match(/^\/caisse-speciale\/contrats\/[^\/]+$/)

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

    // Cas spécial : si on est sur une route de détail de contrat et que le segment actuel est "contrats",
    // utiliser l'URL actuelle (avec l'ID) au lieu de la liste des contrats
    let href = isCurrent ? undefined : currentPath
    if (isContractDetailRoute && currentPath === '/caisse-speciale/contrats' && !isCurrent) {
      href = pathname
    }

    breadcrumbSegments.push({
      label,
      href,
      isCurrent,
      segment
    })
  }

  return breadcrumbSegments
}

// Fonction pour optimiser l'affichage sur mobile
const optimizeBreadcrumbsForMobile = (segments: any[], isMobile: boolean) => {
  if (!isMobile || segments.length <= 3) {
    return segments
  }

  // Sur mobile avec beaucoup de segments, garder seulement :
  // - Premier (Dashboard)
  // - Avant-dernier (parent)
  // - Dernier (page courante)
  const optimized = []
  
  // Toujours garder le Dashboard
  optimized.push(segments[0])
  
  // Ajouter "..." si il y a des segments intermédiaires
  if (segments.length > 3) {
    optimized.push({
      label: '...',
      href: undefined,
      isCurrent: false,
      segment: 'more',
      isEllipsis: true
    })
  }
  
  // Garder l'avant-dernier segment (parent)
  if (segments.length > 2) {
    optimized.push(segments[segments.length - 2])
  }
  
  // Toujours garder le dernier segment (page courante)
  optimized.push(segments[segments.length - 1])
  
  return optimized
}

export function DashboardBreadcrumb() {
  const pathname = usePathname()
  const segments = generateBreadcrumbSegments(pathname)
  
  // Détecter si on est sur mobile
  const [isMobile, setIsMobile] = React.useState(false)
  
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // Breakpoint md de Tailwind
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Optimiser les segments pour mobile
  const optimizedSegments = optimizeBreadcrumbsForMobile(segments, isMobile)

  // Ne pas afficher le breadcrumb si on est sur la page d'accueil du dashboard
  if (pathname === '/dashboard' && segments.length === 1) {
    return null
  }

  return (
    <Breadcrumb>
      <BreadcrumbList className="text-xs sm:text-sm flex flex-wrap items-center gap-1 sm:gap-2">
        {optimizedSegments.map((segment, index) => (
          <React.Fragment key={segment.href || segment.segment || index}>
            <BreadcrumbItem className="flex items-center">
              {segment.isEllipsis ? (
                // Afficher "..." pour les segments masqués sur mobile
                <span className="text-gray-400 flex items-center">
                  <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                </span>
              ) : segment.isCurrent ? (
                <BreadcrumbPage className="text-gray-600 font-medium truncate max-w-[120px] sm:max-w-none">
                  {segment.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link 
                    href={segment.href!}
                    className="text-gray-500 hover:text-gray-700 transition-colors truncate max-w-[100px] sm:max-w-none"
                    title={segment.label}
                  >
                    {segment.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < optimizedSegments.length - 1 && (
              <BreadcrumbSeparator className="text-gray-400 flex items-center">
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </BreadcrumbSeparator>
            )}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
} 