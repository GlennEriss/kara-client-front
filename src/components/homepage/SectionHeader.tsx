import React from 'react'
import { LucideIcon } from 'lucide-react'

interface SectionHeaderProps {
  icon?: LucideIcon
  title: string
  subtitle?: string
  description?: string
  className?: string
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon: Icon,
  title,
  subtitle,
  description,
  className = ""
}) => {
  return (
    <div className={`text-center mb-16 animate-fade-in-up ${className}`}>
      {Icon && (
        <div className="inline-flex items-center justify-center w-16 h-16 bg-kara-blue/10 rounded-2xl mb-6">
          <Icon className="w-8 h-8 text-kara-blue" />
        </div>
      )}
      
      {subtitle && (
        <div className="inline-block px-4 py-2 bg-kara-gold/10 text-kara-gold text-sm font-semibold rounded-full mb-4">
          {subtitle}
        </div>
      )}
      
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-kara-blue mb-6">
        {title}
      </h2>
      
      <div className="section-divider mx-auto mb-4"></div>
      
      {description && (
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          {description}
        </p>
      )}
    </div>
  )
}
