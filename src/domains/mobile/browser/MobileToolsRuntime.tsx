'use client'
import { useEffect } from 'react'
import { installToolsRuntime } from './tools-runtime'
export function MobileToolsRuntime() {
  useEffect(() => installToolsRuntime(), [])
  return null
}
