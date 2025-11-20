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
import type { GroupPaymentContribution } from './types'
import { EmergencyContact } from '@/schemas/emergency-contact.schema'
import type { PaymentMode } from '@/types/types'

// Fonction utilitaire pour générer un ID de contribution personnalisé
function generateContributionId(memberId: string, paidAt: Date): string {
  const date = paidAt.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit', 
    year: '2-digit'
  }).replace(/\//g, '')
  
  const time = paidAt.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(/:/g, '')
  
  return `MK_CS_P_${memberId}_${date}_${time}`
}

// Fonction utilitaire pour convertir n'importe quel type de date en chaîne ISO
function normalizeDateToISOString(dateValue: any): string | null {
  if (!dateValue) return null
  
  try {
    let date: Date
    
    // Si c'est un objet Firestore Timestamp
    if (dateValue && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate()
    }
    // Si c'est déjà un objet Date
    else if (dateValue instanceof Date) {
      date = dateValue
    }
    // Si c'est une chaîne de caractères
    else if (typeof dateValue === 'string') {
      date = new Date(dateValue)
    }
    // Si c'est un timestamp numérique
    else if (typeof dateValue === 'number') {
      date = new Date(dateValue)
    }
    // Sinon, essayer de créer une Date
    else {
      date = new Date(dateValue)
    }
    
    // Vérifier que la date est valide
    if (isNaN(date.getTime())) {
      return null
    }
    
    return date.toISOString().split('T')[0]
  } catch (error) {
    console.error('Erreur lors de la conversion de date:', error)
    return null
  }
}

export async function subscribe(input: { 
  memberId?: string; 
  groupeId?: string; 
  monthlyAmount: number; 
  monthsPlanned: number; 
  caisseType: any; 
  firstPaymentDate: string;
  contractPdf?: File;
  emergencyContact?: EmergencyContact;
}) {
  // Validation : doit avoir soit memberId soit groupeId, mais pas les deux
  if (!input.memberId && !input.groupeId) {
    throw new Error('Doit spécifier soit memberId soit groupeId')
  }
  if (input.memberId && input.groupeId) {
    throw new Error('Ne peut pas avoir à la fois memberId et groupeId')
  }

  // Déterminer le type de contrat
  const contractType = input.memberId ? 'INDIVIDUAL' : 'GROUP'
  
  const settings = await getActiveSettings(input.caisseType)
  
  // Récupérer le matricule du membre si c'est un contrat individuel
  let memberMatricule = '0000' // Fallback par défaut
  if (input.memberId) {
    try {
      const { getMemberWithSubscription } = await import('@/db/member.db')
      const member = await getMemberWithSubscription(input.memberId)
      memberMatricule = member?.matricule || '0000'
    } catch (error) {
      console.warn('⚠️ Impossible de récupérer le matricule du membre:', error)
    }
  } else if (input.groupeId) {
    // Pour les contrats de groupe, utiliser un matricule générique
    memberMatricule = 'GRP' + input.groupeId.slice(-3).padStart(3, '0')
  }
  
  // Nettoyer les données pour éviter les valeurs undefined dans Firestore
  const cleanData: any = {
    contractType,
    monthlyAmount: input.monthlyAmount,
    monthsPlanned: input.monthsPlanned,
    caisseType: input.caisseType,
    firstPaymentDate: input.firstPaymentDate,
    memberMatricule, // Ajouter le matricule pour la génération d'ID
    ...(settings?.id ? { settingsVersion: settings.id } : {}),
    ...(input.emergencyContact ? { emergencyContact: input.emergencyContact } : {})
  }
  
  // Ajouter seulement les champs non-undefined
  if (input.memberId) {
    cleanData.memberId = input.memberId
  }
  if (input.groupeId) {
    cleanData.groupeId = input.groupeId
  }
  
  console.log('🧹 Données nettoyées pour Firestore:', cleanData)
  
  const id = await createContract(cleanData)
  
  // Téléverser le PDF du contrat signé si fourni
  if (input.contractPdf) {
    try {
      console.log('📄 Téléversement du contrat PDF signé...')
      const { uploadSignedContract } = await import('@/db/upload-file.db')
      const pdfData = await uploadSignedContract(input.contractPdf, id)
      
      // Mettre à jour le contrat avec les informations du PDF
      const { updateContract } = await import('@/db/caisse/contracts.db')
      await updateContract(id, {
        contractPdf: {
          url: pdfData.url,
          path: pdfData.path,
          uploadedAt: new Date(),
          originalFileName: input.contractPdf.name,
          fileSize: input.contractPdf.size
        }
      })
      
      console.log('✅ Contrat PDF téléversé et enregistré avec succès')
    } catch (error: any) {
      console.error('❌ Erreur lors du téléversement du PDF:', error)
      // Ne pas faire échouer la création du contrat si le PDF échoue
      console.warn('⚠️ Le contrat a été créé mais le PDF n\'a pas pu être téléversé')
    }
  }
  
  // Calculer la date de début basée sur firstPaymentDate ou maintenant
  const startDate = input.firstPaymentDate ? new Date(input.firstPaymentDate) : new Date()
  
  // Pré-générer les paiements DUE avec dueAt calculé
  for (let i = 0; i < input.monthsPlanned; i++) {
    const dueDate = new Date(startDate)
    dueDate.setMonth(dueDate.getMonth() + i)
    await addPayment(id, { 
      dueMonthIndex: i, 
      amount: input.monthlyAmount, 
      status: 'DUE', 
      dueAt: dueDate,
      memberId: input.memberId || input.groupeId || 'UNKNOWN' // Passer l'ID pour générer l'ID personnalisé
    })
  }
  
  // Associer au membre ou au groupe selon le type
  if (contractType === 'INDIVIDUAL' && input.memberId) {
    await addCaisseContractToUser(input.memberId, id)
  } else if (contractType === 'GROUP' && input.groupeId) {
    const { addCaisseContractToEntity } = await import('@/db/member.db')
    await addCaisseContractToEntity(input.groupeId, id, 'GROUP')
  }
  
  return id
}

