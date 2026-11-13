import { NextRequest, NextResponse } from "next/server";
import routes from "./constantes/routes";
import { moduleForPath } from './constantes/permissions';
import { adminAccessRedirect, type ResolvedAdminAccess } from './domains/auth/access-policy';

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
    '/bilans-financiers',
    '/aide',
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
    '/boutiques',
    '/bienfaiteur',
    '/placements',
    '/geographie',
    '/calendrier',
    '/statuts',
    '/reinitialisation',
];

/**
 * Vérifie si une route est une route admin
 */
function isAdminRoute(pathname: string): boolean {
    return !!moduleForPath(pathname) || ADMIN_ROUTE_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
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
    if (!isAdmin && !isAuth) return NextResponse.next();

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
    let access: ResolvedAdminAccess | null = null;
    try {
        // App Hosting termine HTTPS au proxy, mais Next écoute en HTTP dans
        // Cloud Run. nextUrl.origin peut donc pointer vers https://0.0.0.0:8080.
        // Utiliser le port du conteneur et une adresse locale fixe évite cet
        // appel TLS invalide et ne dépend pas des headers Host du visiteur.
        const port = process.env.PORT;
        const verificationOrigin = process.env.K_SERVICE && port && /^\d+$/.test(port)
            ? `http://127.0.0.1:${port}`
            : request.nextUrl.origin;
        const verifyUrl = new URL('/api/auth/session/verify', verificationOrigin);
        const verifyResp = await fetch(verifyUrl, {
            method: 'GET',
            cache: 'no-store',
            headers: {
                // Transmettre le cookie au endpoint
                cookie: request.headers.get('cookie') || '',
            },
        });

        if (verifyResp.status >= 500 && isAdmin) {
            return new NextResponse('La vérification de vos accès est temporairement indisponible. Réessayez dans un instant.', { status: 503, headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '5' } });
        }
        if (verifyResp.ok) {
            const body = await verifyResp.json().catch(() => null);
            access = body?.access ?? null;
            sessionValid = body?.authenticated === true && !!access && Array.isArray(access.permissions) && typeof access.permissionsDefined === 'boolean';
        }
    } catch {
        console.error('[Middleware] Échec de l’appel de vérification de session');
        // En cas de souci réseau/serveur, considérer la session invalide pour les routes protégées
        if (isAdmin) return new NextResponse('La vérification de vos accès est temporairement indisponible. Réessayez dans un instant.', { status: 503, headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '5' } });
    }
    
    // Redirection si pas de token sur routes admin
    if (!sessionValid && isAdmin) {
        console.log(`[Middleware] Redirection vers login - session invalide (${pathname})`);
        return NextResponse.redirect(new URL(routes.public.login, request.nextUrl));
    }

    if (sessionValid && isAdmin && access) {
        const target = adminAccessRedirect(pathname, access);
        if (target) return NextResponse.redirect(new URL(target, request.nextUrl));
    }
    
    // Redirection si token présent sur pages d'auth (accueil/login, register)
    if (sessionValid && isAuth) {
        console.log(`[Middleware] Redirection vers dashboard - déjà connecté (${pathname})`);
        return NextResponse.redirect(new URL(access ? adminAccessRedirect('/dashboard', access) ?? routes.admin.dashboard : routes.admin.dashboard, request.nextUrl));
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
