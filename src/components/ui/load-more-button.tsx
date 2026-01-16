"use client"

import { Button } from '@/components/ui/button'
import { Loader2, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Hook pour détecter si un élément est visible dans le viewport
 */
function useInView(options?: { threshold?: number; rootMargin?: string }) {
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      {
        threshold: options?.threshold ?? 0,
        rootMargin: options?.rootMargin ?? '0px',
      }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [options?.threshold, options?.rootMargin])

  return { ref, inView }
}

interface LoadMoreButtonProps {
  /** Y a-t-il plus de données à charger */
  hasMore: boolean
  /** Est-ce en train de charger */
  isLoading: boolean
  /** Fonction pour charger plus */
  onLoadMore: () => void
  /** Mode scroll infini (charge automatiquement quand visible) */
  autoLoad?: boolean
  /** Texte du bouton */
  label?: string
}

/**
 * Bouton "Charger plus" avec support du scroll infini
 * 
 * Usage:
 * ```tsx
 * <LoadMoreButton
 *   hasMore={hasNextPage}
 *   isLoading={isFetchingNextPage}
 *   onLoadMore={fetchNextPage}
 *   autoLoad // Optionnel: scroll infini
 * />
 * ```
 */
export function LoadMoreButton({
  hasMore,
  isLoading,
  onLoadMore,
  autoLoad = false,
  label = 'Charger plus',
}: LoadMoreButtonProps) {
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  })

  // Auto-load quand visible
  useEffect(() => {
    if (autoLoad && inView && hasMore && !isLoading) {
      onLoadMore()
    }
  }, [autoLoad, inView, hasMore, isLoading, onLoadMore])

  // Toujours afficher le bouton s'il y a des données, même si hasMore est false
  // Cela permet de voir qu'on a atteint la fin
  if (!hasMore && !isLoading) {
    return (
      <div className="flex justify-center py-4">
        <p className="text-sm text-muted-foreground">Tous les éléments sont chargés</p>
      </div>
    )
  }

  return (
    <div ref={ref} className="flex justify-center py-4">
      <Button
        variant="outline"
        size="sm"
        onClick={onLoadMore}
        disabled={isLoading || !hasMore}
        className="min-w-[140px]"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Chargement...
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4 mr-2" />
            {label}
          </>
        )}
      </Button>
    </div>
  )
}

/**
 * Indicateur de chargement plus subtil pour le scroll infini
 */
export function LoadingIndicator({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) return null

  return (
    <div className="flex justify-center py-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Chargement...</span>
      </div>
    </div>
  )
}
