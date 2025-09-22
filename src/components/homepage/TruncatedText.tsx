import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface TruncatedTextProps {
  id: string
  fullText: string
  truncatedText: string
  className?: string
  expandedTexts: Record<string, boolean>
  onToggle: (textId: string) => void,
  isTextWhite?: boolean
}

export const TruncatedText = ({
  id,
  fullText,
  truncatedText,
  className = "text-lg leading-relaxed text-gray-700",
  expandedTexts,
  onToggle,
  isTextWhite = false
}: TruncatedTextProps) => {
  const isExpanded = expandedTexts[id] || false
  
  return (
    <div>
      <p className={className}>
        {isExpanded ? fullText : truncatedText}
      </p>
      <button
        onClick={() => onToggle(id)}
        className={cn("md:hidden mt-2 mx-auto hover:text-kara-gold transition-colors text-sm font-medium flex items-center",
          isTextWhite ? "text-white" : "text-kara-blue"
        )}
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
