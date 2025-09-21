import { useState } from 'react'

export interface TruncatedTextState {
  expandedTexts: Record<string, boolean>
}

export interface TruncatedTextActions {
  toggleText: (textId: string) => void
  expandText: (textId: string) => void
  collapseText: (textId: string) => void
  isExpanded: (textId: string) => boolean
}

export const useTruncatedText = () => {
  const [expandedTexts, setExpandedTexts] = useState<Record<string, boolean>>({})

  const toggleText = (textId: string) => {
    setExpandedTexts(prev => ({
      ...prev,
      [textId]: !prev[textId]
    }))
  }

  const expandText = (textId: string) => {
    setExpandedTexts(prev => ({
      ...prev,
      [textId]: true
    }))
  }

  const collapseText = (textId: string) => {
    setExpandedTexts(prev => ({
      ...prev,
      [textId]: false
    }))
  }

  const isExpanded = (textId: string) => {
    return expandedTexts[textId] || false
  }

  return {
    state: { expandedTexts },
    actions: { toggleText, expandText, collapseText, isExpanded }
  }
}
