'use client'
import React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

export interface LogoProps {
  /**
   * Variante du logo qui détermine le style par défaut
   */
  variant?: 'navbar' | 'footer' | 'default' | 'with-bg'
  
  /**
   * Taille du logo
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  
  /**
   * Classes CSS personnalisées
   */
  className?: string
  
  /**
   * Alt text pour l'accessibilité
   */
  alt?: string
  
  /**
   * Indique si la navbar est scrollée (pour la variante navbar)
   */
  isScrolled?: boolean
  
  /**
   * Fonction à exécuter au clic
   */
  onClick?: () => void
  
  /**
   * Si le logo doit être cliquable
   */
  clickable?: boolean
  
  /**
   * Priorité de chargement de l'image
   */
  priority?: boolean
  
  /**
   * Styles CSS inline
   */
  style?: React.CSSProperties
}

/**
 * Composant Logo centralisé pour KARA
 * 
 * Gère automatiquement les styles selon la variante et l'état
 * Optimisé avec Next.js Image pour les performances
 */
const Logo: React.FC<LogoProps> = ({
  variant = 'default',
  size = 'md',
  className,
  alt = 'KARA Logo',
  isScrolled = false,
  onClick,
  clickable = false,
  priority = false,
  style
}) => {
  
  // Styles de base selon la variante
  const getVariantStyles = () => {
    switch (variant) {
      case 'navbar':
        return cn(
          'logo-kara transition-all duration-300 ease-in-out',
          isScrolled 
            ? 'filter-none' // Logo coloré quand navbar scrollée
            : '', // Logo blanc par défaut
          'hover:scale-105',
          isScrolled 
            ? 'hover:sepia hover:saturate-120 hover:hue-rotate-35'
            : 'hover:brightness-0 hover:invert hover:sepia hover:saturate-1000 hover:hue-rotate-35'
        )
      
      case 'footer':
        return cn(
          'footer-logo transition-all duration-300 ease-in-out',
          'hover:scale-105'
        )
      
      case 'with-bg':
        return cn(
          'transition-all duration-300 ease-in-out',
          'hover:scale-105',
          'rounded-lg shadow-lg' // Ajoute un effet de carte pour le logo avec fond
        )
      
      default:
        return cn(
          'transition-all duration-300 ease-in-out',
          'hover:scale-105'
        )
    }
  }

  // Tailles prédéfinies
  const getSizeStyles = () => {
    switch (size) {
      case 'xs':
        return 'h-8! w-auto'
      case 'sm':
        return 'h-12! w-auto'
      case 'md':
        return 'h-16! w-auto'
      case 'lg':
        return 'h-20! w-auto'
      case 'xl':
        return 'h-24! w-auto'
      default:
        return 'h-16! w-auto'
    }
  }

  // Classes CSS finales
  const logoClasses = cn(
    getSizeStyles(),
    getVariantStyles(),
    clickable && 'cursor-pointer',
    className
  )

  // Source de l'image selon la variante
  const getImageSrc = () => {
    switch (variant) {
      case 'with-bg':
        return '/Logo-Kara-bg.jpg'
      default:
        return '/Logo-Kara.webp'
    }
  }

  // Props pour l'image
  const imageProps = {
    src: getImageSrc(),
    alt,
    width: 300, // Taille native approximative
    height: 300, // Taille native approximative
    priority,
    className: logoClasses,
    onClick: clickable ? onClick : undefined,
  }

  return (
    <div className={cn('inline-block', clickable && 'cursor-pointer')} onClick={clickable ? onClick : undefined}>
      <Image
        {...imageProps}
        style={{
          width: 'auto',
          height: 'auto',
          ...style
        }}
      />
    </div>
  )
}

export default Logo

// Export des variantes prédéfinies pour simplifier l'utilisation
export const NavbarLogo: React.FC<Omit<LogoProps, 'variant'>> = (props) => (
  <Logo variant="navbar" {...props} />
)

export const FooterLogo: React.FC<Omit<LogoProps, 'variant'>> = (props) => (
  <Logo variant="footer" {...props} />
)

export const DefaultLogo: React.FC<Omit<LogoProps, 'variant'>> = (props) => (
  <Logo variant="default" {...props} />
)

export const LogoWithBg: React.FC<Omit<LogoProps, 'variant'>> = (props) => (
  <Logo variant="with-bg" {...props} />
)