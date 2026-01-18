import { useState, useEffect } from 'react'

/**
 * Hook pour détecter si une media query correspond
 * @param query - La media query à vérifier (ex: '(min-width: 768px)')
 * @returns true si la media query correspond, false sinon
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false)

  useEffect(() => {
    // Vérifier si window est disponible (SSR)
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia(query)
    
    // Définir la valeur initiale
    setMatches(mediaQuery.matches)

    // Créer un handler pour les changements
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Écouter les changements
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler)
    } else {
      // Fallback pour les navigateurs plus anciens
      mediaQuery.addListener(handler)
    }

    // Nettoyer l'écouteur
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler)
      } else {
        mediaQuery.removeListener(handler)
      }
    }
  }, [query])

  return matches
}
