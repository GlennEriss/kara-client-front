"use client"

import { useState } from "react"
import { Home, Settings, Users, Shield, LogOut, UserPlus, Briefcase, Building, Wallet, HeartHandshake, HandCoins, Car, ChevronDown, MapPin, FileText, CreditCard, Calendar, Calculator, UserCheck } from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import routes from "@/constantes/routes"
import { cn } from "@/lib/utils"
import { useLogout } from "@/domains/auth/hooks"

// Menu items pour l'administration
type SidebarSubItem = {
    title: string
    url: string
    icon: any
}

type SidebarItem =
    | {
        title: string
        url: string
        icon: any
        children?: undefined
    }
    | {
        title: string
        icon: any
        children: SidebarSubItem[]
    }

const adminMenuItems: SidebarItem[] = [
    {
        title: "Tableau de bord",
        url: "/dashboard",
        icon: Home,
    },
    {
        title: "Calendrier",
        url: routes.admin.calendrier,
        icon: Calendar,
    },
    {
        title: "Demandes d'adhésion",
        url: routes.admin.membershipRequests,
        icon: UserPlus,
    },
    {
        title: "Membres",
        url: routes.admin.memberships,
        icon: Users,
    },
    {
        title: "Caisse Spéciale",
        icon: Wallet,
        children: [
            {
                title: "Simulation",
                url: routes.admin.caisseSpecialeSimulation,
                icon: Calculator,
            },
            {
                title: "Demandes",
                url: routes.admin.caisseSpecialeDemandes,
                icon: FileText,
            },
            {
                title: "Contrats",
                url: routes.admin.caisseSpeciale,
                icon: CreditCard,
            },
        ],
    },
    {
        title: "Caisse imprévue",
        icon: HeartHandshake,
        children: [
            {
                title: "Demandes",
                url: routes.admin.caisseImprevueDemandes,
                icon: FileText,
            },
            {
                title: "Contrats",
                url: routes.admin.caisseImprevue,
                icon: CreditCard,
            },
        ],
    },
    {
        title: "Crédit Spéciale",
        icon: CreditCard,
        children: [
            {
                title: "Simulation",
                url: routes.admin.creditSpecialeSimulations,
                icon: Calculator,
            },
            {
                title: "Demandes",
                url: routes.admin.creditSpecialeDemandes,
                icon: FileText,
            },
            {
                title: "Contrats",
                url: routes.admin.creditSpecialeContrats,
                icon: CreditCard,
            },
        ],
    },
    {
        title: "Crédit Fixe",
        icon: CreditCard,
        children: [
            {
                title: "Simulation",
                url: routes.admin.creditFixeSimulation,
                icon: Calculator,
            },
            {
                title: "Demandes",
                url: routes.admin.creditFixeDemandes,
                icon: FileText,
            },
            {
                title: "Contrats",
                url: routes.admin.creditFixeContrats,
                icon: CreditCard,
            },
        ],
    },
    {
        title: "Caisse Aide",
        icon: CreditCard,
        children: [
            {
                title: "Simulation",
                url: routes.admin.creditAideSimulation,
                icon: Calculator,
            },
            {
                title: "Demandes",
                url: routes.admin.creditAideDemandes,
                icon: FileText,
            },
            {
                title: "Contrats",
                url: routes.admin.creditAideContrats,
                icon: CreditCard,
            },
        ],
    },
    {
        title: "Bienfaiteur",
        icon: HandCoins,
        children: [
            {
                title: "Charités",
                url: routes.admin.bienfaiteur,
                icon: HeartHandshake,
            },
            {
                title: "Véhicules",
                url: routes.admin.vehicules,
                icon: Car,
            },
        ],
    },
    {
        title: "Placements",
        icon: Wallet,
        children: [
            {
                title: "Demandes",
                url: routes.admin.placementDemandes,
                icon: FileText,
            },
            {
                title: "Placements",
                url: routes.admin.placements,
                icon: CreditCard,
            },
        ],
    },
    /*{
        title: "Assurance",
        url: "/dashboard/insurance",
        icon: Car,
    },
    {
        title: "Statistiques",
        url: "/dashboard/analytics",
        icon: BarChart3,
    },
    {
        title: "Contenu",
        url: "/dashboard/content",
        icon: FileText,
    }, */
]

const systemMenuItems: any[] = [
    {
        title: "Administration",
        url: routes.admin.admin,
        icon: Shield,
    },
    {
        title: "Agents de recouvrement",
        url: routes.admin.agentsRecouvrement,
        icon: UserCheck,
    },
    {
        title: "Groupes",
        url: routes.admin.groups,
        icon: Users,
    },
    {
        title: "Métiers/Entreprises",
        url: routes.admin.jobs,
        icon: Briefcase,
    },
    {
        title: "Géographie",
        url: routes.admin.geographie,
        icon: MapPin,
    },
    {
        title: "Paramètres Caisse",
        url: routes.admin.caisseSpecialeSettings,
        icon: Settings,
    },
    {
        title: "Paramètres Caisse Imprvue",
        url: routes.admin.caisseImprevueSettings,
        icon: HeartHandshake,
    }
    /* {
        title: "Paramètres",
        url: routes.admin.settings,
        icon: Settings,
    }, */
]

