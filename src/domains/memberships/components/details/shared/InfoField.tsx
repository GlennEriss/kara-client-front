/**
 * Composant InfoField pour affichage uniforme des champs d'information
 * Utilisé dans toutes les cartes de détails
 */

'use client'

import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface InfoFieldProps {
  label: string
  value: string | React.ReactNode
  icon?: React.ComponentType<any>
  color?: string
  copyable?: boolean
  'data-testid'?: string
}

export function InfoField({
  label,
  value,
  icon: Icon,
  color = "text-gray-600",
  copyable = false,
  'data-testid': dataTestId
}: InfoFieldProps) {
  return (
    <div 
      className="group p-3 lg:p-4 rounded-xl bg-gradient-to-br from-gray-50/50 to-white hover:from-gray-100/50 hover:to-gray-50/50 transition-all duration-300 border border-gray-100 hover:border-gray-200 hover:shadow-sm"
      data-testid={dataTestId}
    >
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
        {label}
      </label>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
          {Icon && <Icon className={`w-4 h-4 ${color} group-hover:scale-110 transition-transform duration-300 flex-shrink-0`} />}
          <span className="font-medium text-gray-900 text-sm lg:text-base truncate">{value}</span>
        </div>
        {copyable && (
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-all duration-300 h-8 w-8 p-0 flex-shrink-0"
            onClick={() => {
              navigator.clipboard.writeText(String(value))
              toast.success('Copié !', { duration: 2000 })
            }}
          >
            <Copy className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  )
}
