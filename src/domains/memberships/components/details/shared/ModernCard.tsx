/**
 * Composant ModernCard pour les sections de détails
 * Style uniforme avec icône et titre
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ModernCardProps {
  title: string
  icon: React.ComponentType<any>
  children: React.ReactNode
  className?: string
  iconColor?: string
}

export function ModernCard({
  title,
  icon: Icon,
  children,
  className = "",
  iconColor = "text-[#234D65]"
}: ModernCardProps) {
  return (
    <Card className={`group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-white to-gray-50/30 border-0 shadow-lg ${className}`}>
      <CardHeader className="pb-3 lg:pb-4">
        <CardTitle className="flex items-center gap-2 lg:gap-3 text-base lg:text-lg font-bold text-gray-900">
          <div className={`p-2 lg:p-2.5 rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110`} style={{ backgroundColor: `${iconColor}15` }}>
            <Icon className={`w-4 h-4 lg:w-5 lg:h-5 ${iconColor}`} />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  )
}
