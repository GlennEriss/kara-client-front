import type { Firestore } from 'firebase-admin/firestore'
import { projectVehicleCalendar } from './calendar-model'
export async function getVehicleCalendar(
  db: Firestore,
  month: string,
  now = new Date(),
) {
  const [insurances, prospects] = await Promise.all([
    db.collection('vehicle-insurances').get(),
    db.collection('insurance-prospects').get(),
  ])
  const rows = (snap: typeof insurances) =>
    snap.docs.map((d) => ({ ...d.data(), id: d.id }))
  return {
    month,
    generatedAt: now.toISOString(),
    items: projectVehicleCalendar(
      rows(insurances),
      rows(prospects),
      month,
      now,
    ),
  }
}
