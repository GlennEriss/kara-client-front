import { createContract, getContract, updateContract } from '@/db/caisse/contracts.db'
import { addPayment, listPayments, updatePayment } from '@/db/caisse/payments.db'
import { addRefund, listRefunds, updateRefund, deleteRefund } from '@/db/caisse/refunds.db'
import { getActiveSettings } from '@/db/caisse/settings.db'
import { computeDueWindow, computePenalty, computeBonus, computeNextDueAt } from './engine'
import { createFile } from '@/db/upload-image.db'
import { compressImage, IMAGE_COMPRESSION_PRESETS } from '@/lib/utils'
import { auth } from '@/firebase/auth'
import { addCaisseContractToUser } from '@/db/member.db'

export async function subscribe(input: { memberId: string; monthlyAmount: number; monthsPlanned: number; caisseType: any }) {
  const settings = await getActiveSettings(input.caisseType)
  const id = await createContract({ ...input, ...(settings?.id ? { settingsVersion: settings.id } : {}) })
  // Pré-générer les paiements DUE
  for (let i = 0; i < input.monthsPlanned; i++) {
    // dueAt se fixera précisément au start + i mois une fois le M1 payé; on peut mettre un placeholder
    await addPayment(id, { dueMonthIndex: i, amount: input.monthlyAmount, status: 'DUE' })
  }
  // Associer au membre
  await addCaisseContractToUser(input.memberId, id)
  return id
}

export async function pay(input: { contractId: string; dueMonthIndex: number; memberId: string; amount?: number; file?: File; paidAt?: Date }) {
  const contract = await getContract(input.contractId)
  if (!contract) throw new Error('Contrat introuvable')
  const settings = await getActiveSettings((contract as any).caisseType)
  const payments = await listPayments(input.contractId)
  const payment = payments.find((p: any) => p.dueMonthIndex === input.dueMonthIndex)
  if (!payment) throw new Error('Échéance introuvable')

  const now = input.paidAt ? new Date(input.paidAt) : new Date()
  // Si pas de dueAt (premier paiement avant start), considérer dueAt = now pour éviter pénalité
  const dueAt = payment.dueAt ? (typeof (payment.dueAt as any)?.toDate === 'function' ? (payment.dueAt as any).toDate() : new Date(payment.dueAt)) : now
  const { window, delayDays } = computeDueWindow(dueAt, now)

  if (delayDays > 12) {
    // Refus et résiliation
    await updatePayment(input.contractId, payment.id, { status: 'REFUSED' })
    await updateContract(input.contractId, { status: 'RESCINDED' })
    return { status: 'RESCINDED' }
  }

  let proofUrl: string | undefined
  if (input.file) {
    const location = `caisse/${input.contractId}/payments/${payment.id}`
    // compresser en WebP
    const dataUrl = await compressImage(input.file, IMAGE_COMPRESSION_PRESETS.document)
    // convertir dataUrl -> File
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const webpFile = new File([blob], `proof.webp`, { type: 'image/webp' })
    const uploaded = await createFile(webpFile as any, input.memberId, location)
    proofUrl = uploaded.url
  }

  // Gestion des montants selon type
  const type = (contract as any).caisseType || 'STANDARD'
  const targetForMonth = type === 'LIBRE' ? Math.max(100000, payment.targetAmount || 0) : contract.monthlyAmount
  let newAccumulated = payment.accumulatedAmount || 0
  if (typeof input.amount === 'number' && input.amount > 0) {
    newAccumulated += input.amount
  }

  let penalty = 0
  if (window === 'LATE_WITH_PENALTY') {
    penalty = computePenalty(contract.monthlyAmount, delayDays, settings as any)
  }

  // Bonus
  const baseForBonus = type === 'STANDARD'
    ? contract.monthlyAmount
    : type === 'JOURNALIERE'
      ? Math.min(newAccumulated, contract.monthlyAmount)
      : /* LIBRE */ newAccumulated
  const bonusRate = computeBonus(payment.dueMonthIndex, settings as any)
  const bonus = (bonusRate || 0) * (baseForBonus / (contract.monthlyAmount || 1))

  // Construire updates du paiement
  const paymentUpdates: any = {
    penaltyApplied: penalty || 0,
    proofUrl: proofUrl || payment.proofUrl,
    updatedAt: new Date(),
    updatedBy: (auth?.currentUser?.uid) || input.memberId,
  }
  if (typeof input.amount === 'number' && input.amount > 0) {
    paymentUpdates.accumulatedAmount = newAccumulated
    const contrib = { amount: input.amount, paidAt: now, proofUrl: proofUrl || undefined }
    const existing = Array.isArray(payment.contribs) ? payment.contribs : []
    paymentUpdates.contribs = [...existing, contrib]
  }
  // Statut payé si objectif atteint
  const reached = newAccumulated >= targetForMonth || type === 'STANDARD'
  if (reached) {
    paymentUpdates.status = 'PAID'
    paymentUpdates.paidAt = now
  }
  await updatePayment(input.contractId, payment.id, paymentUpdates)

  const isFirstPayment = !contract.contractStartAt
  const contractStartAt = isFirstPayment ? now : contract.contractStartAt
  // Backfill des dueAt si premier paiement
  if (isFirstPayment) {
    for (let i = 0; i < payments.length; i++) {
      const due = new Date(now)
      due.setMonth(due.getMonth() + i)
      await updatePayment(input.contractId, payments[i].id, { dueAt: due })
    }
  }
  // Si on a un start connu, on peut remplir les dueAt des prochains paiements si nécessaire (non requis dans cette itération)
  const incrementNominal = reached ? (type === 'STANDARD' ? contract.monthlyAmount : Math.min(newAccumulated, targetForMonth) - (payment.accumulatedAmount || 0)) : 0
  const updated = {
    nominalPaid: (contract.nominalPaid || 0) + Math.max(0, incrementNominal),
    penaltiesTotal: (contract.penaltiesTotal || 0) + (penalty || 0),
    bonusAccrued: (contract.bonusAccrued || 0) + (reached ? (bonus || 0) : 0),
    contractStartAt,
    updatedAt: new Date(),
    updatedBy: (auth?.currentUser?.uid) || input.memberId,
  } as any

  // Si on connaît le start, calculer fin
  if (contractStartAt && contract.monthsPlanned) {
    const end = new Date(contractStartAt)
    end.setMonth(end.getMonth() + contract.monthsPlanned)
    updated.contractEndAt = end
  }

  // Avancer le mois courant si on paye l’échéance courante
  const newCurrentIdx = Math.max(contract.currentMonthIndex || 0, payment.dueMonthIndex + 1)
  updated.currentMonthIndex = newCurrentIdx
  const nextDueAt = computeNextDueAt({ ...contract, ...updated } as any)
  updated.nextDueAt = nextDueAt

  // Statut
  let status = 'ACTIVE'
  if (window === 'LATE_WITH_PENALTY') status = 'LATE_WITH_PENALTY'
  if (window === 'LATE_NO_PENALTY') status = 'LATE_NO_PENALTY'
  updated.status = status

  await updateContract(input.contractId, updated)
  return { status, penalty, bonus, nextDueAt }
}

