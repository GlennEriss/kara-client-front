import * as admin from 'firebase-admin'

// Initialiser Firebase Admin si pas déjà fait
if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

const MODULE = 'agentsRecouvrement'

/**
 * Récupère tous les agents actifs avec dateNaissance valide
 */
async function getActiveAgentsWithBirthDate(): Promise<
  Array<{ id: string; nom: string; prenom: string; dateNaissance: Date }>
> {
  const snapshot = await db
    .collection('agentsRecouvrement')
    .where('actif', '==', true)
    .where('dateNaissance', '!=', null)
    .get()

  const agents: Array<{ id: string; nom: string; prenom: string; dateNaissance: Date }> = []

  snapshot.forEach((doc) => {
    const data = doc.data()
    if (data.dateNaissance) {
      const dateNaissance =
        data.dateNaissance.toDate != null
          ? data.dateNaissance.toDate()
          : new Date(data.dateNaissance)
      agents.push({
        id: doc.id,
        nom: data.nom || '',
        prenom: data.prenom || '',
        dateNaissance,
      })
    }
  })

  return agents
}

/**
 * Récupère tous les agents actifs avec pieceIdentite.dateExpiration valide
 */
async function getActiveAgentsWithIdCardExpiration(): Promise<
  Array<{
    id: string
    nom: string
    prenom: string
    dateExpiration: Date
  }>
> {
  const snapshot = await db
    .collection('agentsRecouvrement')
    .where('actif', '==', true)
    .get()

  const agents: Array<{
    id: string
    nom: string
    prenom: string
    dateExpiration: Date
  }> = []

  snapshot.forEach((doc) => {
    const data = doc.data()
    const pieceIdentite = data.pieceIdentite
    if (pieceIdentite?.dateExpiration) {
      const dateExpiration =
        pieceIdentite.dateExpiration.toDate != null
          ? pieceIdentite.dateExpiration.toDate()
          : new Date(pieceIdentite.dateExpiration)
      agents.push({
        id: doc.id,
        nom: data.nom || '',
        prenom: data.prenom || '',
        dateExpiration,
      })
    }
  })

  return agents
}

/**
 * Calcule le nombre de jours jusqu'au prochain anniversaire
 */
