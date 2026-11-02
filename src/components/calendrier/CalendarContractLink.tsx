'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMyAccess } from '@/hooks/useMyAccess'
import type { OverdueProduct } from '@/hooks/useOverduePayments'
import { calendarContractHref } from '@/utils/calendar-contract-link'

interface CalendarContractLinkProps {
  product: OverdueProduct
  contractId: string
  className?: string
}

export function CalendarContractLink({ product, contractId, className }: CalendarContractLinkProps) {
  const { can, isLoading } = useMyAccess()
  const href = calendarContractHref(product, contractId, can)
  if (isLoading || !href) return null

  const label = product === 'Placement' ? 'Ouvrir le placement' : 'Ouvrir le contrat'
  return (
    <Button asChild size="sm" variant="outline" className={className}>
      <Link href={href} onClick={(event) => event.stopPropagation()} title={`${label} ${contractId}`}>
        <ExternalLink className="mr-1.5 h-3.5 w-3.5 shrink-0" />
        {label}
      </Link>
    </Button>
  )
}
