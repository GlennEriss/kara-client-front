import { useState } from 'react'

export interface MenuState {
  isMenuOpen: boolean
}

export interface MenuActions {
  toggleMenu: () => void
  closeMenu: () => void
  openMenu: () => void
}

export const useMenu = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)
  const closeMenu = () => setIsMenuOpen(false)
  const openMenu = () => setIsMenuOpen(true)

  return {
    state: { isMenuOpen },
    actions: { toggleMenu, closeMenu, openMenu }
  }
}
