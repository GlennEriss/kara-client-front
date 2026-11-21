import { daysToExpiry, gabonDay } from '@/domains/insurance-prospects/model'
export type VehicleCalendarSource = 'insurance' | 'prospects'
export interface VehicleCalendarItem {
  id: string
  recordId: string
  source: VehicleCalendarSource
  date: string
  ownerName: string
  plateNumber: string
  vehicleType: string
  insuranceCompany: string
  policyNumber: string
  city: string
  quarter: string
  quarterId: string
  locationDetails: string
  phone: string
  whatsapp: string
  sponsorName: string
  daysRemaining: number
  phase: 'expired' | 'today' | 'soon' | 'future'
  phaseLabel: string
  followUpStatus: string
}
type VehicleRecord = Record<string, any> & { id: string }
const text = (v: unknown) => (typeof v === 'string' ? v : '')
function civilDate(v: any) {
  if (v == null || v === '') return ''
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(v + 'T12:00:00Z')
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v
      ? v
      : ''
  }
  const d = v?.toDate?.() ?? (v instanceof Date ? v : new Date(v))
  return d instanceof Date && Number.isFinite(d.getTime()) ? gabonDay(d) : ''
}
export function projectVehicleCalendar(
  insurances: VehicleRecord[],
  prospects: VehicleRecord[],
  month: string,
  now = new Date(),
): VehicleCalendarItem[] {
  const convert = (
    r: VehicleRecord,
    source: VehicleCalendarSource,
  ): VehicleCalendarItem | null => {
    if (
      source === 'insurance' &&
      r.declarationStatus &&
      !['validated'].includes(r.declarationStatus)
    )
      return null
    if (
      source === 'prospects' &&
      !['tracking', 'contacted', 'quote_requested'].includes(r.status)
    )
      return null
    const date = civilDate(r.endDate)
    if (!date || !date.startsWith(month)) return null
    const days = daysToExpiry(date, now),
      phase =
        days < 0
          ? 'expired'
          : days === 0
            ? 'today'
            : days <= 30
              ? 'soon'
              : 'future'
    const contacts = Array.isArray(r.memberContacts) ? r.memberContacts : []
    const phone = text(
      source === 'prospects'
        ? r.phone
        : r.primaryPhone || contacts[0] || r.nonMemberPhone1,
    )
    return {
      id: `${source}:${r.id}:${date}`,
      recordId: r.id,
      source,
      date,
      ownerName:
        source === 'prospects'
          ? text(r.ownerName)
          : [
              r.memberFirstName || r.nonMemberFirstName,
              r.memberLastName || r.nonMemberLastName,
            ]
              .filter(Boolean)
              .join(' ') || 'Titulaire',
      plateNumber: text(r.plateNumber),
      vehicleType: text(r.vehicleType),
      insuranceCompany: text(r.insuranceCompany),
      policyNumber: source === 'insurance' ? text(r.policyNumber) : '',
      city: text(r.city),
      quarter: text(r.quarter),
      quarterId: text(r.quarterId),
      locationDetails:
        r.locationType === 'other' ? text(r.locationDetails) : '',
      phone,
      whatsapp: text(r.whatsapp) || phone,
      sponsorName: text(r.sponsorName),
      daysRemaining: days,
      phase,
      phaseLabel:
        days < 0
          ? 'Échéance dépassée'
          : days === 0
            ? 'Expire aujourd’hui'
            : days <= 30
              ? 'Expire bientôt'
              : 'À venir',
      followUpStatus: source === 'prospects' ? text(r.status) : '',
    }
  }
  return [
    ...insurances.map((r) => convert(r, 'insurance')),
    ...prospects.map((r) => convert(r, 'prospects')),
  ]
    .filter((r): r is VehicleCalendarItem => r !== null)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.ownerName.localeCompare(b.ownerName, 'fr'),
    )
}
export function vehicleCalendarDays(month: string): (string | null)[] {
  const [year, m] = month.split('-').map(Number),
    first = new Date(Date.UTC(year, m - 1, 1)),
    offset = (first.getUTCDay() + 6) % 7,
    count = new Date(Date.UTC(year, m, 0)).getUTCDate()
  const days: (string | null)[] = Array(offset).fill(null)
  for (let i = 1; i <= count; i++)
    days.push(`${month}-${String(i).padStart(2, '0')}`)
  while (days.length % 7) days.push(null)
  return days
}
export function vehicleWebDestination(
  item: Pick<VehicleCalendarItem, 'source' | 'recordId'>,
) {
  return item.source === 'insurance'
    ? `/vehicules/${encodeURIComponent(item.recordId)}`
    : `/vehicules/prospection?focus=${encodeURIComponent(item.recordId)}`
}

/** Même normalisation Gabon que kara-admin-mobile/features/contacts/model.ts. */
export function vehicleWhatsAppNumber(phone: string) {
  if (!/^[+\d\s().-]+$/.test(phone.trim())) return ''
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (/^0\d{8}$/.test(digits)) digits = `241${digits.slice(1)}`
  else if (/^\d{8}$/.test(digits)) digits = `241${digits}`
  digits = digits.replace(/^2410(?=\d{8}$)/, '241')
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : ''
}
