import { NextRequest, NextResponse } from "next/server";
import { auth } from "./firebase/auth";
import routes from "./constantes/routes";

export async function middleware(request: NextRequest) {
    const user = auth.currentUser
    const isAdminRoutes = Object.values(routes.admin).includes(request.nextUrl.pathname)
    const isAuthRoutes = [routes.public.login, routes.public.register]
    if (!user && isAdminRoutes) {
        return NextResponse.redirect(new URL(routes.public.login, request.url))
    }
    if (user && isAuthRoutes) {
        return NextResponse.redirect(new URL(routes.admin.dashboard, request.url))
    }
    console.log("user:",user)
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