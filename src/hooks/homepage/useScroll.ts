import { useState, useEffect } from 'react'

export interface ScrollState {
  isScrolled: boolean
  scrollY: number
}

export const useScroll = (threshold: number = 50) => {
  const [scrollState, setScrollState] = useState<ScrollState>({
    isScrolled: false,
    scrollY: 0
  })

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      setScrollState({
        isScrolled: scrollY > threshold,
        scrollY
      })
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold])

  return scrollState
}
