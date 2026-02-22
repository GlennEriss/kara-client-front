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
 * - Redirige vers /login si session invalide sur routes admin
 * - Redirige vers /dashboard si session valide sur pages d'auth
 */
export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    
    // Session cookie HttpOnly créé par /api/auth/session
    const sessionCookie = request.cookies.get('__session')?.value;
    const hasSessionCookie = Boolean(sessionCookie);

    const isAdmin = isAdminRoute(pathname);
    const isAuth = isAuthRoute(pathname);

    // Éviter les fetch inutiles
    if (!hasSessionCookie) {
        if (isAdmin) {
            console.log(`[Middleware] Redirection vers login - pas de session (${pathname})`);
            return NextResponse.redirect(new URL(routes.public.login, request.nextUrl));
        }
        return NextResponse.next();
    }

    // Vérifier la session via un endpoint server-side (Node) car middleware tourne en Edge
    let sessionValid = false;
    let role: string | null = null;
    try {
        const verifyUrl = new URL('/api/auth/session/verify', request.nextUrl.origin);
        const verifyResp = await fetch(verifyUrl, {
            method: 'GET',
            headers: {
                // Transmettre le cookie au endpoint
                cookie: request.headers.get('cookie') || '',
            },
        });

        sessionValid = verifyResp.ok;
        if (verifyResp.ok) {
            const body = await verifyResp.json().catch(() => null);
            role = body?.claims?.role ? String(body.claims.role) : null;
        }
    } catch (error) {
        // En cas de souci réseau/serveur, considérer la session invalide pour les routes protégées
        sessionValid = false;
    }
    
    // Redirection si pas de token sur routes admin
    if (!sessionValid && isAdmin) {
        console.log(`[Middleware] Redirection vers login - session invalide (${pathname})`);
        return NextResponse.redirect(new URL(routes.public.login, request.nextUrl));
    }

    // Protection admin basique par rôle (si claim existe)
    if (sessionValid && isAdmin && role && !String(role).toLowerCase().includes('admin')) {
        console.log(`[Middleware] Accès refusé - role=${role} (${pathname})`);
        return NextResponse.redirect(new URL(routes.public.login, request.nextUrl));
    }
    
    // Redirection si token présent sur pages d'auth (accueil/login, register)
    if (sessionValid && isAuth) {
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
