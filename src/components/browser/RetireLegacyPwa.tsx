'use client'
import { useEffect } from 'react'
import { retireLegacyPwaForBrowser } from './retire-legacy-pwa'
export function RetireLegacyPwa() {
  useEffect(() => {
    void retireLegacyPwaForBrowser()
  }, [])
  return null
}
