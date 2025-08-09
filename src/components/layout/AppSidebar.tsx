"use client"

import { Car, Home, Settings, Users, BarChart3, FileText, Shield, LogOut, UserPlus } from "lucide-react"
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
import { auth, signOut } from "@/firebase/auth"
import { cn } from "@/lib/utils"

// Menu items pour l'administration
const adminMenuItems = [
    {
        title: "Tableau de bord",
        url: "/dashboard",
        icon: Home,
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
        title: "Paramètres",
        url: routes.admin.settings,
        icon: Settings,
    },
]

export function AppSidebar() {
    const router = useRouter()
    const pathname = usePathname()

    const handleLogout = async () => {
        await signOut(auth)
        router.push(routes.public.adminLogin)
    }

    // Fonction pour détecter si une route est active
    const isActiveRoute = (url: string) => {
        if (url === '/dashboard') {
            return pathname === '/dashboard'
        }
        return pathname.startsWith(url)
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
                    >
                        <LogOut className="mr-3 h-4 w-4 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110" />
                        <span className="font-medium">Se déconnecter</span>
                    </Button>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}