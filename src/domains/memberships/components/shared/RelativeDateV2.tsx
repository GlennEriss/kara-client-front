/**
 * Affichage de date relative avec indicateur d'urgence V2
 * 
 * Format :
 * - < 1 jour : "Aujourd'hui"
 * - < 7 jours : "Il y a X jours"
 * - < 30 jours : "Il y a X semaines"
 * - < 365 jours : "Il y a X mois"
 * - >= 365 jours : Date complète
 * 
 * Couleur selon l'ancienneté (selon WIREFRAME_UI.md section 6.4) :
 * - < 7 jours : vert (normal)
 * - 7-30 jours : orange (attention)
 * - > 30 jours : rouge (urgent)
 */

'use client'

import { cn } from '@/lib/utils'
import { Clock } from 'lucide-react'

interface RelativeDateV2Props {
  date: Date | string
  className?: string
  showIcon?: boolean
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const ONE_WEEK_MS = 7 * ONE_DAY_MS
const ONE_MONTH_MS = 30 * ONE_DAY_MS
const ONE_YEAR_MS = 365 * ONE_DAY_MS

function formatRelativeDate(date: Date): { text: string; color: string } {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / ONE_DAY_MS)
  
  // Format heure (HH:mm)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const timeStr = `${hours}:${minutes}`

  // < 1 jour (Aujourd'hui)
  if (diffDays === 0) {
    return { text: `Aujourd'hui à ${timeStr}`, color: 'text-emerald-600' }
  }

  // 1 jour (Hier)
  if (diffDays === 1) {
    return { text: `Hier à ${timeStr}`, color: 'text-emerald-600' }
  }

  // < 7 jours
  if (diffDays < 7) {
    return { text: `Il y a ${diffDays} jours`, color: 'text-emerald-600' }
  }

  // 7-30 jours (attention)
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return { 
      text: weeks === 1 ? 'Il y a 1 semaine' : `Il y a ${weeks} semaines`,
      color: 'text-amber-600' 
    }
  }

  // 30-365 jours (urgent)
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return { 
      text: months === 1 ? 'Il y a 1 mois' : `Il y a ${months} mois`,
      color: 'text-red-600' 
    }
  }

  // >= 365 jours : Date complète
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return { 
    text: `${day}/${month}/${year}`, 
    color: 'text-red-600' 
  }
}

export function RelativeDateV2({ date, className, showIcon = true }: RelativeDateV2Props) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const { text, color } = formatRelativeDate(dateObj)

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium transition-colors duration-200',
        color,
        className
      )}
      data-testid="relative-date"
      title={dateObj.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })}
    >
      {showIcon && <Clock className="w-3 h-3" />}
      <span>{text}</span>
    </div>
  )
}