export async function requestFinalRefund(contractId: string) {
  const c = await getContract(contractId)
  if (!c) throw new Error('Contrat introuvable')
  // Vérifier que tout est payé
  const payments = await listPayments(contractId)
  const allPaid = payments.length > 0 && payments.every((p: any) => p.status === 'PAID')
  if (!allPaid || (c.monthsPlanned && payments.filter((p: any)=> p.status==='PAID').length < c.monthsPlanned)) {
    throw new Error('Remboursement final indisponible: toutes les échéances ne sont pas payées')
  }
  // Vérifier qu'aucun remboursement final n'existe déjà (idempotence)
  const refunds = await listRefunds(contractId)
  const hasFinal = refunds.some((r: any) => r.type === 'FINAL' && r.status !== 'ARCHIVED')
  if (hasFinal || c.status === 'FINAL_REFUND_PENDING' || c.status === 'CLOSED') {
    throw new Error('Un remboursement final est déjà en cours ou a été traité pour ce contrat')
  }
  await updateContract(contractId, { status: 'FINAL_REFUND_PENDING' })
  const amountNominal = c.nominalPaid || 0
  // Calcul du bonus final: (montant global versé) * (taux du mois final) / 100, à partir de M4
  const settings = await getActiveSettings((c as any).caisseType)
  // Mois final = nombre de mois planifiés si dispo, sinon max des échéances connues
  const finalMonthNumber = (c as any).monthsPlanned
    ? Number((c as any).monthsPlanned)
    : (payments.length > 0 ? (Math.max(...payments.map((p: any) => Number(p.dueMonthIndex || 0))) + 1) : 0)
  let amountBonus = 0
  if (finalMonthNumber >= 4 && settings) {
    const bonusRate = computeBonus(finalMonthNumber - 1, settings as any) || 0 // valeur interprétée comme pourcentage
    amountBonus = (amountNominal || 0) * (Number(bonusRate) / 100)
  }
  const deadlineAt = c.contractEndAt ? new Date(new Date(c.contractEndAt).getTime() + 30*86400000) : new Date()
  await addRefund(contractId, { type: 'FINAL', amountNominal, amountBonus, deadlineAt, status: 'PENDING' })
  return true
}

