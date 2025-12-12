import * as admin from 'firebase-admin'

// Initialiser Firebase Admin si pas déjà fait
if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

/**
 * Vérifie et notifie les commissions en retard pour les placements
 */
export async function checkAndNotifyOverdueCommissions(): Promise<void> {
  console.log('Démarrage de la vérification des commissions en retard')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    // Récupérer tous les placements actifs
    const placementsRef = db.collection('placements')
    const activePlacementsSnapshot = await placementsRef
      .where('status', '==', 'Active')
      .get()

    console.log(`Nombre de placements actifs : ${activePlacementsSnapshot.size}`)

    let notifiedCount = 0
    let errorCount = 0

    for (const placementDoc of activePlacementsSnapshot.docs) {
      try {
        const placement = placementDoc.data()
        const placementId = placementDoc.id

        // Récupérer les commissions du placement
        const commissionsRef = db.collection('placements').doc(placementId).collection('commissions')
        const commissionsSnapshot = await commissionsRef
          .where('status', '==', 'Due')
          .get()

        for (const commissionDoc of commissionsSnapshot.docs) {
          const commission = commissionDoc.data()
          const dueDate = commission.dueDate?.toDate ? commission.dueDate.toDate() : new Date(commission.dueDate)

          // Vérifier si la commission est en retard
          if (dueDate < today) {
            // Vérifier qu'une notification n'existe pas déjà pour cette commission en retard
            const notificationsRef = db.collection('notifications')
            const existingNotificationsSnapshot = await notificationsRef
              .where('module', '==', 'placement')
              .where('type', '==', 'commission_overdue')
              .where('metadata.commissionId', '==', commissionDoc.id)
              .where('metadata.placementId', '==', placementId)
              .get()

            if (existingNotificationsSnapshot.empty) {
              // Récupérer les informations du membre
              const memberId = placement.benefactorId
              let memberName = placement.benefactorName || 'Membre inconnu'

              if (memberId) {
                try {
                  const memberDoc = await db.collection('users').doc(memberId).get()
                  if (memberDoc.exists) {
                    const memberData = memberDoc.data()
                    memberName = `${memberData?.firstName || ''} ${memberData?.lastName || ''}`.trim() || memberName
                  }
                } catch (error) {
                  console.warn(`Impossible de récupérer les infos du membre ${memberId}:`, error)
                }
              }

              // Créer la notification
              const amount = commission.amount || 0
              const amountFormatted = typeof amount === 'number' ? amount.toLocaleString('fr-FR') : String(amount)
              const dueDateFormatted = dueDate.toLocaleDateString('fr-FR')
              
              await notificationsRef.add({
                module: 'placement',
                entityId: placementId,
                type: 'commission_overdue',
                title: 'Commission en retard',
                message: `La commission de ${amountFormatted} FCFA pour le placement #${placementId.slice(0, 8)} de ${memberName} est en retard depuis le ${dueDateFormatted}.`,
                isRead: false,
                metadata: {
                  placementId,
                  commissionId: commissionDoc.id,
                  benefactorId: memberId,
                  dueDate: dueDate.toISOString(),
                  amount: amount,
                  daysLate: Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)),
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              })

              notifiedCount++
              console.log(`Notification créée pour commission en retard : ${commissionDoc.id}`)
            }
          }
        }
      } catch (error) {
        errorCount++
        console.error(`Erreur lors du traitement du placement ${placementDoc.id}:`, error)
      }
    }

    console.log(`Vérification terminée : ${notifiedCount} notifications créées, ${errorCount} erreurs`)
  } catch (error) {
    console.error('Erreur lors de la vérification des commissions en retard:', error)
    throw error
  }
}

