import { Metadata } from 'next'
import Homepage from "@/components/homepage/homepage";

export const metadata: Metadata = {
  title: 'KARA - Mutuelle de Solidarité | Entraide et Solidarité Active au Gabon',
  description: 'KARA est une mutuelle gabonaise dédiée à la solidarité active entre les membres. Rejoignez notre réseau d\'entraide, d\'épargne et d\'actions caritatives à Awoungou, Gabon.',
  keywords: [
    'mutuelle',
    'solidarité',
    'Gabon',
    'Awoungou',
    'entraide',
    'épargne',
    'association',
    'charité',
    'jeunesse',
    'communauté',
    'KARA'
  ],
  authors: [{ name: 'KARA Mutuelle' }],
  creator: 'KARA Mutuelle de Solidarité',
  publisher: 'KARA',
  category: 'Association',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'fr_GA',
    url: 'https://www.tonnkama.com',
    siteName: 'KARA - Mutuelle de Solidarité',
    title: 'KARA - Mutuelle de Solidarité | Entraide Active au Gabon',
    description: 'Une famille élargie et inclusive, un réseau de cœurs ouverts qui refusent l\'indifférence et choisissent la main tendue.',
    images: [
      {
        url: '/og-image-1200x630.jpg',
        width: 1200,
        height: 630,
        alt: 'KARA - Mutuelle de Solidarité - OG 1200x630',
      },
      {
        url: '/og-image-800x600.jpg',
        width: 800,
        height: 600,
        alt: 'KARA - Mutuelle de Solidarité - OG 800x600',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KARA - Mutuelle de Solidarité',
    description: 'Rejoignez notre réseau de solidarité active au Gabon',
    images: ['/imgkara.webp'],
    creator: '@kara_mutuelle',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1e40af' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  metadataBase: new URL('https://www.tonnkama.com'),
  alternates: {
    canonical: '/',
    languages: {
      'fr-GA': '/',
    },
  },
  verification: {
    google: 'votre-code-google-search-console',
    // yandex: 'votre-code-yandex',
    // yahoo: 'votre-code-yahoo',
  },
  other: {
    'geo.region': 'GA',
    'geo.placename': 'Awoungou',
    'geo.position': '0.3901;9.4673', // Coordonnées approximatives du Gabon
    'ICBM': '0.3901, 9.4673',
    'contact': 'contact@kara-mutuelle.ga',
    'coverage': 'Worldwide',
    'distribution': 'Global',
    'rating': 'General',
    'target': 'all',
  }
}

export default function Home() {
  return <Homepage />;
}