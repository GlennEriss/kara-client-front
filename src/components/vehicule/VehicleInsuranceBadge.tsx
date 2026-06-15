'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { VEHICLE_INSURANCE_STATUS_LABELS, VehicleInsuranceStatus } from '@/types/types'
import { AlertTriangle, Ban, CheckCircle2 } from 'lucide-react'

const STATUS_STYLES: Record<VehicleInsuranceStatus, string> = {
  active: 'bg-green-100 text-green-800 border border-green-200',
  expires_soon: 'bg-amber-100 text-amber-800 border border-amber-200',
  expired: 'bg-red-100 text-red-800 border border-red-200',
}

const STATUS_ICONS: Record<VehicleInsuranceStatus, React.ComponentType<{ className?: string }>> = {
  active: CheckCircle2,
  expires_soon: AlertTriangle,
  expired: Ban,
}

export function VehicleInsuranceBadge({ status }: { status: VehicleInsuranceStatus }) {
  const Icon = STATUS_ICONS[status]
  return (
    <Badge className={cn('inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full', STATUS_STYLES[status])}>
      <Icon className="h-3 w-3" />
      {VEHICLE_INSURANCE_STATUS_LABELS[status]}
    </Badge>
  )
}

