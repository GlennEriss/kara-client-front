import { NextRequest, NextResponse } from "next/server";
import routes from "./constantes/routes";

/**
 * Liste des routes publiques (accessibles sans authentification)
 */
const PUBLIC_ROUTES = [
    routes.public.homepage,
    routes.public.login,
    routes.public.register,
    routes.public.adminLogin,
];

/**
 * Préfixes des routes admin (nécessitent une authentification)
 */
const ADMIN_ROUTE_PREFIXES = [
    '/dashboard',
    '/memberships',
    '/membership-requests',
    '/groups',
    '/admin',
    '/settings',
    '/jobs',
    '/companies',
    '/payments-history',
    '/contracts-history',
    '/caisse-speciale',
    '/credit-speciale',
    '/caisse-imprevue',
    '/vehicules',
    '/bienfaiteur',
    '/placements',
    '/geographie',
    '/calendrier',
];

/**
 * Vérifie si une route est une route admin
 */
function isAdminRoute(pathname: string): boolean {
    return ADMIN_ROUTE_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

/**
 * Vérifie si une route est une route publique d'authentification
 */
function isAuthRoute(pathname: string): boolean {
    return PUBLIC_ROUTES.includes(pathname);
}

/**
 * Middleware Next.js pour gérer l'authentification
 * 
 * - Redirige vers /login si pas de token sur routes admin
 * - Redirige vers /dashboard si token présent sur pages d'auth
 */
export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    
    // Récupérer le token depuis les cookies
    const token = request.cookies.get('auth-token')?.value;
    const hasToken = Boolean(token);
    
    // Redirection si pas de token sur routes admin
    if (!hasToken && isAdminRoute(pathname)) {
        console.log(`[Middleware] Redirection vers login - pas de token (${pathname})`);
        return NextResponse.redirect(new URL(routes.public.login, request.nextUrl));
    }
    
    // Redirection si token présent sur pages d'auth (login, register)
    if (hasToken && isAuthRoute(pathname) && pathname !== routes.public.homepage) {
        console.log(`[Middleware] Redirection vers dashboard - déjà connecté (${pathname})`);
        return NextResponse.redirect(new URL(routes.admin.dashboard, request.nextUrl));
    }
    
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public assets (images, etc.)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.webp$|.*\\.svg$|.*\\.ico$).*)',
    ],
};
