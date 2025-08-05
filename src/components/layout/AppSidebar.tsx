"use client"

import { Car, Home, Settings, Users, BarChart3, FileText, Shield, LogOut, UserPlus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { DefaultLogo } from "@/components/logo"
import routes from "@/constantes/routes"
import { auth, signOut } from "@/firebase/auth"

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
    /* {
        title: "Administration",
        url: "/dashboard/admin",
        icon: Shield,
    },
    {
        title: "Paramètres",
        url: "/dashboard/settings",
        icon: Settings,
    }, */
]

export function AppSidebar() {
    const router = useRouter()

    const handleLogout = async () => {
        await signOut(auth)
        router.push(routes.public.adminLogin)
    }

    return (
        <Sidebar>
            <SidebarHeader className="h-20 border-b border-sidebar-border">
                <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center">
                        <DefaultLogo 
                            size="sm"
                            className="h-14 w-14 object-contain"
                            clickable
                            onClick={() => router.push(routes.admin.dashboard)}
                        />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">Kara</span>
                        <span className="truncate text-xs text-sidebar-foreground/70">Administration</span>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {adminMenuItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <Link href={item.url} className="flex items-center gap-3">
                                            <item.icon className="h-4 w-4" />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel>Système</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {systemMenuItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild>
                                        <Link href={item.url} className="flex items-center gap-3">
                                            <item.icon className="h-4 w-4" />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border p-4">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src="/api/placeholder/32/32" alt="Admin" />
                            <AvatarFallback>AD</AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-medium">Administrateur</span>
                            <span className="truncate text-xs text-sidebar-foreground/70">admin@kara.com</span>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950 dark:hover:text-red-300"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Se déconnecter
                    </Button>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}