export async function pay(input: { contractId: string; dueMonthIndex: number; memberId: string; amount?: number; file?: File; paidAt?: Date; time?: string; mode?: PaymentMode }) {
  const contract = await getContract(input.contractId)
  if (!contract) throw new Error('Contrat introuvable')
  const settings = await getActiveSettings((contract as any).caisseType)
  const payments = await listPayments(input.contractId)
  const payment = payments.find((p: any) => p.dueMonthIndex === input.dueMonthIndex)
  if (!payment) throw new Error('Échéance introuvable')

  const now = input.paidAt ? new Date(input.paidAt) : new Date()
  const actualToday = new Date() // Date actuelle réelle
  actualToday.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  
  // Si pas de dueAt (premier paiement avant start), considérer dueAt = now pour éviter pénalité
  const dueAt = payment.dueAt ? (typeof (payment.dueAt as any)?.toDate === 'function' ? (payment.dueAt as any).toDate() : new Date(payment.dueAt)) : now
  
  // Ne calculer les pénalités que si le versement n'est pas pour une date future
  let window: 'LATE_NO_PENALTY' | 'LATE_WITH_PENALTY' | 'DEFAULTED_AFTER_J12' = 'LATE_NO_PENALTY'
  let delayDays = 0
  
  if (now <= actualToday) {
    // Le versement est pour aujourd'hui ou dans le passé : calculer les pénalités normalement
    const result = computeDueWindow(dueAt, now)
    window = result.window
    delayDays = result.delayDays
  }
  // Sinon (versement futur), pas de pénalités : window reste 'LATE_NO_PENALTY' et delayDays reste 0

  if (delayDays > 12) {
    // Refus et résiliation
    await updatePayment(input.contractId, payment.id, { status: 'REFUSED' })
    await updateContract(input.contractId, { status: 'RESCINDED' })
    return { status: 'RESCINDED' }
  }

  let proofUrl: string | undefined
  if (input.file) {
    console.log('🔍 [pay] Début upload image:', {
      fileName: input.file.name,
      fileSize: input.file.size,
      fileType: input.file.type
    })
    
    const location = `caisse/${input.contractId}/payments/${payment.id}`
    console.log('📁 [pay] Location:', location)
    
    // compresser en WebP
    const dataUrl = await compressImage(input.file, IMAGE_COMPRESSION_PRESETS.document)
    // convertir dataUrl -> File
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    // Générer un nom de fichier unique avec timestamp
    const uniqueFileName = `${Date.now()}_proof.webp`
    console.log('📝 [pay] Nom de fichier généré:', uniqueFileName)
    
    const webpFile = new File([blob], uniqueFileName, { type: 'image/webp' })
    const uploaded = await createFile(webpFile as any, input.memberId, location)
    proofUrl = uploaded.url
    console.log('✅ [pay] Image uploadée avec succès:', {
      fileName: uniqueFileName,
      url: proofUrl,
      paymentId: payment.id
    })
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
  // Pour LIBRE, utiliser le montant accumulé AVANT ce paiement (le montant du mois précédent)
  // Pour STANDARD et JOURNALIERE, utiliser le montant mensuel
  const baseForBonus = type === 'STANDARD'
    ? contract.monthlyAmount
    : type === 'JOURNALIERE'
      ? Math.min(newAccumulated, contract.monthlyAmount)
      : /* LIBRE */ (payment.accumulatedAmount || 0) // Utiliser le montant accumulé AVANT ce paiement
  // Utiliser le taux du mois précédent (pour le mois 5, utiliser le taux du mois 4)
  // Pour le mois 4 (index 3), on utilise déjà le taux du mois 4 (M4)
  // Pour le mois 5 (index 4), on veut utiliser le taux du mois 4 (M4), donc monthIndex - 1
  const bonusMonthIndex = payment.dueMonthIndex >= 3 ? Math.max(3, payment.dueMonthIndex - 1) : payment.dueMonthIndex
  const bonusRate = computeBonus(bonusMonthIndex, settings as any)
  // bonusRate est un pourcentage (ex: 5 pour 5%), donc diviser par 100
  // Pour LIBRE, baseForBonus = accumulatedAmount (montant accumulé jusqu'au mois précédent)
  // Pour STANDARD et JOURNALIERE, baseForBonus = monthlyAmount ou min(accumulated, monthlyAmount)
  const bonus = (bonusRate || 0) / 100 * baseForBonus

  // Construire updates du paiement
  const paymentUpdates: any = {
    penaltyApplied: penalty || 0,
    penaltyDays: delayDays > 0 ? delayDays : 0, // Nombre de jours de retard
    proofUrl: proofUrl || payment.proofUrl,
    updatedAt: new Date(),
    updatedBy: (auth?.currentUser?.uid) || input.memberId,
    // Enregistrer les informations de paiement
    time: input.time,
    mode: input.mode,
  }
  if (typeof input.amount === 'number' && input.amount > 0) {
    paymentUpdates.accumulatedAmount = newAccumulated
    // Pour les contrats LIBRE, amount représente le montant total accumulé versé
    // Pour les contrats STANDARD, amount reste égal au montant mensuel
    if (type === 'LIBRE') {
      paymentUpdates.amount = newAccumulated
    } else {
      // Pour STANDARD et JOURNALIERE, amount = montant mensuel (fixe)
      paymentUpdates.amount = contract.monthlyAmount
    }
    const contrib = { 
      id: generateContributionId(input.memberId, now), // ID personnalisé au format MK_CS_P_memberId_DATE_HEURE
      amount: input.amount, 
      paidAt: now, 
      proofUrl: proofUrl || undefined,
      time: input.time,
      mode: input.mode,
      memberId: input.memberId, // Ajouter l'ID du membre du groupe
      penalty: penalty || 0, // Montant de la pénalité pour cette contribution
      penaltyDays: delayDays > 0 ? delayDays : 0, // Jours de retard pour cette contribution
      createdAt: new Date()
    }
    console.log('💾 [pay] Contribution créée:', {
      id: contrib.id,
      proofUrl: contrib.proofUrl,
      amount: contrib.amount,
      hasProof: !!contrib.proofUrl
    })
    const existing = Array.isArray(payment.contribs) ? payment.contribs : []
    paymentUpdates.contribs = [...existing, contrib]
    console.log('📦 [pay] Total contribs après ajout:', paymentUpdates.contribs.length)
  }
  // Statut payé si objectif atteint
  const reached = newAccumulated >= targetForMonth || type === 'STANDARD'
  if (reached) {
    paymentUpdates.status = 'PAID'
    paymentUpdates.paidAt = now
    // Stocker le bonus appliqué dans le paiement
    paymentUpdates.bonusApplied = bonus || 0
  }
  await updatePayment(input.contractId, payment.id, paymentUpdates)
  console.log('✅ [pay] Payment mis à jour dans Firestore:', {
    contractId: input.contractId,
    paymentId: payment.id,
    contribsCount: paymentUpdates.contribs?.length || 0,
    status: paymentUpdates.status
  })

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
  
  // Recalculer le statut du contrat après le paiement
  const { recomputeNow } = await import('@/services/caisse/readers')
  await recomputeNow(input.contractId)
  
  return { status, penalty, bonus, nextDueAt }
}

export async function requestFinalRefund(contractId: string, reason?: string) {
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
  await addRefund(contractId, { type: 'FINAL', amountNominal, amountBonus, deadlineAt, status: 'PENDING', reason: reason || '' })
  return true
}

export async function requestEarlyRefund(contractId: string, input?: {
  reason?: string
  withdrawalTime?: string
  withdrawalDate?: string
}) {
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

  // Ajouter les informations de retrait anticipé
  const withdrawalDate = input?.withdrawalDate ? new Date(input.withdrawalDate) : new Date()
  const withdrawalTime = input?.withdrawalTime || `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`

  await addRefund(contractId, { 
    type: 'EARLY', 
    amountNominal, 
    amountBonus, 
    deadlineAt, 
    status: 'PENDING',
    reason: input?.reason || '',
    withdrawalDate,
    withdrawalTime
  })
  return true
}

export async function approveRefund(contractId: string, refundId: string) {
  await updateRefund(contractId, refundId, { status: 'APPROVED' })
  return true
}

export async function markRefundPaid(contractId: string, refundId: string, proof?: File, refundDetails?: {
  reason?: string
  withdrawalDate?: string
  withdrawalTime?: string
}) {
  let proofUrl: string | undefined
  if (proof) {
    const uploaded = await createFile(proof, contractId, `caisse/${contractId}/refunds/${refundId}`)
    proofUrl = uploaded.url
  }
  
  // Construire les mises à jour
  const updates: any = { 
    status: 'PAID', 
    processedAt: new Date() 
  }
  
  // Ajouter la preuve si fournie
  if (proofUrl) {
    updates.proofUrl = proofUrl
  }
  
  // Ajouter les détails du retrait si fournis
  if (refundDetails?.reason !== undefined) {
    updates.reason = refundDetails.reason
  }
  if (refundDetails?.withdrawalDate !== undefined) {
    const normalizedDate = normalizeDateToISOString(refundDetails.withdrawalDate)
    if (normalizedDate) {
      updates.withdrawalDate = new Date(normalizedDate)
    }
  }
  if (refundDetails?.withdrawalTime !== undefined) {
    updates.withdrawalTime = refundDetails.withdrawalTime
  }
  
  await updateRefund(contractId, refundId, updates)
  
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
    mode?: PaymentMode
    proofFile?: File
    memberId?: string
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
    // Générer un nom de fichier unique avec timestamp
    const uniqueFileName = `${Date.now()}_proof.webp`
    const webpFile = new File([blob], uniqueFileName, { type: 'image/webp' })
    const uploaded = await createFile(webpFile as any, contractId, location)
    newProofUrl = uploaded.url
    console.log('📸 Image modifiée uploadée:', uniqueFileName, '→', newProofUrl)
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
    memberId: updates.memberId || contribution.memberId, // Ajouter l'ID du membre du groupe
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

/**
 * Fonction spécialisée pour les versements de groupe
 * Permet d'ajouter des contributions à un versement collectif par jour
 */
export async function payGroup(input: { 
  contractId: string; 
  dueMonthIndex: number; 
  memberId: string; 
  memberName: string;
  memberMatricule: string;
  memberPhotoURL?: string;
  memberContacts?: string[];
  amount: number; 
  file?: File; 
  paidAt?: Date; 
  time: string; 
  mode: PaymentMode 
}) {
  const contract = await getContract(input.contractId)
  if (!contract) throw new Error('Contrat introuvable')
  
  // Vérifier que c'est bien un contrat de groupe
  const isGroupContract = contract.contractType === 'GROUP' || (contract as any).groupeId
  if (!isGroupContract) {
    throw new Error('Cette fonction est réservée aux contrats de groupe')
  }
  
  const payments = await listPayments(input.contractId)
  const payment = payments.find((p: any) => p.dueMonthIndex === input.dueMonthIndex)
  if (!payment) throw new Error('Échéance introuvable')

  const now = input.paidAt ? new Date(input.paidAt) : new Date()
  const actualToday = new Date() // Date actuelle réelle
  actualToday.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  
  const dueAt = payment.dueAt ? (typeof (payment.dueAt as any)?.toDate === 'function' ? (payment.dueAt as any).toDate() : new Date(payment.dueAt)) : now
  
  // Ne calculer les pénalités que si le versement n'est pas pour une date future
  let window: 'LATE_NO_PENALTY' | 'LATE_WITH_PENALTY' | 'DEFAULTED_AFTER_J12' = 'LATE_NO_PENALTY'
  let delayDays = 0
  
  if (now <= actualToday) {
    // Le versement est pour aujourd'hui ou dans le passé : calculer les pénalités normalement
    const result = computeDueWindow(dueAt, now)
    window = result.window
    delayDays = result.delayDays
  }
  // Sinon (versement futur), pas de pénalités : window reste 'LATE_NO_PENALTY' et delayDays reste 0

  if (delayDays > 12) {
    // Refus et résiliation
    await updatePayment(input.contractId, payment.id, { status: 'REFUSED' })
    await updateContract(input.contractId, { status: 'RESCINDED' })
    return { status: 'RESCINDED' }
  }

  // Calculer les pénalités pour cette contribution
  const settings = await getActiveSettings((contract as any).caisseType)
  let penalty = 0
  if (window === 'LATE_WITH_PENALTY') {
    penalty = computePenalty(contract.monthlyAmount, delayDays, settings as any)
  }

  let proofUrl: string | undefined
  if (input.file) {
    console.log('🔍 [payGroup] Début upload image:', {
      fileName: input.file.name,
      fileSize: input.file.size,
      fileType: input.file.type,
      memberId: input.memberId
    })
    
    const location = `caisse/${input.contractId}/payments/${payment.id}/contributions`
    console.log('📁 [payGroup] Location:', location)
    
    const dataUrl = await compressImage(input.file, IMAGE_COMPRESSION_PRESETS.document)
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    // Générer un nom de fichier unique avec timestamp
    const uniqueFileName = `${Date.now()}_proof.webp`
    console.log('📝 [payGroup] Nom de fichier généré:', uniqueFileName)
    
    const webpFile = new File([blob], uniqueFileName, { type: 'image/webp' })
    const uploaded = await createFile(webpFile as any, input.memberId, location)
    proofUrl = uploaded.url
    console.log('✅ [payGroup] Image uploadée avec succès:', {
      fileName: uniqueFileName,
      url: proofUrl,
      paymentId: payment.id
    })
  }

  // Créer la nouvelle contribution
  const newContribution: GroupPaymentContribution = {
    id: generateContributionId(input.memberId, now), // ID personnalisé au format MK_CS_P_memberId_DATE_HEURE
    memberId: input.memberId,
    memberName: input.memberName,
    memberMatricule: input.memberMatricule,
    memberFirstName: input.memberName.split(' ')[0] || '',
    memberLastName: input.memberName.split(' ').slice(1).join(' ') || '',
    memberPhotoURL: input.memberPhotoURL,
    memberContacts: input.memberContacts,
    amount: input.amount,
    time: input.time,
    mode: input.mode,
    proofUrl,
    penalty: penalty || 0, // Montant de la pénalité pour cette contribution
    penaltyDays: delayDays > 0 ? delayDays : 0, // Jours de retard pour cette contribution
    createdAt: now,
    updatedAt: now
  }
  
  console.log('💾 [payGroup] Contribution créée:', {
    id: newContribution.id,
    proofUrl: newContribution.proofUrl,
    amount: newContribution.amount,
    memberName: newContribution.memberName,
    hasProof: !!newContribution.proofUrl
  })

  // Récupérer les contributions existantes ou créer un nouveau tableau
  const existingContributions = payment.groupContributions || []
  const updatedContributions = [...existingContributions, newContribution]
  
  // Calculer le nouveau montant total
  const newTotalAmount = updatedContributions.reduce((sum, c) => sum + c.amount, 0)
  
  // Mettre à jour le paiement
  const paymentUpdates: any = {
    isGroupPayment: true,
    groupContributions: updatedContributions,
    accumulatedAmount: newTotalAmount,
    penaltyApplied: (payment.penaltyApplied || 0) + penalty, // Cumuler les pénalités
    penaltyDays: delayDays > 0 ? delayDays : (payment.penaltyDays || 0), // Garder le plus récent
    updatedAt: new Date(),
    updatedBy: (auth?.currentUser?.uid) || input.memberId,
    // Enregistrer les informations de paiement (du dernier contributeur)
    time: input.time,
    mode: input.mode,
  }

  // Vérifier si l'objectif du mois est atteint
  const type = (contract as any).caisseType || 'STANDARD'
  const targetForMonth = type === 'LIBRE' ? Math.max(100000, payment.targetAmount || 0) : contract.monthlyAmount
  
  if (newTotalAmount >= targetForMonth) {
    paymentUpdates.status = 'PAID'
    paymentUpdates.paidAt = now
  }

  await updatePayment(input.contractId, payment.id, paymentUpdates)
  console.log('✅ [payGroup] Payment mis à jour dans Firestore:', {
    contractId: input.contractId,
    paymentId: payment.id,
    groupContributionsCount: paymentUpdates.groupContributions?.length || 0,
    status: paymentUpdates.status
  })

  // Mettre à jour le contrat
  const isFirstPayment = !contract.contractStartAt
  const contractStartAt = isFirstPayment ? now : contract.contractStartAt
  
  if (isFirstPayment) {
    for (let i = 0; i < payments.length; i++) {
      const due = new Date(now)
      due.setMonth(due.getMonth() + i)
      await updatePayment(input.contractId, payments[i].id, { dueAt: due })
    }
  }

  // Calculer les totaux du contrat
  const allPayments = await listPayments(input.contractId)
  const totalNominalPaid = allPayments.reduce((sum: number, p: any) => {
    if (p.status === 'PAID') {
      return sum + (p.accumulatedAmount || 0)
    }
    return sum
  }, 0)

  await updateContract(input.contractId, {
    nominalPaid: totalNominalPaid,
    contractStartAt,
    updatedAt: new Date(),
    updatedBy: input.memberId
  })

  // Recalculer le statut du contrat après le paiement
  const { recomputeNow } = await import('@/services/caisse/readers')
  await recomputeNow(input.contractId)

  return { 
    status: paymentUpdates.status || 'IN_PROGRESS', 
    contributionId: newContribution.id,
    totalAmount: newTotalAmount
  }
}

