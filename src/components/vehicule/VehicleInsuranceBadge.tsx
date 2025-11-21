'use client'

import { Badge } from '@/components/ui/badge'
import { VEHICLE_INSURANCE_STATUS_LABELS, VehicleInsuranceStatus } from '@/types/types'
import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<VehicleInsuranceStatus, string> = {
  active: 'bg-green-100 text-green-800 border border-green-200',
  expires_soon: 'bg-amber-100 text-amber-800 border border-amber-200',
  expired: 'bg-red-100 text-red-800 border border-red-200',
}

export function VehicleInsuranceBadge({ status }: { status: VehicleInsuranceStatus }) {
  return (
    <Badge className={cn('text-xs font-semibold px-3 py-1 rounded-full', STATUS_STYLES[status])}>
      {VEHICLE_INSURANCE_STATUS_LABELS[status]}
    </Badge>
  )
}

