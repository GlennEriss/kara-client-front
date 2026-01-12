/**
 * StatsCard - Composant réutilisable pour les statistiques modernes
 * 
 * Utilise les couleurs KARA (kara-primary-dark, kara-primary-light)
 * Voir documentation/DESIGN_SYSTEM_COULEURS_KARA.md
 * 
 * Utilisé dans :
 * - Caisse spéciale
 * - Géographie V2
 * - Autres modules futurs
 */

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: number | string
  subtitle?: string
  color?: string
  variant?: 'default' | 'kara-blue' | 'kara-gold' | 'success' | 'warning' | 'error'
  icon: React.ComponentType<any>
  onClick?: () => void
  testId?: string
  className?: string
}

const variantStyles = {
  default: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    icon: 'text-gray-600',
  },
  'kara-blue': {
    bg: 'bg-kara-primary-dark/10',
    text: 'text-kara-primary-dark',
    icon: 'text-kara-primary-dark',
  },
  'kara-gold': {
    bg: 'bg-kara-primary-light/20',
    text: 'text-kara-primary-dark',
    icon: 'text-kara-primary-light',
  },
  success: {
    bg: 'bg-kara-success/10',
    text: 'text-kara-success',
    icon: 'text-kara-success',
  },
  warning: {
    bg: 'bg-kara-warning/10',
    text: 'text-kara-warning',
    icon: 'text-kara-warning',
  },
  error: {
    bg: 'bg-kara-error/10',
    text: 'text-kara-error',
    icon: 'text-kara-error',
  },
}

export function StatsCard({
  title,
  value,
  subtitle,
  color,
  variant = 'kara-blue',
  icon: Icon,
  onClick,
  testId,
  className,
}: StatsCardProps) {
  const styles = variantStyles[variant]
  
  return (
    <Card 
      className={cn(
        "group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border border-kara-primary-dark/10 shadow-sm",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      data-testid={testId}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div 
            className={cn(
              "p-2 sm:p-2.5 rounded-lg transition-transform duration-300 group-hover:scale-105",
              color ? '' : styles.bg
            )}
            style={color ? { backgroundColor: `${color}15`, color: color } : undefined}
            aria-hidden="true"
          >
            <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", !color && styles.icon)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-[10px] sm:text-xs font-semibold uppercase tracking-wider truncate",
              styles.text
            )}>
              {title}
            </p>
            <p 
              className="text-xl sm:text-2xl font-bold text-kara-primary-dark mt-0.5" 
              data-testid={testId ? `${testId}-value` : undefined}
            >
              {value}
            </p>
            {subtitle && (
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
