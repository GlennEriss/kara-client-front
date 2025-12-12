import * as admin from 'firebase-admin'

// Initialiser Firebase Admin si pas déjà fait
if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

/**
 * Récupère tous les membres actifs avec birthDate valide
 */
async function getAllActiveMembersWithBirthDate(): Promise<Array<{
  id: string
  firstName: string
  lastName: string
  birthDate: Date
}>> {
  const usersRef = db.collection('users')
  const snapshot = await usersRef
    .where('isActive', '==', true)
    .where('birthDate', '!=', null)
    .get()

  const members: Array<{
    id: string
    firstName: string
    lastName: string
    birthDate: Date
  }> = []

  snapshot.forEach((doc) => {
    const data = doc.data()
    if (data.birthDate) {
      const birthDate = data.birthDate.toDate ? data.birthDate.toDate() : new Date(data.birthDate)
      members.push({
        id: doc.id,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        birthDate,
      })
    }
  })

  return members
}

/**
 * Calcule le nombre de jours jusqu'au prochain anniversaire
 */
function calculateDaysUntilBirthday(birthDate: Date, today: Date): number {
  const currentYear = today.getFullYear()
  const birthMonth = birthDate.getMonth()
  const birthDay = birthDate.getDate()

  // Calculer le prochain anniversaire
  let nextBirthday = new Date(currentYear, birthMonth, birthDay)
  if (nextBirthday < today) {
    nextBirthday = new Date(currentYear + 1, birthMonth, birthDay)
  }

  // Calculer daysUntil
  const diffTime = nextBirthday.getTime() - today.getTime()
  const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return daysUntil
}

/**
 * Vérifie si une notification J a été créée hier pour un membre
 */
async function wasNotifiedYesterday(
  memberId: string,
  yesterday: Date
): Promise<boolean> {
  const notificationsRef = db.collection('notifications')
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  
  const snapshot = await notificationsRef
    .where('module', '==', 'memberships')
    .where('type', '==', 'birthday_reminder')
    .where('metadata.memberId', '==', memberId)
    .where('metadata.daysUntil', '==', 0)
    .get()

  return snapshot.docs.some((doc) => {
    const data = doc.data()
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
    return createdAt.toISOString().split('T')[0] === yesterdayStr
  })
}

/**
 * Crée une notification d'anniversaire dans Firestore
 */
async function createBirthdayNotification(
  memberId: string,
  memberFirstName: string,
  memberLastName: string,
  birthDate: Date,
  daysUntil: number
): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Calculer l'âge
  const currentYear = today.getFullYear()
  const birthYear = birthDate.getFullYear()
  const age = currentYear - birthYear - (daysUntil > 0 ? 1 : 0)

  // Déterminer le message selon daysUntil
  let message: string
  if (daysUntil === 2) {
    message = `L'anniversaire de ${memberFirstName} ${memberLastName} est dans 2 jours. Il/Elle aura ${age} ans.`
  } else if (daysUntil === 0) {
    message = `Aujourd'hui est l'anniversaire de ${memberFirstName} ${memberLastName}. Il/Elle fête ses ${age} ans aujourd'hui ! 🎉`
  } else {
    // daysUntil === -1
    message = `L'anniversaire de ${memberFirstName} ${memberLastName} était hier. Il/Elle a fêté ses ${age} ans.`
  }

  // Vérifier qu'une notification similaire n'existe pas déjà (éviter doublons)
  const todayStr = today.toISOString().split('T')[0]
  const notificationsRef = db.collection('notifications')
  const existingSnapshot = await notificationsRef
    .where('module', '==', 'memberships')
    .where('type', '==', 'birthday_reminder')
    .where('metadata.memberId', '==', memberId)
    .where('metadata.notificationDate', '==', todayStr)
    .where('metadata.daysUntil', '==', daysUntil)
    .get()

  if (!existingSnapshot.empty) {
    console.log(
      `Notification d'anniversaire déjà créée pour ${memberId} (J${daysUntil >= 0 ? '-' : '+'}${Math.abs(daysUntil)})`
    )
    return
  }

  // Créer la notification
  await notificationsRef.add({
    module: 'memberships',
    entityId: memberId,
    type: 'birthday_reminder',
    title: `Anniversaire de ${memberFirstName} ${memberLastName}`,
    message,
    isRead: false,
    metadata: {
      memberId,
      memberFirstName,
      memberLastName,
      birthDate: birthDate.toISOString(),
      daysUntil,
      age,
      notificationDate: todayStr,
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })
}

/**
 * Job principal : génère les notifications d'anniversaires
 */
export async function generateBirthdayNotifications(): Promise<void> {
  console.log('Démarrage de la génération des notifications d\'anniversaires')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // 1. Récupérer tous les membres actifs avec birthDate valide
  const members = await getAllActiveMembersWithBirthDate()
  console.log(`Nombre de membres avec date de naissance : ${members.length}`)

  let createdCount = 0
  let skippedCount = 0
  let errorCount = 0

  // 2. Pour chaque membre, calculer les jours jusqu'au prochain anniversaire
  for (const member of members) {
    try {
      const daysUntil = calculateDaysUntilBirthday(member.birthDate, today)

      // 3. Créer les notifications selon les règles
      if (daysUntil === 2) {
        // Notification J-2
        await createBirthdayNotification(
          member.id,
          member.firstName,
          member.lastName,
          member.birthDate,
          2
        )
        createdCount++
        console.log(`Notification J-2 créée pour ${member.firstName} ${member.lastName}`)
      } else if (daysUntil === 0) {
        // Notification J (aujourd'hui)
        await createBirthdayNotification(
          member.id,
          member.firstName,
          member.lastName,
          member.birthDate,
          0
        )
        createdCount++
        console.log(`Notification J créée pour ${member.firstName} ${member.lastName}`)
      } else if (daysUntil === -1) {
        // Notification J+1 (hier, pour rattrapage)
        // Vérifier d'abord qu'une notification J n'a pas déjà été créée hier
        const wasNotified = await wasNotifiedYesterday(member.id, yesterday)

        if (!wasNotified) {
          await createBirthdayNotification(
            member.id,
            member.firstName,
            member.lastName,
            member.birthDate,
            -1
          )
          createdCount++
          console.log(`Notification J+1 créée pour ${member.firstName} ${member.lastName}`)
        } else {
          skippedCount++
          console.log(
            `Notification J+1 ignorée pour ${member.firstName} ${member.lastName} (déjà notifié hier)`
          )
        }
      } else {
        skippedCount++
      }
    } catch (error) {
      errorCount++
      console.error(
        `Erreur lors de la création de notification pour ${member.firstName} ${member.lastName}:`,
        error
      )
    }
  }

  console.log(`Job terminé : ${createdCount} créées, ${skippedCount} ignorées, ${errorCount} erreurs`)
}

/**
 * Fonction de test (pour exécution manuelle)
 */
export async function testBirthdayNotifications(): Promise<void> {
  console.log('=== TEST : Génération des notifications d\'anniversaires ===')
  await generateBirthdayNotifications()
  console.log('=== TEST TERMINÉ ===')
}