export function AppSidebar() {
    const router = useRouter()
    const pathname = usePathname()
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
    const { logout, isLoading } = useLogout()
    
    const handleToggleSection = (title: string) => {
        setOpenSections((prev) => ({
            ...prev,
            [title]: !prev[title],
        }))
    }

    const handleLogout = async () => {
        try {
            await logout()
        } catch (error) {
            // L'erreur est déjà gérée dans useLogout
            console.error('Erreur lors de la déconnexion:', error)
        }
    }

    // Fonction pour détecter si une route est active
    const isActiveRoute = (url: string) => {
        // Cas particulier: dashboard exact
        if (url === '/dashboard') {
            return pathname === '/dashboard'
        }
        // Cas particulier: Caisse Spéciale
        // - La route de base n'est active que sur la page exacte
        // - La route settings gère ses sous-routes
        if (url === routes.admin.caisseSpeciale) {
            return pathname === routes.admin.caisseSpeciale
        }
        if (url === routes.admin.caisseSpecialeSettings) {
            return pathname === url || pathname.startsWith(url + '/')
        }
        // Cas particulier: Caisse Imprévue
        // - La route de base n'est active que sur la page exacte ou les contrats, mais pas les demandes
        if (url === routes.admin.caisseImprevue) {
            return pathname === routes.admin.caisseImprevue || (pathname.startsWith('/caisse-imprevue/contrats') && !pathname.startsWith(routes.admin.caisseImprevueDemandes))
        }
        if (url === routes.admin.caisseImprevueDemandes) {
            return pathname === url || pathname.startsWith(url + '/')
        }
        if (url === routes.admin.caisseImprevueSettings) {
            return pathname === url || pathname.startsWith(url + '/')
        }
        if (url === routes.admin.geographie) {
            return pathname === url || pathname.startsWith(url + '/')
        }
        if (url === routes.admin.agentsRecouvrement) {
            return pathname === url || pathname.startsWith(url + '/')
        }
        // Cas particulier: Métiers/Entreprises (même page avec onglets différents)
        if (url === routes.admin.jobs) {
            return pathname === routes.admin.jobs || pathname === routes.admin.companies || pathname.startsWith(routes.admin.jobs + '/') || pathname.startsWith(routes.admin.companies + '/')
        }
        // Cas particulier: Crédit Spéciale
        if (url === routes.admin.creditSpeciale) {
            return pathname === url || pathname.startsWith(url + '/')
        }
        // Cas particulier: Placements
        // - /placements/demandes et ses sous-routes sont actifs uniquement pour "Demandes"
        // - /placements (exactement) et /placements/[id] (mais pas /placements/demandes) sont actifs pour "Placements"
        if (url === routes.admin.placementDemandes) {
            return pathname === url || pathname.startsWith(url + '/')
        }
        if (url === routes.admin.placements) {
            // Actif uniquement si c'est exactement /placements ou /placements/[id] mais pas /placements/demandes
            return pathname === url || (pathname.startsWith(url + '/') && !pathname.startsWith(routes.admin.placementDemandes))
        }
        // Comportement par défaut: actif si égalité ou sous-chemin
        return pathname === url || pathname.startsWith(url + '/')
    }

    return (
        <Sidebar className="bg-[#234D65] border-r border-[#2c5a73] shadow-xl">
            <SidebarHeader className="flex justify-center h-20 border-b border-[#2c5a73]/50 bg-gradient-to-r from-[#234D65] to-[#2c5a73]">
                <div className="flex items-center gap-3 p-4 transition-all duration-300 hover:scale-105">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:rotate-3">
                        <Logo
                            size="sm"
                            variant="with-bg"
                            className="h-10 w-10 object-contain transition-transform duration-300 hover:scale-110"
                            clickable
                            onClick={() => router.push(routes.admin.dashboard)}
                        />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-bold text-white text-lg tracking-wide">Kara</span>
                        <span className="truncate text-xs text-white/70 font-medium">Administration</span>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent className="bg-[#234D65] px-3 py-4">
                <SidebarGroup className="space-y-2">
                    <SidebarGroupLabel className="text-white/80 font-semibold text-xs uppercase tracking-wider mb-3 px-3">
                        Menu Principal
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="space-y-2">
                            {adminMenuItems.map((item, index) => {
                                if (!item.children) {
                                    const isActive = isActiveRoute(item.url)
                                    return (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton asChild>
                                                <Link
                                                    href={item.url}
                                                    className={cn(
                                                        "flex items-center gap-3 px-3 py-3 rounded-xl text-white/80 transition-all duration-300 hover:text-white hover:bg-white/10 hover:shadow-lg hover:translate-x-1 group backdrop-blur-sm",
                                                        isActive && "text-white bg-white/15 shadow-lg translate-x-1"
                                                    )}
                                                    style={{
                                                        animationDelay: `${index * 0.1}s`
                                                    }}
                                                >
                                                    <item.icon className={cn(
                                                        "h-5 w-5 transition-all duration-300 group-hover:scale-110 group-hover:text-cyan-300",
                                                        isActive && "text-cyan-300 scale-110"
                                                    )} />
                                                    <span className={cn(
                                                        "font-medium transition-all duration-300 group-hover:font-semibold",
                                                        isActive && "font-semibold"
                                                    )}>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )
                                }

                                const isSectionActive = item.children.some(child => isActiveRoute(child.url))
                                const isOpen = openSections[item.title] ?? isSectionActive

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <button
                                            onClick={() => handleToggleSection(item.title)}
                                            className={cn(
                                                "w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-white/80 transition-all duration-300 hover:text-white hover:bg-white/10 hover:shadow-lg hover:translate-x-1 backdrop-blur-sm",
                                                isSectionActive && "text-white bg-white/15 shadow-lg translate-x-1"
                                            )}
                                            style={{
                                                animationDelay: `${index * 0.1}s`
                                            }}
                                            aria-expanded={isOpen}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon className={cn(
                                                    "h-5 w-5 transition-all duration-300",
                                                    isSectionActive && "text-cyan-300 scale-110"
                                                )} />
                                                <span className={cn(
                                                    "font-medium transition-all duration-300",
                                                    isSectionActive && "font-semibold"
                                                )}>
                                                    {item.title}
                                                </span>
                                            </div>
                                            <ChevronDown className={cn(
                                                "h-4 w-4 transition-transform duration-300",
                                                isOpen && "rotate-180"
                                            )} />
                                        </button>
                                        {isOpen && (
                                            <div className="pl-8 pt-2 space-y-2">
                                                {item.children.map(child => {
                                                    const isActive = isActiveRoute(child.url)
                                                    return (
                                                        <Link
                                                            key={child.title}
                                                            href={child.url}
                                                            className={cn(
                                                                "flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/70 transition-all duration-300 hover:text-white hover:bg-white/10 hover:translate-x-1",
                                                                isActive && "text-white bg-white/15 translate-x-1"
                                                            )}
                                                        >
                                                            <child.icon className="h-4 w-4" />
                                                            <span className="font-medium">{child.title}</span>
                                                        </Link>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {systemMenuItems.length > 0 && (
                    <SidebarGroup className="space-y-2 mt-8">
                        <SidebarGroupLabel className="text-white/80 font-semibold text-xs uppercase tracking-wider mb-3 px-3">
                            Système
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu className="space-y-2">
                                {systemMenuItems.map((item, index) => {
                                    const isActive = isActiveRoute(item.url)
                                    return (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton asChild>
                                                <Link
                                                    href={item.url}
                                                    className={cn(
                                                        "flex items-center gap-3 px-3 py-3 rounded-xl text-white/80 transition-all duration-300 hover:text-white hover:bg-white/10 hover:shadow-lg hover:translate-x-1 group backdrop-blur-sm",
                                                        isActive && "text-white bg-white/15 shadow-lg translate-x-1"
                                                    )}
                                                    style={{
                                                        animationDelay: `${(adminMenuItems.length + index) * 0.1}s`
                                                    }}
                                                >
                                                    <item.icon className={cn(
                                                        "h-5 w-5 transition-all duration-300 group-hover:scale-110 group-hover:text-cyan-300",
                                                        isActive && "text-cyan-300 scale-110"
                                                    )} />
                                                    <span className={cn(
                                                        "font-medium transition-all duration-300 group-hover:font-semibold",
                                                        isActive && "font-semibold"
                                                    )}>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>

            <SidebarFooter className="border-t border-[#2c5a73]/50 bg-gradient-to-t from-[#1e3f54] to-[#234D65] p-4">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:scale-105 group">
                        <Avatar className="h-10 w-10 ring-2 ring-white/20 transition-all duration-300 group-hover:ring-cyan-400/50 group-hover:scale-110">
                            <AvatarImage src="/api/placeholder/32/32" alt="Admin" />
                            <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-500 text-white font-bold text-sm">AD</AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-semibold text-white transition-colors duration-300 group-hover:text-cyan-300">Administrateur</span>
                            <span className="truncate text-xs text-white/70 transition-colors duration-300 group-hover:text-white/90">admin@kara.com</span>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all duration-300 hover:shadow-lg hover:scale-105 backdrop-blur-sm rounded-xl border border-red-400/20 hover:border-red-400/50 group"
                        onClick={handleLogout}
                        disabled={isLoading}
                        data-testid="btn-logout"
                    >
                        <LogOut className="mr-3 h-4 w-4 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110" />
                        <span className="font-medium">{isLoading ? 'Déconnexion...' : 'Se déconnecter'}</span>
                    </Button>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}