function calculateDaysUntilBirthday(birthDate: Date, today: Date): number {
  const currentYear = today.getFullYear()
  const birthMonth = birthDate.getMonth()
  const birthDay = birthDate.getDate()

  let nextBirthday = new Date(currentYear, birthMonth, birthDay)
  if (nextBirthday < today) {
    nextBirthday = new Date(currentYear + 1, birthMonth, birthDay)
  }

  const diffTime = nextBirthday.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Vérifie si une notification J a été créée hier pour un agent
 */
async function wasBirthdayNotifiedYesterday(
  agentId: string,
  yesterday: Date
): Promise<boolean> {
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const snapshot = await db
    .collection('notifications')
    .where('module', '==', MODULE)
    .where('type', '==', 'birthday_reminder')
    .where('metadata.agentId', '==', agentId)
    .where('metadata.daysUntil', '==', 0)
    .get()

  return snapshot.docs.some((doc) => {
    const data = doc.data()
    const createdAt =
      data.createdAt?.toDate != null ? data.createdAt.toDate() : new Date(data.createdAt)
    return createdAt.toISOString().split('T')[0] === yesterdayStr
  })
}

/**
 * Vérifie si une notification existe déjà (éviter doublons)
 */
async function notificationExists(
  type: string,
  agentId: string,
  daysUntil: number,
  todayStr: string
): Promise<boolean> {
  const snapshot = await db
    .collection('notifications')
    .where('module', '==', MODULE)
    .where('type', '==', type)
    .where('metadata.agentId', '==', agentId)
    .where('metadata.notificationDate', '==', todayStr)
    .where('metadata.daysUntil', '==', daysUntil)
    .get()

  return !snapshot.empty
}

/**
 * Crée une notification d'anniversaire agent
 */
async function createBirthdayNotification(
  agentId: string,
  nom: string,
  prenom: string,
  birthDate: Date,
  daysUntil: number
): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  const currentYear = today.getFullYear()
  const birthYear = birthDate.getFullYear()
  const age = currentYear - birthYear - (daysUntil > 0 ? 1 : 0)

  let message: string
  if (daysUntil === 2) {
    message = `L'anniversaire de l'agent ${nom} ${prenom} est dans 2 jours. Il/Elle aura ${age} ans.`
  } else if (daysUntil === 0) {
    message = `Aujourd'hui est l'anniversaire de l'agent ${nom} ${prenom}. Il/Elle fête ses ${age} ans aujourd'hui ! 🎉`
  } else {
    message = `L'anniversaire de l'agent ${nom} ${prenom} était hier. Il/Elle a fêté ses ${age} ans.`
  }

  if (await notificationExists('birthday_reminder', agentId, daysUntil, todayStr)) {
    console.log(
      `Notification anniversaire déjà créée pour agent ${agentId} (J${daysUntil >= 0 ? '-' : '+'}${Math.abs(daysUntil)})`
    )
    return
  }

  await db.collection('notifications').add({
    module: MODULE,
    entityId: agentId,
    type: 'birthday_reminder',
    title: `Anniversaire de l'agent ${nom} ${prenom}`,
    message,
    isRead: false,
    metadata: {
      agentId,
      nom,
      prenom,
      birthDate: birthDate.toISOString(),
      daysUntil,
      age,
      notificationDate: todayStr,
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })
}

/**
 * Crée une notification pièce d'identité expirée/expirant
 */
async function createIdCardExpiringNotification(
  agentId: string,
  nom: string,
  prenom: string,
  dateExpiration: Date,
  daysUntil: number
): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  const expirationStr = dateExpiration.toLocaleDateString('fr-FR')

  let title: string
  let message: string

  if (daysUntil === 30) {
    title = 'Pièce d\'identité expire dans 30 jours'
    message = `La pièce d'identité de l'agent ${nom} ${prenom} expire dans 30 jours (${expirationStr}).`
  } else if (daysUntil === 7) {
    title = 'Pièce d\'identité expire dans 7 jours'
    message = `La pièce d'identité de l'agent ${nom} ${prenom} expire dans 7 jours (${expirationStr}).`
  } else if (daysUntil === 0) {
    title = 'Pièce d\'identité expire aujourd\'hui'
    message = `La pièce d'identité de l'agent ${nom} ${prenom} expire aujourd'hui (${expirationStr}). Veuillez demander le renouvellement.`
  } else {
    title = 'Pièce d\'identité expirée'
    message = `La pièce d'identité de l'agent ${nom} ${prenom} a expiré hier (${expirationStr}). Veuillez demander le renouvellement.`
  }

  if (await notificationExists('id_card_expiring', agentId, daysUntil, todayStr)) {
    console.log(
      `Notification pièce déjà créée pour agent ${agentId} (J${daysUntil >= 0 ? '-' : '+'}${Math.abs(daysUntil)})`
    )
    return
  }

  await db.collection('notifications').add({
    module: MODULE,
    entityId: agentId,
    type: 'id_card_expiring',
    title,
    message,
    isRead: false,
    metadata: {
      agentId,
      nom,
      prenom,
      dateExpiration: dateExpiration.toISOString(),
      daysUntil,
      notificationDate: todayStr,
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })
}

/**
 * Job principal : génère les notifications anniversaires et pièce d'identité pour les agents
 */
export async function generateAgentRecouvrementNotifications(): Promise<void> {
  console.log('Démarrage des notifications agents de recouvrement (anniversaire + pièce)')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  let birthdayCount = 0
  let idCardCount = 0
  let errorCount = 0

  // === ANNIVERSAIRES ===
  const agentsBirthday = await getActiveAgentsWithBirthDate()
  console.log(`Agents avec date de naissance : ${agentsBirthday.length}`)

  for (const agent of agentsBirthday) {
    try {
      const daysUntil = calculateDaysUntilBirthday(agent.dateNaissance, today)

      if (daysUntil === 2) {
        await createBirthdayNotification(
          agent.id,
          agent.nom,
          agent.prenom,
          agent.dateNaissance,
          2
        )
        birthdayCount++
      } else if (daysUntil === 0) {
        await createBirthdayNotification(
          agent.id,
          agent.nom,
          agent.prenom,
          agent.dateNaissance,
          0
        )
        birthdayCount++
      } else if (daysUntil === -1) {
        const wasNotified = await wasBirthdayNotifiedYesterday(agent.id, yesterday)
        if (!wasNotified) {
          await createBirthdayNotification(
            agent.id,
            agent.nom,
            agent.prenom,
            agent.dateNaissance,
            -1
          )
          birthdayCount++
        }
      }
    } catch (error) {
      errorCount++
      console.error(`Erreur notification anniversaire agent ${agent.id}:`, error)
    }
  }

  // === PIÈCE D'IDENTITÉ ===
  const agentsIdCard = await getActiveAgentsWithIdCardExpiration()
  console.log(`Agents avec pièce d'identité : ${agentsIdCard.length}`)

  for (const agent of agentsIdCard) {
    try {
      const dateExpiration = new Date(agent.dateExpiration)
      dateExpiration.setHours(0, 0, 0, 0)
      const daysUntil = Math.floor(
        (dateExpiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysUntil === 30 || daysUntil === 7 || daysUntil === 0 || daysUntil === -1) {
        await createIdCardExpiringNotification(
          agent.id,
          agent.nom,
          agent.prenom,
          dateExpiration,
          daysUntil
        )
        idCardCount++
      }
    } catch (error) {
      errorCount++
      console.error(`Erreur notification pièce agent ${agent.id}:`, error)
    }
  }

  console.log(
    `Job terminé : ${birthdayCount} anniversaires, ${idCardCount} pièces, ${errorCount} erreurs`
  )
}
