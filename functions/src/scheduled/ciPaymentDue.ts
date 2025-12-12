import * as admin from 'firebase-admin'

// Initialiser Firebase Admin si pas déjà fait
if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

/**
 * Vérifie et notifie les échéances de versement pour la caisse imprévue
 */
export async function checkAndNotifyCIPaymentDue(): Promise<void> {
  console.log('Démarrage de la vérification des échéances de versement de caisse imprévue')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const threeDaysFromNow = new Date(today)
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

  try {
    // Récupérer tous les contrats actifs
    const contractsRef = db.collection('contractsCI')
    const activeContractsSnapshot = await contractsRef
      .where('status', '==', 'ACTIVE')
      .get()

    console.log(`Nombre de contrats actifs : ${activeContractsSnapshot.size}`)

    let notifiedCount = 0
    let errorCount = 0

    for (const contractDoc of activeContractsSnapshot.docs) {
      try {
        const contract = contractDoc.data()
        const contractId = contractDoc.id

        // Calculer la prochaine échéance selon la fréquence de paiement
        const lastPayment = await getLastPayment(contractId)
        let nextDueDate: Date | null = null

        if (contract.paymentFrequency === 'DAILY') {
          // Pour les paiements quotidiens, la prochaine échéance est demain
          nextDueDate = new Date(today)
          nextDueDate.setDate(nextDueDate.getDate() + 1)
        } else if (contract.paymentFrequency === 'MONTHLY') {
          // Pour les paiements mensuels, calculer la prochaine échéance
          if (lastPayment && lastPayment.versements && lastPayment.versements.length > 0) {
            const lastVersement = lastPayment.versements[lastPayment.versements.length - 1]
            const lastDate = lastVersement.date?.toDate ? lastVersement.date.toDate() : new Date(lastVersement.date)
            nextDueDate = new Date(lastDate)
            nextDueDate.setMonth(nextDueDate.getMonth() + 1)
          } else {
            // Si aucun paiement, utiliser la date de création du contrat
            const contractDate = contract.createdAt?.toDate ? contract.createdAt.toDate() : new Date(contract.createdAt)
            nextDueDate = new Date(contractDate)
            nextDueDate.setMonth(nextDueDate.getMonth() + 1)
          }
        }

        if (!nextDueDate) continue

        nextDueDate.setHours(0, 0, 0, 0)

        // Vérifier si l'échéance est dans 3 jours ou aujourd'hui
        if (nextDueDate >= today && nextDueDate <= threeDaysFromNow) {
          const daysUntil = Math.floor((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

          // Vérifier qu'une notification n'existe pas déjà pour cette échéance
          const notificationsRef = db.collection('notifications')
          const todayStr = today.toISOString().split('T')[0]
          const existingNotificationsSnapshot = await notificationsRef
            .where('module', '==', 'caisse_imprevue')
            .where('type', '==', 'reminder')
            .where('metadata.contractId', '==', contractId)
            .where('metadata.notificationDate', '==', todayStr)
            .where('metadata.daysUntil', '==', daysUntil)
            .get()

          if (existingNotificationsSnapshot.empty) {
            const frequencyLabel = contract.paymentFrequency === 'DAILY' ? 'journalier' : 'mensuel'
            const amount = contract.subscriptionCIAmountPerMonth || 0
            const amountFormatted = typeof amount === 'number' ? amount.toLocaleString('fr-FR') : String(amount)
            const message = daysUntil === 0
              ? `Échéance de versement aujourd'hui pour le contrat ${frequencyLabel} de ${contract.memberFirstName} ${contract.memberLastName}. Montant : ${amountFormatted} FCFA.`
              : `Échéance de versement dans ${daysUntil} jour(s) pour le contrat ${frequencyLabel} de ${contract.memberFirstName} ${contract.memberLastName}. Montant : ${amountFormatted} FCFA.`

            await notificationsRef.add({
              module: 'caisse_imprevue',
              entityId: contractId,
              type: 'reminder',
              title: daysUntil === 0 ? 'Échéance de versement aujourd\'hui' : `Échéance de versement dans ${daysUntil} jour(s)`,
              message,
              isRead: false,
              metadata: {
                contractId,
                memberId: contract.memberId,
                paymentFrequency: contract.paymentFrequency,
                amount: amount,
                dueDate: nextDueDate.toISOString(),
                daysUntil,
                notificationDate: todayStr,
              },
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            })

            notifiedCount++
            console.log(`Notification créée pour échéance de versement : ${contractId} (J${daysUntil >= 0 ? '-' : '+'}${Math.abs(daysUntil)})`)
          }
        }
      } catch (error) {
        errorCount++
        console.error(`Erreur lors du traitement du contrat ${contractDoc.id}:`, error)
      }
    }

    console.log(`Vérification terminée : ${notifiedCount} notifications créées, ${errorCount} erreurs`)
  } catch (error) {
    console.error('Erreur lors de la vérification des échéances de versement:', error)
    throw error
  }
}

/**
 * Récupère le dernier paiement d'un contrat
 */
async function getLastPayment(contractId: string): Promise<any | null> {
  try {
    const paymentsRef = db.collection('contractsCI').doc(contractId).collection('payments')
    const paymentsSnapshot = await paymentsRef
      .where('status', '==', 'PAID')
      .orderBy('monthIndex', 'desc')
      .limit(1)
      .get()

    if (paymentsSnapshot.empty) {
      return null
    }

    return paymentsSnapshot.docs[0].data()
  } catch (error) {
    console.error(`Erreur lors de la récupération du dernier paiement pour ${contractId}:`, error)
    return null
  }
}

