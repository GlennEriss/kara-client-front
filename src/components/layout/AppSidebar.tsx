"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
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
  useSidebar,
} from "@/components/ui/sidebar";
import routes from "@/constantes/routes";
import { requiredViewPermissionForPath } from "@/constantes/permissions";
import { useAuth } from "@/hooks/useAuth";
import { useMyAccess } from "@/hooks/useMyAccess";
import { useLogout } from "@/domains/auth/hooks";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Calculator,
  Calendar,
  CalendarHeart,
  Car,
  Store,
  FileSpreadsheet,
  ChevronDown,
  CreditCard,
  FileText,
  HandCoins,
  HeartHandshake,
  Home,
  LogOut,
  MapPin,
  MessageSquare,
  ScrollText,
  Settings,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

// Menu items pour l'administration
type SidebarSubItem = {
  title: string;
  url: string;
  icon: any;
};

type SidebarItem =
  | {
      title: string;
      url: string;
      icon: any;
      children?: undefined;
    }
  | {
      title: string;
      icon: any;
      children: SidebarSubItem[];
    };

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
      {
        title: "Boutiques",
        url: routes.admin.boutiques,
        icon: Store,
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
        title: "Contrats",
        url: routes.admin.placements,
        icon: CreditCard,
      },
    ],
  },
  {
    title: "Événements",
    url: routes.admin.events,
    icon: CalendarHeart,
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
];

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
    title: "Journalisation",
    url: routes.admin.journalisation,
    icon: ScrollText,
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
    title: "Modèles de messages",
    url: routes.admin.messageTemplates,
    icon: MessageSquare,
  },
  {
    title: "Paramètres Caisse",
    url: routes.admin.caisseSpecialeSettings,
    icon: Settings,
  },
  {
    title: "Paramètres Caisse Imprévue",
    url: routes.admin.caisseImprevueSettings,
    icon: HeartHandshake,
  },
  {
    title: "Import membres",
    url: "/import-membres",
    icon: UserPlus,
  },
  {
    title: "Import Caisse Imprévue",
    url: "/import-caisse-imprevue",
    icon: FileSpreadsheet,
  },
  {
    title: "Import Caisse Spéciale",
    url: "/import-caisse-speciale",
    icon: FileSpreadsheet,
  },
  /* {
        title: "Paramètres",
        url: routes.admin.settings,
        icon: Settings,
    }, */
];

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const { logout, isLoading } = useLogout();
  const { user } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();

  // Accès de l'admin connecté (superAdmin + permissions fines).
  const { isSuperAdmin, can } = useMyAccess();

  // Un item est visible si sa route n'est pas restreinte ou si l'admin a la permission « view ».
  const canSeeUrl = (url: string) => {
    const required = requiredViewPermissionForPath(url);
    return !required || can(required);
  };

  // Menu principal filtré selon les droits (les parents disparaissent si aucun enfant visible).
  const visibleAdminItems = adminMenuItems
    .map((item): SidebarItem | null => {
      if ("children" in item && item.children) {
        const children = item.children.filter((c) => canSeeUrl(c.url));
        return children.length > 0 ? { ...item, children } : null;
      }
      return canSeeUrl(item.url) ? item : null;
    })
    .filter((item): item is SidebarItem => item !== null);

  // Section Système filtrée ; « Réinitialisation » réservée au superAdmin.
  const baseSystemItems = systemMenuItems.filter((it: any) => canSeeUrl(it.url));
  const systemItems = isSuperAdmin
    ? [...baseSystemItems, { title: "Réinitialisation", url: "/reinitialisation", icon: Trash2 }]
    : baseSystemItems;

  // Ferme le tiroir offcanvas après une navigation sur mobile.
  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  // Infos de l'admin connecté pour la carte de profil du footer.
  const adminName = user?.displayName?.trim() || "Administrateur";
  const adminEmail = user?.email ?? undefined;
  const adminInitials =
    adminName
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AD";

  const handleToggleSection = (title: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleLogout = async () => {
    closeMobile();
    try {
      await logout();
    } catch (error) {
      // L'erreur est déjà gérée dans useLogout
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  // Fonction pour détecter si une route est active
  const isActiveRoute = (url: string) => {
    // Cas particulier: dashboard exact
    if (url === "/dashboard") {
      return pathname === "/dashboard";
    }
    // Cas particulier: Caisse Spéciale
    // - La route de base n'est active que sur la page exacte
    // - La route settings gère ses sous-routes
    if (url === routes.admin.caisseSpeciale) {
      return pathname === routes.admin.caisseSpeciale;
    }
    if (url === routes.admin.caisseSpecialeSettings) {
      return pathname === url || pathname.startsWith(url + "/");
    }
    // Cas particulier: Caisse Imprévue
    // - La route de base n'est active que sur la page exacte ou les contrats, mais pas les demandes
    if (url === routes.admin.caisseImprevue) {
      return (
        pathname === routes.admin.caisseImprevue ||
        (pathname.startsWith("/caisse-imprevue/contrats") &&
          !pathname.startsWith(routes.admin.caisseImprevueDemandes))
      );
    }
    if (url === routes.admin.caisseImprevueDemandes) {
      return pathname === url || pathname.startsWith(url + "/");
    }
    if (url === routes.admin.caisseImprevueSettings) {
      return pathname === url || pathname.startsWith(url + "/");
    }
    if (url === routes.admin.geographie) {
      return pathname === url || pathname.startsWith(url + "/");
    }
    if (url === routes.admin.agentsRecouvrement) {
      return pathname === url || pathname.startsWith(url + "/");
    }
    // Cas particulier: Métiers/Entreprises (même page avec onglets différents)
    if (url === routes.admin.jobs) {
      return (
        pathname === routes.admin.jobs ||
        pathname === routes.admin.companies ||
        pathname.startsWith(routes.admin.jobs + "/") ||
        pathname.startsWith(routes.admin.companies + "/")
      );
    }
    // Cas particulier: Crédit Spéciale
    if (url === routes.admin.creditSpeciale) {
      return pathname === url || pathname.startsWith(url + "/");
    }
    // Cas particulier: Placements
    // - /placements/demandes et ses sous-routes sont actifs uniquement pour "Demandes"
    // - /placements (exactement) et /placements/[id] (mais pas /placements/demandes) sont actifs pour "Placements"
    if (url === routes.admin.placementDemandes) {
      return pathname === url || pathname.startsWith(url + "/");
    }
    if (url === routes.admin.placements) {
      // Actif uniquement si c'est exactement /placements ou /placements/[id] mais pas /placements/demandes
      return (
        pathname === url ||
        (pathname.startsWith(url + "/") &&
          !pathname.startsWith(routes.admin.placementDemandes))
      );
    }
    // Comportement par défaut: actif si égalité ou sous-chemin
    return pathname === url || pathname.startsWith(url + "/");
  };

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r-0 shadow-xl"
      style={{ background: "#1a3f56" }}
    >
      {/* Header — logo cliquable vers le tableau de bord */}
      <SidebarHeader
        className="shrink-0 border-b px-4 py-4"
        style={{ background: "#1a3f56", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <button
          type="button"
          onClick={() => {
            closeMobile();
            router.push(routes.admin.dashboard);
          }}
          className="flex w-full items-center gap-3 focus:outline-none"
          aria-label="Aller au tableau de bord"
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "rgba(203,177,113,0.15)" }}
          >
            <Image
              src="/Logo-Kara.webp"
              alt="KARA"
              width={24}
              height={24}
              className="h-6 w-6 object-contain brightness-0 invert"
            />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold leading-none tracking-wide text-white">
              KARA
            </p>
            <p className="mt-0.5 text-[11px] font-medium tracking-wide text-white/40">
              Administration
            </p>
          </div>
        </button>
      </SidebarHeader>

      <SidebarContent className="gap-0 py-2" style={{ background: "#1a3f56" }}>
        {/* Menu principal (avec sous-menus dépliables) */}
        <SidebarGroup className="px-0">
          <SidebarGroupLabel className="px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-white/40">
            Menu principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {visibleAdminItems.map((item) => {
                if (!item.children) {
                  const isActive = isActiveRoute(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <Link
                          href={item.url}
                          onClick={closeMobile}
                          className={cn(
                            "relative flex items-center gap-3 rounded-none px-4 py-2.5 text-sm font-medium transition-colors duration-150",
                            isActive
                              ? "bg-white/10 text-white"
                              : "text-white/60 hover:bg-white/8 hover:text-white",
                          )}
                        >
                          {isActive && (
                            <span
                              aria-hidden
                              className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#CBB171]"
                            />
                          )}
                          <item.icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              isActive ? "text-[#CBB171]" : "text-white/50",
                            )}
                          />
                          <span className={cn(isActive && "font-semibold")}>
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                const isSectionActive = item.children.some((child) =>
                  isActiveRoute(child.url),
                );
                const isOpen = openSections[item.title] ?? isSectionActive;

                return (
                  <SidebarMenuItem key={item.title}>
                    <button
                      onClick={() => handleToggleSection(item.title)}
                      className={cn(
                        "relative flex w-full items-center justify-between gap-3 rounded-none px-4 py-2.5 text-sm font-medium transition-colors duration-150",
                        isSectionActive
                          ? "bg-white/10 text-white"
                          : "text-white/60 hover:bg-white/8 hover:text-white",
                      )}
                      aria-expanded={isOpen}
                    >
                      {isSectionActive && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#CBB171]"
                        />
                      )}
                      <span className="flex min-w-0 items-center gap-3">
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isSectionActive ? "text-[#CBB171]" : "text-white/50",
                          )}
                        />
                        <span
                          className={cn(
                            "truncate",
                            isSectionActive && "font-semibold",
                          )}
                        >
                          {item.title}
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-white/40 transition-transform duration-300",
                          isOpen && "rotate-180",
                        )}
                      />
                    </button>
                    {isOpen && (
                      <div className="mt-0.5 flex flex-col gap-0.5">
                        {item.children.map((child) => {
                          const isActive = isActiveRoute(child.url);
                          return (
                            <Link
                              key={child.title}
                              href={child.url}
                              onClick={closeMobile}
                              className={cn(
                                "relative flex items-center gap-3 rounded-none py-2 pl-11 pr-4 text-[13px] transition-colors duration-150",
                                isActive
                                  ? "bg-white/10 text-white"
                                  : "text-white/55 hover:bg-white/8 hover:text-white",
                              )}
                            >
                              {isActive && (
                                <span
                                  aria-hidden
                                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#CBB171]"
                                />
                              )}
                              <child.icon
                                className={cn(
                                  "h-3.5 w-3.5 shrink-0 transition-colors",
                                  isActive ? "text-[#CBB171]" : "text-white/45",
                                )}
                              />
                              <span className={cn(isActive && "font-medium")}>
                                {child.title}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {systemItems.length > 0 && (
          <SidebarGroup className="px-0">
            <SidebarGroupLabel className="px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-white/40">
              Système
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {systemItems.map((item) => {
                  const isActive = isActiveRoute(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <Link
                          href={item.url}
                          onClick={closeMobile}
                          className={cn(
                            "relative flex items-center gap-3 rounded-none px-4 py-2.5 text-sm font-medium transition-colors duration-150",
                            isActive
                              ? "bg-white/10 text-white"
                              : "text-white/60 hover:bg-white/8 hover:text-white",
                          )}
                        >
                          {isActive && (
                            <span
                              aria-hidden
                              className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#CBB171]"
                            />
                          )}
                          <item.icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              isActive ? "text-[#CBB171]" : "text-white/50",
                            )}
                          />
                          <span className={cn(isActive && "font-semibold")}>
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer — carte profil de l'admin connecté + déconnexion */}
      <SidebarFooter
        className="shrink-0 border-t p-3"
        style={{ background: "#1a3f56", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2.5"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{ background: "rgba(203,177,113,0.3)" }}
          >
            <span style={{ color: "#CBB171" }}>{adminInitials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold leading-none text-white">
              {adminName}
            </p>
            {adminEmail && (
              <p className="mt-0.5 truncate text-[11px] text-white/40">
                {adminEmail}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-full justify-start rounded-lg text-sm font-medium text-red-400/80 transition-colors duration-150 hover:bg-red-500/10 hover:text-red-300"
          onClick={handleLogout}
          disabled={isLoading}
          data-testid="btn-logout"
        >
          <LogOut className="mr-2.5 h-4 w-4" />
          {isLoading ? "Déconnexion..." : "Se déconnecter"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
