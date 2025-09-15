import { ChevronDown, ChevronUp } from 'lucide-react'
import { useTruncatedText } from '@/hooks/homepage/useTruncatedText'

interface TruncatedTextProps {
  id: string
  fullText: string
  truncatedText: string
  className?: string
  expandedTexts: Record<string, boolean>
  onToggle: (textId: string) => void
}

export const TruncatedText = ({
  id,
  fullText,
  truncatedText,
  className = "text-lg leading-relaxed text-gray-700",
  expandedTexts,
  onToggle
}: TruncatedTextProps) => {
  const { actions } = useTruncatedText()
  const isExpanded = actions.isExpanded(id)
  
  return (
    <div>
      <p className={className}>
        {isExpanded ? fullText : truncatedText}
      </p>
      <button
        onClick={() => onToggle(id)}
        className="md:hidden mt-2 text-kara-blue hover:text-kara-gold transition-colors text-sm font-medium flex items-center"
      >
        {isExpanded ? (
          <>
            Voir moins <ChevronUp size={16} className="ml-1" />
          </>
        ) : (
          <>
            Voir plus <ChevronDown size={16} className="ml-1" />
          </>
        )}
      </button>
    </div>
  )
}
