import * as admin from 'firebase-admin'

const UNKNOWN = '2548.MK.290126'
const day = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Libreville',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
export function prospectReminderStage(
  endDate: string,
  now = new Date(),
): number | null {
  const days = Math.round(
    (new Date(`${endDate}T12:00:00Z`).getTime() -
      new Date(`${day(now)}T12:00:00Z`).getTime()) /
      86400000,
  )
  return days <= 0
    ? 0
    : days <= 7
      ? 7
      : days <= 15
        ? 15
        : days <= 30
          ? 30
          : null
}
/** Identifiants déterministes : une alerte par échéance, palier et destinataire. */
export async function notifyInsuranceProspects(
  db = admin.firestore(),
  now = new Date(),
) {
  const today = day(now)
  const prospects = await db
    .collection('insurance-prospects')
    .where('status', 'in', ['tracking', 'contacted', 'quote_requested'])
    .get()
  let errors = 0
  for (const prospect of prospects.docs) {
    try {
      const row = prospect.data()
      if (typeof row.endDate !== 'string') continue
      const stage = prospectReminderStage(row.endDate, now)
      const followUp =
        row.followUpDate && row.followUpDate <= today
          ? String(row.followUpDate)
          : null
      if (stage === null && !followUp) continue
      const events = [
        ...(stage !== null ? [`expiry-${row.endDate}-${stage}`] : []),
        ...(followUp ? [`followup-${followUp}`] : []),
      ]
      for (const event of events) {
        const recipients = [
          'admin',
          ...(row.sponsorMemberId && row.sponsorMemberId !== UNKNOWN
            ? [row.sponsorMemberId]
            : []),
        ]
        for (const recipient of recipients) {
          const id = `prospect-${prospect.id}-${event}-${recipient}`
          const notification = db.collection('notifications').doc(id)
          await db.runTransaction(async (tx) => {
            if ((await tx.get(notification)).exists) return
            tx.set(notification, {
              module: 'vehicule',
              type: 'reminder',
              entityId: prospect.id,
              title: event.startsWith('followup')
                ? 'Prospection : relance prévue'
                : stage === 0
                  ? 'Prospection : échéance à traiter'
                  : `Prospection : rappel J−${stage}`,
              message: `${row.plateNumber} · ${row.ownerName} · ${row.insuranceCompany}. Fin de l’assurance : ${row.endDate}. Contactez le prospect et renseignez le résultat.`,
              ...(recipient !== 'admin' ? { recipientId: recipient } : {}),
              isRead: false,
              metadata: {
                prospectId: prospect.id,
                dataset: 'prospects',
                endDate: row.endDate,
                stage,
                notificationDate: today,
              },
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            })
          })
        }
      }
    } catch {
      errors++
    }
  }
  if (errors)
    throw Error(
      `${errors} prospect(s) non traité(s) : le prochain passage reprendra sans doublon.`,
    )
}
