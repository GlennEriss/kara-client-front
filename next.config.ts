import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
