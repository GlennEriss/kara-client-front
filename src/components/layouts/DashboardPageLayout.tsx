'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

/**
 * Layout standard pour toutes les pages du dashboard
 * Design système KARA avec animations modernes
 * 
 * Structure :
 * - Header avec titre gradient, description et icône optionnelle
 * - Stats (optionnel)
 * - Contenu principal (tabs + contenu)
 */

type LayoutVariant = 'default' | 'kara' | 'minimal'

interface DashboardPageLayoutProps {
  title: string
  description?: string
  stats?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  icon?: LucideIcon
  variant?: LayoutVariant
}

const variantStyles: Record<LayoutVariant, {
  container: string
  header: string
  title: string
  description: string
  iconContainer: string
}> = {
  default: {
    container: 'space-y-4 sm:space-y-6 p-3 sm:p-6',
    header: '',
    title: cn(
      'text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight',
      'bg-gradient-to-r from-kara-primary-dark to-kara-secondary-dark bg-clip-text text-transparent'
    ),
    description: 'text-sm sm:text-base lg:text-lg text-gray-600 mt-1 sm:mt-2',
    iconContainer: 'p-3 rounded-xl bg-kara-primary-dark shadow-lg',
  },
  kara: {
    container: 'space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8',
    header: '',
    title: cn(
      'text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight',
      'bg-gradient-to-r from-kara-primary-dark via-kara-secondary-dark to-kara-primary-dark',
      'bg-clip-text text-transparent bg-[length:200%_auto]',
      'animate-[gradient_3s_ease-in-out_infinite]'
    ),
    description: cn(
      'text-sm sm:text-base lg:text-lg text-kara-primary-dark/60 mt-2 sm:mt-3',
      'animate-in fade-in-0 slide-in-from-left-2 duration-500 delay-150'
    ),
    iconContainer: cn(
      'p-3 sm:p-4 rounded-2xl',
      'bg-gradient-to-br from-kara-primary-dark to-kara-secondary-dark',
      'shadow-xl shadow-kara-primary-dark/30',
      'ring-4 ring-kara-primary-light/20',
      'animate-in zoom-in-95 duration-500'
    ),
  },
  minimal: {
    container: 'space-y-4 p-4 sm:p-6',
    header: '',
    title: 'text-xl sm:text-2xl font-bold text-kara-primary-dark',
    description: 'text-sm text-gray-500 mt-1',
    iconContainer: 'p-2 rounded-lg bg-gray-100',
  },
}

export function DashboardPageLayout({
  title,
  description,
  stats,
  actions,
  children,
  className,
  icon: Icon,
  variant = 'kara',
}: DashboardPageLayoutProps) {
  const styles = variantStyles[variant]

  return (
    <div className={cn(styles.container, className)}>
      {/* Header */}
      <PageHeader 
        title={title} 
        description={description} 
        actions={actions}
        icon={Icon}
        variant={variant}
      />

      {/* Stats (optionnel) */}
      {stats && (
        <section 
          className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-200" 
          data-testid="stats-section"
        >
          {stats}
        </section>
      )}

      {/* Contenu principal */}
      <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-300">
        {children}
      </div>
    </div>
  )
}

/**
 * En-tête standardisé pour les pages du dashboard
 */
interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
  icon?: LucideIcon
  variant?: LayoutVariant
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  icon: Icon,
  variant = 'kara',
}: PageHeaderProps) {
  const styles = variantStyles[variant]

  return (
    <header 
      className={cn(
        'flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4',
        'animate-in fade-in-0 slide-in-from-top-4 duration-500',
        styles.header,
        className
      )}
      data-testid="page-header"
    >
      <div className="flex items-start gap-4">
        {/* Icône optionnelle */}
        {Icon && (
          <div className={cn(styles.iconContainer, 'shrink-0')}>
            <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          </div>
        )}
        
        <div className="min-w-0 flex-1">
          <h1 
            className={styles.title}
            data-testid="page-title"
          >
            {title}
          </h1>
          {description && (
            <p 
              className={styles.description}
              data-testid="page-description"
            >
              {description}
            </p>
          )}
        </div>
      </div>
      
      {actions && (
        <div 
          className="shrink-0 animate-in fade-in-0 slide-in-from-right-4 duration-500 delay-200" 
          data-testid="page-actions"
        >
          {actions}
        </div>
      )}
    </header>
  )
}

// Animation keyframes pour le gradient (à ajouter dans globals.css si pas présent)
// @keyframes gradient {
//   0%, 100% { background-position: 0% center; }
//   50% { background-position: 100% center; }
// }
