export type MyGroupAgreement = {
  id: string
  groupId: string
  title: string
  description: string
  agreementDate: string
  role: 'PAYER' | 'RECEIVER'
  counterpartyName: string
  quantity: number
  unitAmount: number
  totalAmount: number
  status:
    | 'ACTIVE'
    | 'PARTIAL'
    | 'OVERDUE'
    | 'PENDING_REMITTANCE'
    | 'SETTLED'
    | 'CANCELLED'
  paid: number
  remaining: number
  overdue: number
  heldByKara: number
  receivedByCreditor: number
  receivable: number
  schedule: {
    id: string
    dueDate: string
    amount: number
    paid: number
    remaining: number
  }[]
  payments: {
    id: string
    date: string
    amount: number
    receivedBy: 'CREDITOR' | 'KARA'
  }[]
  remittances: { id: string; date: string; amount: number }[]
}
