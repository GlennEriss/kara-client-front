/**
 * Construit les segments du breadcrumb à partir du pathname courant.
 *
 * Pattern : on enchaîne explicitement les segments pour chaque famille de routes.
 * Le dernier segment (= page courante) n'a pas de href.
 */

export type BreadcrumbSegment = {
  label: string
  href?: string
}

// === Ancres réutilisables (parents stables) ===
const TB: BreadcrumbSegment = { label: 'Tableau de bord', href: '/dashboard' }
const MEMBERS: BreadcrumbSegment = { label: 'Membres', href: '/memberships' }
const MEMBERSHIP_REQUESTS: BreadcrumbSegment = { label: "Demandes d'adhésion", href: '/membership-requests' }
const ADMINS: BreadcrumbSegment = { label: 'Administrateurs', href: '/admin' }
const AGENTS: BreadcrumbSegment = { label: 'Agents de recouvrement', href: '/admin/agents-recouvrement' }
const CS: BreadcrumbSegment = { label: 'Caisse spéciale', href: '/caisse-speciale' }
const CI: BreadcrumbSegment = { label: 'Caisse imprévue', href: '/caisse-imprevue' }
// /credit-* n'ont pas de page racine, on pointe vers la première sous-page
const CREDIT_SP: BreadcrumbSegment = { label: 'Crédit spéciale', href: '/credit-speciale/simulations' }
const CREDIT_FX: BreadcrumbSegment = { label: 'Crédit fixe', href: '/credit-fixe/simulation' }
const CREDIT_AD: BreadcrumbSegment = { label: 'Caisse aide', href: '/credit-aide/simulation' }
const PLACEMENTS: BreadcrumbSegment = { label: 'Placements', href: '/placements' }
const EVENTS: BreadcrumbSegment = { label: 'Événements', href: '/events' }
const BIENFAITEUR: BreadcrumbSegment = { label: 'Bienfaiteur', href: '/bienfaiteur' }
const VEHICULES: BreadcrumbSegment = { label: 'Véhicules', href: '/vehicules' }
const PAYMENTS_HISTORY: BreadcrumbSegment = { label: 'Historique des paiements', href: '/payments-history' }
const CONTRACTS_HISTORY: BreadcrumbSegment = { label: 'Historique des contrats', href: '/contracts-history' }

// Extrait l'id membre (format XXXX.MK.jjmmyy) à l'intérieur d'un id de contrat
function extractMemberIdFromContractId(contractId: string): string | null {
  const match = contractId.match(/(\d+\.MK\.\d{6})/)
  return match ? match[1] : null
}

