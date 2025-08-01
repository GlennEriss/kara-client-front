import { NextRequest, NextResponse } from "next/server";
import routes from "./constantes/routes";

export async function middleware(request: NextRequest) {
    // Récupérer le token depuis les cookies
    const token = request.cookies.get('auth-token')?.value
    
    const isAdminRoutes = Object.values(routes.admin).includes(request.nextUrl.pathname)
    const isAuthRoutes = [routes.public.login, routes.public.register, routes.public.adminLogin].includes(request.nextUrl.pathname)
    
    // Vérification simple basée sur la présence du token
    const hasToken = Boolean(token)
    // Redirection si pas de token sur routes admin
    if (!hasToken && isAdminRoutes) {
        console.log("Redirection vers login - pas de token d'authentification")
        return NextResponse.redirect(new URL(routes.public.login, request.nextUrl))
    }
    
    // Redirection si token présent sur pages d'auth
    if (hasToken && isAuthRoutes) {
        console.log("Redirection vers dashboard - token présent")
        return NextResponse.redirect(new URL(routes.admin.dashboard, request.nextUrl))
    }
    
    console.log(`Middleware: ${request.nextUrl.pathname} - Token: ${hasToken ? 'Présent' : 'Absent'}`)
    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}