export async function requestEarlyRefund(contractId: string) {
  const c = await getContract(contractId)
  if (!c) throw new Error('Contrat introuvable')
  // Verrou M4: compter les paiements effectués
  const payments = await listPayments(contractId)
  const paidCount = payments.filter((p: any)=> p.status === 'PAID').length
  const allPaid = payments.length > 0 && paidCount === payments.length
  if (allPaid) {
    throw new Error('Toutes les échéances sont payées. Veuillez demander un remboursement final.')
  }
  // Nouvelle règle: disponible dès qu'il existe au moins un paiement effectué
  if (paidCount < 1) {
    throw new Error('Retrait anticipé indisponible tant qu’aucun versement n’a été effectué')
  }
  // Idempotence: une seule demande anticipée active à la fois
  const refunds = await listRefunds(contractId)
  const hasEarly = refunds.some((r: any) => r.type === 'EARLY' && r.status !== 'ARCHIVED')
  if (hasEarly || c.status === 'EARLY_REFUND_PENDING') {
    throw new Error('Une demande de retrait anticipé est déjà en cours pour ce contrat')
  }
  await updateContract(contractId, { status: 'EARLY_REFUND_PENDING' })
  const amountNominal = c.nominalPaid || 0
  // Bonus du mois précédent (paidCount-1 => M(paidCount-1)) → index = paidCount-2, à partir de M4
  const settings = await getActiveSettings((c as any).caisseType)
  // Montant global versé (toutes contributions)
  let totalPaid = 0
  const type = (c as any).caisseType || 'STANDARD'
  if (type === 'STANDARD') {
    totalPaid = paidCount * (c.monthlyAmount || 0)
  } else {
    for (const p of payments) {
      if (Array.isArray((p as any).contribs)) {
        totalPaid += (p as any).contribs.reduce((sum: number, it: any) => sum + (Number(it.amount) || 0), 0)
      } else if (typeof (p as any).accumulatedAmount === 'number') {
        totalPaid += Number((p as any).accumulatedAmount) || 0
      } else if (p.status === 'PAID' && type === 'JOURNALIERE') {
        totalPaid += c.monthlyAmount || 0
      }
    }
  }
  let amountBonus = 0
  if (settings) {
    const prevIndex = paidCount - 2 // mappe M(paidCount-1)
    const bonusRate = prevIndex >= 0 ? (computeBonus(prevIndex, settings as any) || 0) : 0
    if (prevIndex + 1 >= 4 && bonusRate > 0) {
      amountBonus = (totalPaid || 0) * (Number(bonusRate) / 100)
    }
  }
  const deadlineAt = new Date(Date.now() + 45*86400000)
  await addRefund(contractId, { type: 'EARLY', amountNominal, amountBonus, deadlineAt, status: 'PENDING' })
  return true
}

export async function approveRefund(contractId: string, refundId: string) {
  await updateRefund(contractId, refundId, { status: 'APPROVED' })
  return true
}

export async function markRefundPaid(contractId: string, refundId: string, proof?: File) {
  let proofUrl: string | undefined
  if (proof) {
    const uploaded = await createFile(proof, contractId, `caisse/${contractId}/refunds/${refundId}`)
    proofUrl = uploaded.url
  }
  await updateRefund(contractId, refundId, { status: 'PAID', proofUrl, processedAt: new Date() })
  // Si final → fermer le contrat
  const refunds = await listRefunds(contractId)
  const r = refunds.find((x: any) => x.id === refundId)
  if (r && (r.type === 'FINAL' || r.type === 'EARLY' || r.type === 'DEFAULT')) {
    await updateContract(contractId, { status: 'CLOSED' })
  }
  return true
}

export async function cancelEarlyRefund(contractId: string, refundId: string) {
  // Autoriser l'annulation uniquement si statut PENDING
  const refunds = await listRefunds(contractId)
  const r = refunds.find((x: any) => x.id === refundId)
  if (!r) throw new Error('Demande introuvable')
  if (r.type !== 'EARLY') throw new Error('Seules les demandes de retrait anticipé peuvent être annulées')
  if (r.status !== 'PENDING') throw new Error('Seules les demandes en attente peuvent être annulées')
  await deleteRefund(contractId, refundId)
  // Revenir à un statut actif cohérent si nécessaire
  await updateContract(contractId, { status: 'ACTIVE' })
  return true
}

