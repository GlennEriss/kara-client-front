import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import routes from '@/constantes/routes'
import { useAuth } from '@/hooks/useAuth'

// Types pour les états
export interface HomepageState {
  isMenuOpen: boolean
  isScrolled: boolean
  expandedTexts: Record<string, boolean>
}

// Types pour les actions
export interface HomepageActions {
  toggleMenu: () => void
  scrollToSection: (sectionId: string) => void
  toggleText: (textId: string) => void
  handleRegister: () => void
}

// Hook principal pour la homepage
export const useHomepageLogic = () => {
  const { user } = useAuth()
  const router = useRouter()
  
  // États locaux
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [expandedTexts, setExpandedTexts] = useState<Record<string, boolean>>({})

  // Gestion du scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Actions
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      const navbarHeight = 100
      const elementPosition = element.offsetTop - navbarHeight

      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      })
      setIsMenuOpen(false)
    }
  }

  const toggleText = (textId: string) => {
    setExpandedTexts(prev => ({
      ...prev,
      [textId]: !prev[textId]
    }))
  }

  const handleRegister = () => {
    router.push(routes.public.register)
  }

  return {
    // État
    state: {
      isMenuOpen,
      isScrolled,
      expandedTexts,
      user
    },
    // Actions
    actions: {
      toggleMenu,
      scrollToSection,
      toggleText,
      handleRegister
    }
  }
}

// Hook pour les textes tronqués
export const useTruncatedText = (textId: string, expandedTexts: Record<string, boolean>, toggleText: (textId: string) => void) => {
  const isExpanded = expandedTexts[textId]
  
  return {
    isExpanded,
    toggle: () => toggleText(textId)
  }
}
