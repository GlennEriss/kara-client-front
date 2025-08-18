import { createContract, getContract, updateContract } from '@/db/caisse/contracts.db'
import { addPayment, listPayments, updatePayment } from '@/db/caisse/payments.db'
import { addRefund, listRefunds, updateRefund, deleteRefund } from '@/db/caisse/refunds.db'
import { getActiveSettings } from '@/db/caisse/settings.db'
import { computeDueWindow, computePenalty, computeBonus, computeNextDueAt } from './engine'
import { createFile } from '@/db/upload-image.db'
import { compressImage, IMAGE_COMPRESSION_PRESETS } from '@/lib/utils'
import { auth } from '@/firebase/auth'
import { addCaisseContractToUser } from '@/db/member.db'
import { deleteObject, ref } from '@/firebase/storage'
import { getStorageInstance } from '@/firebase/storage'

export async function subscribe(input: { memberId: string; monthlyAmount: number; monthsPlanned: number; caisseType: any; firstPaymentDate: string }) {
  const settings = await getActiveSettings(input.caisseType)
  const id = await createContract({ ...input, ...(settings?.id ? { settingsVersion: settings.id } : {}) })
  
  // Calculer la date de début basée sur firstPaymentDate ou maintenant
  const startDate = input.firstPaymentDate ? new Date(input.firstPaymentDate) : new Date()
  
  // Pré-générer les paiements DUE avec dueAt calculé
  for (let i = 0; i < input.monthsPlanned; i++) {
    const dueDate = new Date(startDate)
    dueDate.setMonth(dueDate.getMonth() + i)
    await addPayment(id, { dueMonthIndex: i, amount: input.monthlyAmount, status: 'DUE', dueAt: dueDate })
  }
  
  // Associer au membre
  await addCaisseContractToUser(input.memberId, id)
  return id
}

export async function pay(input: { contractId: string; dueMonthIndex: number; memberId: string; amount?: number; file?: File; paidAt?: Date; time?: string; mode?: 'airtel_money' | 'mobicash' }) {
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
    const contrib = { 
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // ID unique
      amount: input.amount, 
      paidAt: now, 
      proofUrl: proofUrl || undefined,
      time: input.time,
      mode: input.mode,
      createdAt: new Date()
    }
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

export async function updatePaymentContribution(input: {
  contractId: string
  paymentId: string
  contributionId: string
  updates: {
    amount?: number
    time?: string
    mode?: 'airtel_money' | 'mobicash'
    proofFile?: File
  }
}) {
  const { contractId, paymentId, contributionId, updates } = input
  
  // Récupérer le paiement et la contribution
  const payments = await listPayments(contractId)
  const payment = payments.find((p: any) => p.id === paymentId)
  if (!payment) throw new Error('Paiement introuvable')
  
  if (!payment.contribs || !Array.isArray(payment.contribs)) {
    throw new Error('Aucune contribution trouvée dans ce paiement')
  }
  
  const contributionIndex = payment.contribs.findIndex((c: any) => c.id === contributionId)
  if (contributionIndex === -1) {
    throw new Error('Contribution introuvable')
  }
  
  const contribution = payment.contribs[contributionIndex]
  
  // Traitement de la nouvelle preuve si fournie
  let newProofUrl: string | undefined
  let oldProofUrl: string | undefined
  
  if (updates.proofFile) {
    // Sauvegarder l'ancienne URL pour suppression ultérieure
    oldProofUrl = contribution.proofUrl
    
    // Upload de la nouvelle image
    const location = `caisse/${contractId}/payments/${paymentId}`
    const dataUrl = await compressImage(updates.proofFile, IMAGE_COMPRESSION_PRESETS.document)
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const webpFile = new File([blob], `proof.webp`, { type: 'image/webp' })
    const uploaded = await createFile(webpFile as any, contractId, location)
    newProofUrl = uploaded.url
  }
  
  // Calculer la différence de montant pour ajuster le total accumulé
  const oldAmount = contribution.amount || 0
  const newAmount = updates.amount || oldAmount
  const amountDifference = newAmount - oldAmount
  
  // Mettre à jour la contribution
  const updatedContribution = {
    ...contribution,
    amount: newAmount,
    time: updates.time || contribution.time,
    mode: updates.mode || contribution.mode,
    proofUrl: newProofUrl || contribution.proofUrl,
    updatedAt: new Date()
  }
  
  // Mettre à jour le tableau des contributions
  const updatedContribs = [...payment.contribs]
  updatedContribs[contributionIndex] = updatedContribution
  
  // Calculer le nouveau montant accumulé
  const newAccumulatedAmount = updatedContribs.reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0)
  
  // Mettre à jour le paiement
  await updatePayment(contractId, paymentId, {
    contribs: updatedContribs,
    accumulatedAmount: newAccumulatedAmount,
    updatedAt: new Date(),
    updatedBy: auth?.currentUser?.uid || contractId
  })
  
  // Mettre à jour le contrat si nécessaire (recalculer les totaux)
  const contract = await getContract(contractId)
  if (contract) {
    const allPayments = await listPayments(contractId)
    const totalNominalPaid = allPayments.reduce((sum: number, p: any) => {
      if (p.status === 'PAID') {
        return sum + (p.accumulatedAmount || 0)
      }
      return sum
    }, 0)
    
    await updateContract(contractId, {
      nominalPaid: totalNominalPaid,
      updatedAt: new Date(),
      updatedBy: auth?.currentUser?.uid || contractId
    })
  }
  
  // Supprimer l'ancienne image si elle existe et qu'une nouvelle a été uploadée
  if (oldProofUrl && newProofUrl && oldProofUrl !== newProofUrl) {
    try {
      const storage = getStorageInstance()
      
      // Fonction pour extraire le chemin du fichier depuis l'URL Firebase
      const extractFilePathFromUrl = (url: string): string | null => {
        try {
          // URL Firebase Storage: https://firebasestorage.googleapis.com/v0/b/PROJECT/o/PATH%2FTO%2FFILE?alt=media&token=...
          const urlObj = new URL(url)
          const pathParam = urlObj.searchParams.get('o')
          if (pathParam) {
            // Décoder l'URL et extraire le chemin
            const decodedPath = decodeURIComponent(pathParam)
            return decodedPath
          }
          
          // Fallback: essayer d'extraire depuis le chemin de l'URL
          const pathMatch = url.match(/\/o\/([^?]+)/)
          if (pathMatch) {
            return decodeURIComponent(pathMatch[1])
          }
          
          return null
        } catch (error) {
          console.error('Erreur lors de l\'extraction du chemin:', error)
          return null
        }
      }
      
      const filePath = extractFilePathFromUrl(oldProofUrl)
      if (filePath) {
        const fileRef = ref(storage, filePath)
        await deleteObject(fileRef)
        console.log(`🗑️ Ancienne image supprimée: ${filePath}`)
      } else {
        console.warn('⚠️ Impossible d\'extraire le chemin du fichier depuis l\'URL:', oldProofUrl)
      }
    } catch (error) {
      console.error('⚠️ Erreur lors de la suppression de l\'ancienne image:', error)
      // Ne pas faire échouer la modification si la suppression échoue
    }
  }
  
  return true
}

