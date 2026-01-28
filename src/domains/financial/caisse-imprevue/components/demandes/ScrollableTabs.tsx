/**
 * Composant de tabs scrollable sans barre de scroll visible
 * 
 * Scroll natif avec doigts/souris mais scrollbar masquée
 * Design moderne avec effet carousel
 */

'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

interface ScrollableTabsProps extends React.ComponentProps<typeof TabsPrimitive.Root> {
  children: React.ReactNode
}

interface ScrollableTabsListProps extends React.ComponentProps<typeof TabsPrimitive.List> {
  children: React.ReactNode
}

export function ScrollableTabs({ children, className, ...props }: ScrollableTabsProps) {
  return (
    <TabsPrimitive.Root
      data-slot="scrollable-tabs"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    >
      {children}
    </TabsPrimitive.Root>
  )
}

export function ScrollableTabsList({ children, className, ...props }: ScrollableTabsListProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [showLeftFade, setShowLeftFade] = React.useState(false)
  const [showRightFade, setShowRightFade] = React.useState(true)

  const checkScroll = React.useCallback(() => {
    if (!containerRef.current) return
    
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current
    setShowLeftFade(scrollLeft > 10)
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 10)
  }, [])

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    checkScroll()
    container.addEventListener('scroll', checkScroll)
    window.addEventListener('resize', checkScroll)

    return () => {
      container.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [checkScroll])

  return (
    <div className="relative w-full">
      {/* Container avec scroll masqué */}
      <TabsPrimitive.List
        ref={containerRef}
        data-slot="scrollable-tabs-list"
        className={cn(
          // Base styles
          'bg-muted/50 text-muted-foreground inline-flex h-11 items-center justify-start rounded-xl p-1.5 gap-1.5',
          // Scroll natif mais scrollbar masquée
          'overflow-x-auto overflow-y-hidden',
          // Smooth scroll
          'scroll-smooth',
          // Masquer la scrollbar sur tous les navigateurs
          'no-scrollbar',
          // Padding pour l'effet fade
          'px-8 sm:px-1.5',
          className
        )}
        {...props}
      >
        {children}
      </TabsPrimitive.List>
      
      {/* Gradient fade à gauche */}
      {showLeftFade && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background via-background/80 to-transparent pointer-events-none z-10 sm:hidden transition-opacity duration-200" />
      )}
      
      {/* Gradient fade à droite */}
      {showRightFade && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background via-background/80 to-transparent pointer-events-none z-10 sm:hidden transition-opacity duration-200" />
      )}
    </div>
  )
}

interface ScrollableTabsTriggerProps extends React.ComponentProps<typeof TabsPrimitive.Trigger> {
  children: React.ReactNode
}

export function ScrollableTabsTrigger({ children, className, ...props }: ScrollableTabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      data-slot="scrollable-tabs-trigger"
      className={cn(
        // Base styles
        'inline-flex h-8 flex-shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent px-4 py-1.5 text-sm font-medium whitespace-nowrap',
        // Transitions fluides
        'transition-all duration-300 ease-in-out',
        // Inactive state
        'text-muted-foreground bg-transparent hover:bg-muted/60 hover:text-foreground',
        // Active state avec design moderne
        'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:border-border data-[state=active]:scale-[1.02]',
        // Focus
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        // Disabled
        'disabled:pointer-events-none disabled:opacity-50',
        // Touch-friendly sur mobile
        'touch-pan-x',
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Trigger>
  )
}
