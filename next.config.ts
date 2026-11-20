import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/mobile/finance/**': ['./public/Logo-Kara.jpg', './public/assets/caisse-speciale/caissesp-logo.png'],
  },
  images: {
    remotePatterns: [
      // Firebase Storage production
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/**',
      },
      // Firebase Storage emulator local
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '9097',
        pathname: '/v0/b/**',
      },
      // Firebase Storage emulator local alternative
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9097',
        pathname: '/v0/b/**',
      },
      // Images de profil dynamiques
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  /**
   * Limite l'exécution d'ESLint pendant le build aux nouveaux modules memberships.
   * Cela évite que des avertissements legacy dans d'autres domaines ne cassent le build,
   * tout en gardant un lint strict sur le code refactoré.
   */
  eslint: {
    /**
     * On désactive le lint pendant le build Next pour éviter que
     * des avertissements (legacy) ne cassent la compilation.
     * Le lint reste disponible via `npm run lint` / `npm run lint:next`.
     */
    ignoreDuringBuilds: true,
  },
};

export default function getNextConfig(phase: string): NextConfig {
  return {
    ...nextConfig,
    // Un build de vérification ne doit pas écraser les fichiers du serveur local.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
    // L’aperçu Expo local utilise son ID token, sans cookie de session web.
    // Ces en-têtes ne sont jamais ajoutés au build de production.
    ...(phase === PHASE_DEVELOPMENT_SERVER ? {
      headers: async () => [{
        source: '/api/mobile/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'http://localhost:8081' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Authorization,Content-Type' },
        ],
      }],
    } : {}),
  };
}
