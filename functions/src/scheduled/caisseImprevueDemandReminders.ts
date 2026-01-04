import * as admin from 'firebase-admin'

const db = admin.firestore()

/**
 * Rappelle aux admins les demandes Caisse Imprévue en attente
 */
export async function remindPendingCaisseImprevueDemands(): Promise<void> {
  console.log('[CI Demand Reminders] Début du job')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    // Récupérer toutes les demandes en attente
    const demandsSnapshot = await db
      .collection('caisseImprevueDemands')
      .where('status', '==', 'PENDING')
      .get()

    console.log(`[CI Demand Reminders] ${demandsSnapshot.size} demandes en attente trouvées`)

    let notificationsCreated = 0

    for (const demandDoc of demandsSnapshot.docs) {
      const demand = demandDoc.data()
      const createdAt = demand.createdAt?.toDate ? demand.createdAt.toDate() : new Date(demand.createdAt)
      const daysPending = Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

      // Créer une notification si la demande est en attente depuis 3, 7 ou 14 jours
      if (daysPending === 3 || daysPending === 7 || daysPending === 14) {
        const reminderLevel = daysPending === 3 ? 'normal' : daysPending === 7 ? 'warning' : 'urgent'
        
        // Récupérer le nom du membre
        let memberName = 'Membre inconnu'
        if (demand.memberId) {
          try {
            const memberDoc = await db.collection('members').doc(demand.memberId).get()
            if (memberDoc.exists) {
              const member = memberDoc.data()
              memberName = `${member?.firstName || ''} ${member?.lastName || ''}`.trim() || 'Membre inconnu'
            }
          } catch (error) {
            console.error(`[CI Demand Reminders] Erreur lors de la récupération du membre ${demand.memberId}:`, error)
          }
        }

        // Vérifier si une notification existe déjà pour ce rappel
        const todayStr = today.toISOString().split('T')[0]
        const existingNotifications = await db
          .collection('notifications')
          .where('module', '==', 'caisse_imprevue')
          .where('entityId', '==', demandDoc.id)
          .where('type', '==', 'caisse_imprevue_demand_pending_reminder')
          .where('metadata.daysPending', '==', daysPending)
          .where('metadata.notificationDate', '==', todayStr)
          .get()

        if (existingNotifications.empty) {
          // Créer la notification pour tous les admins
          await db.collection('notifications').add({
            module: 'caisse_imprevue',
            entityId: demandDoc.id,
            type: 'caisse_imprevue_demand_pending_reminder',
            title: `Demande en attente depuis ${daysPending} jour(s)`,
            message: `La demande ${demandDoc.id.slice(-6)} de ${memberName} est en attente depuis ${daysPending} jour(s).`,
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            metadata: {
              demandId: demandDoc.id,
              daysPending,
              createdAt: createdAt.toISOString(),
              memberId: demand.memberId,
              reminderLevel,
              notificationDate: todayStr,
            },
          })

          notificationsCreated++
          console.log(`[CI Demand Reminders] Notification créée pour la demande ${demandDoc.id} (${daysPending} jours)`)
        }
      }
    }

    console.log(`[CI Demand Reminders] ${notificationsCreated} notifications créées`)
  } catch (error) {
    console.error('[CI Demand Reminders] Erreur:', error)
    throw error
  }
}

/**
 * Rappelle aux admins les demandes Caisse Imprévue acceptées non converties
 */
export async function remindApprovedNotConvertedCaisseImprevueDemands(): Promise<void> {
  console.log('[CI Approved Not Converted Reminders] Début du job')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    // Récupérer toutes les demandes acceptées sans contrat
    const demandsSnapshot = await db
      .collection('caisseImprevueDemands')
      .where('status', '==', 'APPROVED')
      .get()

    console.log(`[CI Approved Not Converted Reminders] ${demandsSnapshot.size} demandes acceptées trouvées`)

    let notificationsCreated = 0

    for (const demandDoc of demandsSnapshot.docs) {
      const demand = demandDoc.data()
      
      // Ignorer les demandes déjà converties
      if (demand.contractId) continue

      const decisionMadeAt = demand.decisionMadeAt?.toDate ? demand.decisionMadeAt.toDate() : new Date(demand.decisionMadeAt)
      const daysSinceApproval = Math.floor((today.getTime() - decisionMadeAt.getTime()) / (1000 * 60 * 60 * 24))

      // Créer une notification si la demande est acceptée depuis 7 ou 14 jours sans être convertie
      if (daysSinceApproval === 7 || daysSinceApproval === 14) {
        const reminderLevel = daysSinceApproval === 7 ? 'warning' : 'urgent'
        
        // Récupérer le nom du membre
        let memberName = 'Membre inconnu'
        if (demand.memberId) {
          try {
            const memberDoc = await db.collection('members').doc(demand.memberId).get()
            if (memberDoc.exists) {
              const member = memberDoc.data()
              memberName = `${member?.firstName || ''} ${member?.lastName || ''}`.trim() || 'Membre inconnu'
            }
          } catch (error) {
            console.error(`[CI Approved Not Converted Reminders] Erreur lors de la récupération du membre ${demand.memberId}:`, error)
          }
        }

        // Vérifier si une notification existe déjà pour ce rappel
        const todayStr = today.toISOString().split('T')[0]
        const existingNotifications = await db
          .collection('notifications')
          .where('module', '==', 'caisse_imprevue')
          .where('entityId', '==', demandDoc.id)
          .where('type', '==', 'caisse_imprevue_demand_approved_not_converted')
          .where('metadata.daysSinceApproval', '==', daysSinceApproval)
          .where('metadata.notificationDate', '==', todayStr)
          .get()

        if (existingNotifications.empty) {
          // Créer la notification pour tous les admins
          await db.collection('notifications').add({
            module: 'caisse_imprevue',
            entityId: demandDoc.id,
            type: 'caisse_imprevue_demand_approved_not_converted',
            title: `Demande acceptée non convertie depuis ${daysSinceApproval} jour(s)`,
            message: `La demande ${demandDoc.id.slice(-6)} de ${memberName} a été acceptée il y a ${daysSinceApproval} jour(s) mais n'a pas encore été convertie en contrat.`,
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            metadata: {
              demandId: demandDoc.id,
              daysSinceApproval,
              approvedAt: decisionMadeAt.toISOString(),
              memberId: demand.memberId,
              reminderLevel,
              notificationDate: todayStr,
            },
          })

          notificationsCreated++
          console.log(`[CI Approved Not Converted Reminders] Notification créée pour la demande ${demandDoc.id} (${daysSinceApproval} jours)`)
        }
      }
    }

    console.log(`[CI Approved Not Converted Reminders] ${notificationsCreated} notifications créées`)
  } catch (error) {
    console.error('[CI Approved Not Converted Reminders] Erreur:', error)
    throw error
  }
}
