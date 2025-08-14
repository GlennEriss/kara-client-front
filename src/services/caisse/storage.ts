export function buildPaymentProofPath(contractId: string, paymentId: string, memberId: string, filename: string) {
  const ts = new Date().toISOString().replace(/[:.]/g, '')
  return `caisse/${contractId}/payments/${paymentId}/${ts}_${memberId}_${filename}`
}

export function buildRefundProofPath(contractId: string, refundId: string, type: string, filename: string) {
  const ts = new Date().toISOString().replace(/[:.]/g, '')
  return `caisse/${contractId}/refunds/${refundId}/${ts}_${type}_${filename}`
}

