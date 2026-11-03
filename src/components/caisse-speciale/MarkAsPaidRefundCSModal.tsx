'use client'

import { FinalizeRefundHandoverModal } from '@/components/refunds/FinalizeRefundHandoverModal'

interface Props {
  isOpen: boolean
  onClose: () => void
  contractId: string
  refundId: string
  refundLabel: string
  refundType?: string
  approvedAt?: unknown
  payoutDueAt?: unknown
  userId: string
  onSuccess?: () => void | Promise<void>
}

export default function MarkAsPaidRefundCSModal(props: Props) {
  return <FinalizeRefundHandoverModal open={props.isOpen} fund="CS" {...props} />
}