export function getBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  // ── Dashboard ────────────────────────────────────────────────────────────
  if (pathname === '/dashboard') return [{ label: 'Tableau de bord' }]

  // ── Demandes d'adhésion ──────────────────────────────────────────────────
  if (/^\/membership-requests\/[^/]+$/.test(pathname)) {
    return [TB, MEMBERSHIP_REQUESTS, { label: 'Détails' }]
  }
  if (pathname === '/membership-requests') return [TB, { label: "Demandes d'adhésion" }]

  // ── Membres ──────────────────────────────────────────────────────────────
  if (pathname === '/memberships/add') return [TB, MEMBERS, { label: 'Nouveau membre' }]
  if (pathname === '/memberships/anniversaires') return [TB, MEMBERS, { label: 'Anniversaires' }]
  if (/^\/memberships\/update\/[^/]+$/.test(pathname)) {
    return [TB, MEMBERS, { label: 'Mise à jour' }]
  }
  if (/^\/memberships\/[^/]+\/subscriptions$/.test(pathname)) {
    const id = pathname.split('/')[2]
    return [TB, MEMBERS, { label: 'Détails', href: `/memberships/${id}` }, { label: 'Abonnements' }]
  }
  if (/^\/memberships\/[^/]+\/documents$/.test(pathname)) {
    const id = pathname.split('/')[2]
    return [TB, MEMBERS, { label: 'Détails', href: `/memberships/${id}` }, { label: 'Documents' }]
  }
  if (/^\/memberships\/[^/]+\/filleuls$/.test(pathname)) {
    const id = pathname.split('/')[2]
    return [TB, MEMBERS, { label: 'Détails', href: `/memberships/${id}` }, { label: 'Filleuls' }]
  }
  if (/^\/memberships\/[^/]+\/remunerations$/.test(pathname)) {
    const id = pathname.split('/')[2]
    return [TB, MEMBERS, { label: 'Détails', href: `/memberships/${id}` }, { label: 'Rémunérations' }]
  }
  if (/^\/memberships\/[^/]+$/.test(pathname)) {
    return [TB, MEMBERS, { label: 'Détails' }]
  }
  if (pathname === '/memberships') return [TB, { label: 'Membres' }]

  // ── Administration ───────────────────────────────────────────────────────
  if (/^\/admin\/agents-recouvrement\/[^/]+$/.test(pathname)) {
    return [TB, ADMINS, AGENTS, { label: 'Détails' }]
  }
  if (pathname === '/admin/agents-recouvrement') return [TB, ADMINS, { label: 'Agents de recouvrement' }]
  if (pathname === '/admin') return [TB, { label: 'Administrateurs' }]

  // ── Caisse spéciale ──────────────────────────────────────────────────────
  if (pathname === '/caisse-speciale/demandes/nouvelle') {
    return [TB, CS, { label: 'Demandes', href: '/caisse-speciale/demandes' }, { label: 'Nouvelle demande' }]
  }
  if (/^\/caisse-speciale\/demandes\/[^/]+\/edit$/.test(pathname)) {
    const id = pathname.split('/')[3]
    return [TB, CS,
      { label: 'Demandes', href: '/caisse-speciale/demandes' },
      { label: 'Détails', href: `/caisse-speciale/demandes/${id}` },
      { label: 'Modifier' },
    ]
  }
  if (/^\/caisse-speciale\/demandes\/[^/]+$/.test(pathname)) {
    return [TB, CS, { label: 'Demandes', href: '/caisse-speciale/demandes' }, { label: 'Détails' }]
  }
  if (pathname === '/caisse-speciale/demandes') return [TB, CS, { label: 'Demandes' }]

  if (pathname === '/caisse-speciale/contrats/nouveau') {
    return [TB, CS, { label: 'Contrats', href: '/contracts-history' }, { label: 'Nouveau contrat' }]
  }
  if (/^\/caisse-speciale\/contrats\/[^/]+\/(versements|remboursements)$/.test(pathname)) {
    const [, , , contractId, sub] = pathname.split('/')
    const memberId = extractMemberIdFromContractId(contractId)
    const contractsHref = memberId ? `/contracts-history/${memberId}` : '/contracts-history'
    return [TB, CS,
      { label: 'Contrats', href: contractsHref },
      { label: 'Détails', href: `/caisse-speciale/contrats/${contractId}` },
      { label: sub === 'versements' ? 'Versements' : 'Remboursements' },
    ]
  }
  if (/^\/caisse-speciale\/contrats\/[^/]+$/.test(pathname)) {
    const contractId = pathname.split('/')[3]
    const memberId = extractMemberIdFromContractId(contractId)
    const contractsHref = memberId ? `/contracts-history/${memberId}` : '/contracts-history'
    return [TB, CS, { label: 'Contrats', href: contractsHref }, { label: 'Détails' }]
  }
  if (pathname === '/caisse-speciale/create') return [TB, CS, { label: 'Créer' }]
  if (pathname === '/caisse-speciale/simulation') return [TB, CS, { label: 'Simulation' }]
  if (pathname === '/caisse-speciale/settings') return [TB, CS, { label: 'Paramètres' }]
  if (pathname === '/caisse-speciale') return [TB, { label: 'Caisse spéciale' }]

  // ── Caisse imprévue ──────────────────────────────────────────────────────
  if (pathname === '/caisse-imprevue/demandes/add') {
    return [TB, CI, { label: 'Demandes', href: '/caisse-imprevue/demandes' }, { label: 'Créer une demande' }]
  }
  if (/^\/caisse-imprevue\/demandes\/[^/]+\/edit$/.test(pathname)) {
    const id = pathname.split('/')[3]
    return [TB, CI,
      { label: 'Demandes', href: '/caisse-imprevue/demandes' },
      { label: 'Détails', href: `/caisse-imprevue/demandes/${id}` },
      { label: 'Modifier' },
    ]
  }
  if (/^\/caisse-imprevue\/demandes\/[^/]+$/.test(pathname)) {
    return [TB, CI, { label: 'Demandes', href: '/caisse-imprevue/demandes' }, { label: 'Détails' }]
  }
  if (pathname === '/caisse-imprevue/demandes') return [TB, CI, { label: 'Demandes' }]

  if (/^\/caisse-imprevue\/contrats\/[^/]+\/(versements|aides|remboursements)$/.test(pathname)) {
    const [, , , contractId, sub] = pathname.split('/')
    const memberId = extractMemberIdFromContractId(contractId)
    const contractsHref = memberId ? `/contracts-history/${memberId}` : '/contracts-history'
    const subLabel = sub === 'versements' ? 'Versements' : sub === 'aides' ? 'Aides' : 'Remboursements'
    return [TB, CI,
      { label: 'Contrats', href: contractsHref },
      { label: 'Détails', href: `/caisse-imprevue/contrats/${contractId}` },
      { label: subLabel },
    ]
  }
  if (/^\/caisse-imprevue\/contrats\/[^/]+$/.test(pathname)) {
    const contractId = pathname.split('/')[3]
    const memberId = extractMemberIdFromContractId(contractId)
    const contractsHref = memberId ? `/contracts-history/${memberId}` : '/contracts-history'
    return [TB, CI, { label: 'Contrats', href: contractsHref }, { label: 'Détails' }]
  }
  if (pathname === '/caisse-imprevue/create') return [TB, CI, { label: 'Créer' }]
  if (pathname === '/caisse-imprevue/settings') return [TB, CI, { label: 'Paramètres' }]
  if (pathname === '/caisse-imprevue') return [TB, { label: 'Caisse imprévue' }]

  // ── Crédit spéciale ──────────────────────────────────────────────────────
  if (pathname === '/credit-speciale/demandes/add') {
    return [TB, CREDIT_SP, { label: 'Demandes', href: '/credit-speciale/demandes' }, { label: 'Créer une demande' }]
  }
  if (/^\/credit-speciale\/demandes\/[^/]+$/.test(pathname)) {
    return [TB, CREDIT_SP, { label: 'Demandes', href: '/credit-speciale/demandes' }, { label: 'Détails' }]
  }
  if (/^\/credit-speciale\/contrats\/[^/]+$/.test(pathname)) {
    return [TB, CREDIT_SP, { label: 'Contrats', href: '/credit-speciale/contrats' }, { label: 'Détails' }]
  }
  if (pathname === '/credit-speciale/demandes') return [TB, CREDIT_SP, { label: 'Demandes' }]
  if (pathname === '/credit-speciale/contrats') return [TB, CREDIT_SP, { label: 'Contrats' }]
  if (pathname === '/credit-speciale/simulations') return [TB, CREDIT_SP, { label: 'Simulations' }]

  // ── Crédit fixe ──────────────────────────────────────────────────────────
  if (/^\/credit-fixe\/demandes\/[^/]+$/.test(pathname)) {
    return [TB, CREDIT_FX, { label: 'Demandes', href: '/credit-fixe/demandes' }, { label: 'Détails' }]
  }
  if (/^\/credit-fixe\/contrats\/[^/]+$/.test(pathname)) {
    return [TB, CREDIT_FX, { label: 'Contrats', href: '/credit-fixe/contrats' }, { label: 'Détails' }]
  }
  if (pathname === '/credit-fixe/demandes') return [TB, CREDIT_FX, { label: 'Demandes' }]
  if (pathname === '/credit-fixe/contrats') return [TB, CREDIT_FX, { label: 'Contrats' }]
  if (pathname === '/credit-fixe/simulation') return [TB, CREDIT_FX, { label: 'Simulation' }]

  // ── Caisse aide ──────────────────────────────────────────────────────────
  if (/^\/credit-aide\/demandes\/[^/]+$/.test(pathname)) {
    return [TB, CREDIT_AD, { label: 'Demandes', href: '/credit-aide/demandes' }, { label: 'Détails' }]
  }
  if (/^\/credit-aide\/contrats\/[^/]+$/.test(pathname)) {
    return [TB, CREDIT_AD, { label: 'Contrats', href: '/credit-aide/contrats' }, { label: 'Détails' }]
  }
  if (pathname === '/credit-aide/demandes') return [TB, CREDIT_AD, { label: 'Demandes' }]
  if (pathname === '/credit-aide/contrats') return [TB, CREDIT_AD, { label: 'Contrats' }]
  if (pathname === '/credit-aide/simulation') return [TB, CREDIT_AD, { label: 'Simulation' }]

  // ── Placements ───────────────────────────────────────────────────────────
  if (pathname === '/placements/demandes/add') {
    return [TB, PLACEMENTS, { label: 'Demandes', href: '/placements/demandes' }, { label: 'Nouveau placement' }]
  }
  if (/^\/placements\/demandes\/[^/]+$/.test(pathname)) {
    return [TB, PLACEMENTS, { label: 'Demandes', href: '/placements/demandes' }, { label: 'Détails' }]
  }
  if (pathname === '/placements/demandes') return [TB, PLACEMENTS, { label: 'Demandes' }]
  if (/^\/placements\/[^/]+$/.test(pathname)) {
    return [TB, PLACEMENTS, { label: 'Détails' }]
  }
  if (pathname === '/placements') return [TB, { label: 'Placements' }]

  // ── Événements ───────────────────────────────────────────────────────────
  if (pathname === '/events/nouveau') return [TB, EVENTS, { label: 'Nouvel événement' }]
  if (/^\/events\/[^/]+\/edit$/.test(pathname)) {
    const id = pathname.split('/')[2]
    return [TB, EVENTS, { label: 'Détails', href: `/events/${id}` }, { label: 'Modifier' }]
  }
  if (/^\/events\/[^/]+$/.test(pathname)) {
    return [TB, EVENTS, { label: 'Détails' }]
  }
  if (pathname === '/events') return [TB, { label: 'Événements' }]

  // ── Bienfaiteur ──────────────────────────────────────────────────────────
  if (pathname === '/bienfaiteur/create') return [TB, BIENFAITEUR, { label: 'Créer' }]
  if (/^\/bienfaiteur\/[^/]+\/modify$/.test(pathname)) {
    const id = pathname.split('/')[2]
    return [TB, BIENFAITEUR, { label: 'Détails', href: `/bienfaiteur/${id}` }, { label: 'Modifier' }]
  }
  if (/^\/bienfaiteur\/[^/]+$/.test(pathname)) {
    return [TB, BIENFAITEUR, { label: 'Détails' }]
  }
  if (pathname === '/bienfaiteur') return [TB, { label: 'Bienfaiteur' }]

  // ── Véhicules ────────────────────────────────────────────────────────────
  if (/^\/vehicules\/[^/]+\/edit$/.test(pathname)) {
    const id = pathname.split('/')[2]
    return [TB, VEHICULES, { label: 'Détails', href: `/vehicules/${id}` }, { label: 'Modifier' }]
  }
  if (/^\/vehicules\/[^/]+$/.test(pathname)) {
    return [TB, VEHICULES, { label: 'Détails' }]
  }
  if (pathname === '/vehicules') return [TB, { label: 'Véhicules' }]

  // ── Historique ───────────────────────────────────────────────────────────
  if (/^\/payments-history\/[^/]+$/.test(pathname)) {
    return [TB, PAYMENTS_HISTORY, { label: 'Détails' }]
  }
  if (pathname === '/payments-history') return [TB, { label: 'Historique des paiements' }]

  if (/^\/contracts-history\/[^/]+$/.test(pathname)) {
    return [TB, CONTRACTS_HISTORY, { label: 'Détails' }]
  }
  if (pathname === '/contracts-history') return [TB, { label: 'Historique des contrats' }]

  // ── Groupes ──────────────────────────────────────────────────────────────
  if (/^\/groups\/[^/]+$/.test(pathname)) {
    return [TB, { label: 'Groupes', href: '/groups' }, { label: 'Détails' }]
  }
  if (pathname === '/groups') return [TB, { label: 'Groupes' }]

  // ── Pages simples ────────────────────────────────────────────────────────
  if (pathname === '/calendrier') return [TB, { label: 'Calendrier' }]
  if (pathname === '/companies') return [TB, { label: 'Entreprises' }]
  if (pathname === '/geographie') return [TB, { label: 'Géographie' }]
  if (pathname === '/jobs') return [TB, { label: 'Métiers' }]
  if (pathname === '/metiers') return [TB, { label: 'Métiers' }]
  if (pathname === '/settings') return [TB, { label: 'Paramètres' }]

  // ── Fallback : reconstruction naïve à partir du pathname ────────────────
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return []
  const fallback: BreadcrumbSegment[] = [TB]
  let acc = ''
  segments.forEach((s, i) => {
    if (i === 0 && s === 'dashboard') return
    acc += `/${s}`
    const label = s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')
    const isLast = i === segments.length - 1
    fallback.push(isLast ? { label } : { label, href: acc })
  })
  return fallback
}
