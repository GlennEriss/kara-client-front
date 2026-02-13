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
import routes from '@/constantes/routes'

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
  '/caisse-speciale/demandes': 'Demandes',
  '/caisse-speciale/demandes/nouvelle': 'Nouvelle demande',
  '/caisse-speciale/contrats': 'Contrats',
  '/caisse-speciale/contrats/nouveau': 'Nouveau contrat',
  '/caisse-speciale/simulation': 'Simulation',
  '/caisse-speciale/settings': 'Paramètres Caisse',
  '/caisse-imprevue': 'Caisse Imprévue',
  '/caisse-imprevue/create': 'Créer',
  '/caisse-imprevue/contrats': 'Contrats',
  '/caisse-imprevue/settings': 'Paramètres Caisse',
  '/caisse-imprevue/demandes': 'Liste des demandes',
  '/caisse-imprevue/demandes/add': 'Créer une demande',
  '/bienfaiteur': 'Bienfaiteur',
  '/bienfaiteur/create': 'Créer',
  '/vehicules': 'Véhicules',
  '/vehicules/create': 'Créer',
  // Crédit Spéciale
  '/credit-speciale': 'Crédit Spéciale',
  '/credit-speciale/demandes': 'Demandes',
  '/credit-speciale/simulations': 'Simulations',
  '/credit-speciale/contrats': 'Contrats',
  '/credit-speciale/demandes/add': 'Créer une demande',
  // Crédit Fixe
  '/credit-fixe': 'Crédit Fixe',
  '/credit-fixe/simulation': 'Simulation',
  '/credit-fixe/demandes': 'Demandes',
  '/credit-fixe/contrats': 'Contrats',
  // Placements
  '/placements': 'Placements',
  '/placements/demandes': 'Demandes',
  '/placements/add': 'Nouveau placement',
  // Agents de recouvrement
  '/admin/agents-recouvrement': 'Agents de recouvrement',
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
  if (path.match(/^\/caisse-speciale\/demandes\/[^\/]+$/)) {
    return path.endsWith('/nouvelle') ? 'Nouvelle demande' : 'Détails'
  }
  if (path.match(/^\/caisse-speciale\/contrats\/[^\/]+$/)) {
    return 'Détails'
  }
  if (path.match(/^\/caisse-speciale\/contrats\/[^\/]+\/versements$/)) {
    return 'Versements'
  }
  if (path.match(/^\/credit-speciale\/demandes\/[^\/]+$/)) {
    return 'Détails'
  }
  if (path.match(/^\/credit-fixe\/demandes\/[^\/]+$/)) {
    return 'Détails'
  }
  if (path.match(/^\/credit-speciale\/contrats\/[^\/]+$/)) {
    return 'Détails'
  }
  if (path.match(/^\/credit-fixe\/contrats\/[^\/]+$/)) {
    return 'Détails'
  }
  if (path.match(/^\/placements\/[^\/]+$/)) {
    return 'Détails'
  }
  if (path.match(/^\/admin\/agents-recouvrement\/[^\/]+$/)) {
    return 'Détails'
  }
  if (path.match(/^\/placements\/demandes\/[^\/]+$/)) {
    return 'Détails'
  }
  if (path.match(/^\/caisse-imprevue\/contrats\/[^\/]+$/)) {
    return 'Détails'
  }
  if (path.match(/^\/caisse-imprevue\/contrats\/[^\/]+\/versements$/)) {
    return 'Versements'
  }
  if (path.match(/^\/caisse-imprevue\/demandes\/[^\/]+$/)) {
    return 'Détails'
  }
  if (path.match(/^\/bienfaiteur\/[^\/]+$/)) {
    return 'Détails'
  }
  if (path.match(/^\/bienfaiteur\/[^\/]+\/modify$/)) {
    return 'Modifier'
  }
  if (path.match(/^\/vehicules\/[^\/]+$/)) {
    return 'Détails'
  }
  if (path.match(/^\/vehicules\/[^\/]+\/edit$/)) {
    return 'Modifier'
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

// Fonction pour extraire l'ID du membre depuis l'ID du contrat
// Format attendu: MK_CS_JOURNALIERE_8311.MK.061125_171125_1315 ou MK_CI_CONTRACT_2663.MK.260925_171125_0956
// L'ID membre a le format: XXXX.MK.jjmmyy (ex: 2663.MK.260925)
const extractMemberIdFromContractId = (contractId: string): string | null => {
  // Pattern pour extraire la partie XXXX.MK.jjmmyy
  // Le pattern cherche: un nombre, suivi de .MK., suivi de 6 chiffres (jjmmyy)
  const match = contractId.match(/(\d+\.MK\.\d{6})/)
  return match ? match[1] : null
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

  // Vérifier si on est sur une route avec ID de contrat (caisse-speciale ou caisse-imprevue)
  const contractRouteMatch = pathname.match(/^\/(caisse-speciale|caisse-imprevue)\/contrats\/([^\/]+)(?:\/.*)?$/)
  const contractId = contractRouteMatch ? contractRouteMatch[2] : null
  const memberId = contractId ? extractMemberIdFromContractId(contractId) : null

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

    // Cas spécial pour les routes de contrats
    let href = isCurrent ? undefined : currentPath

    // Crédit Spéciale : /credit-speciale n'a pas de page, rediriger vers la première sous-page (Simulations)
    if (currentPath === '/credit-speciale' && pathname.startsWith('/credit-speciale/')) {
      href = routes.admin.creditSpecialeSimulations
    }
    // Crédit Fixe : /credit-fixe n'a pas de page, rediriger vers la première sous-page (Simulation)
    if (currentPath === '/credit-fixe' && pathname.startsWith('/credit-fixe/')) {
      href = routes.admin.creditFixeSimulation
    }
    
    // Si on est sur une route de contrat et que le segment actuel est "contrats",
    // utiliser l'URL contracts-history/[memberId] au lieu de la liste des contrats
    if (contractRouteMatch && memberId && (currentPath === '/caisse-speciale/contrats' || currentPath === '/caisse-imprevue/contrats') && !isCurrent) {
      href = routes.admin.contractsHistoryDetails(memberId)
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
