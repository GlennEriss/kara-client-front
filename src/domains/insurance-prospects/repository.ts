import { isProspectingAccount } from '@/domains/auth/prospecting-role'
import { pickVehicleLocation, resolveVehicleLocation, type VehicleLocation } from '@/domains/vehicles/location'
import {
  prospectSchema,
  PROSPECT_COLLECTION,
  KARA_SPONSOR_ID,
  insuranceMatchesProspect,
  civilDate,
  type InsuranceProspect,
  type ProspectInput,
} from './model'

const firestore = () => import('@/firebase/firestore')
type Actor = { id: string; name: string; memberId?: string; admin: boolean }
export class InsuranceProspectRepository {
  constructor(private readonly getFirestore: typeof firestore = firestore) {}
  private async location(input: VehicleLocation) {
    if (input.locationType === 'quarter' && !input.quarterId) throw Error('Sélectionnez un quartier de Géographie.');
    const f = await this.getFirestore()
    return resolveVehicleLocation(pickVehicleLocation(input), async (collection, id) => {
      const snapshot = await f.getDoc(f.doc(f.db, collection, id))
      return snapshot.exists() ? snapshot.data() : null
    })
  }
  async list(memberId?: string | string[]): Promise<InsuranceProspect[]> {
    const f = await this.getFirestore()
    const ref = f.collection(f.db, PROSPECT_COLLECTION)
    const snapshot = await f.getDocs(
      memberId
        ? f.query(
            ref,
            f.where('sponsorMemberId', 'in', [
              ...new Set(Array.isArray(memberId) ? memberId : [memberId]),
            ]),
          )
        : ref,
    )
    return snapshot.docs
      .map((d) => ({ ...d.data(), id: d.id }) as InsuranceProspect)
      .sort((a, b) => a.endDate.localeCompare(b.endDate))
  }
  async create(input: ProspectInput, sponsorMemberId: string, actor: Actor) {
    const parsed = prospectSchema.parse(input)
    const data = { ...parsed, ...await this.location(parsed) }
    const f = await this.getFirestore()
    const sponsor = actor.admin
      ? sponsorMemberId || KARA_SPONSOR_ID
      : actor.memberId!
    if (!sponsor) throw Error('Profil membre indisponible')
    let sponsorName = actor.name
    if (actor.admin) {
      if (sponsor === KARA_SPONSOR_ID) sponsorName = 'LE KARA — Inconnu'
      else {
        const member = await f.getDoc(f.doc(f.db, 'users', sponsor))
        const staff = member.exists() ? undefined : (await f.getDoc(f.doc(f.db, 'admins', sponsor))).data()
        const person = member.exists() ? member.data() : staff
        if (!person || (!member.exists() && (!isProspectingAccount(staff) || staff?.isActive === false)))
          throw Error('Parrain ou agent introuvable')
        sponsorName = [person.firstName, person.lastName]
          .filter(Boolean)
          .join(' ')
      }
    }
    const ref = f.doc(f.collection(f.db, PROSPECT_COLLECTION))
    const batch = f.writeBatch(f.db)
    batch.set(ref, {
      ...data,
      status: 'tracking',
      sponsorMemberId: sponsor,
      sponsorName,
      source: actor.admin ? 'admin' : 'member',
      createdBy: actor.id,
      updatedBy: actor.id,
      createdAt: f.serverTimestamp(),
      updatedAt: f.serverTimestamp(),
    })
    batch.set(f.doc(f.collection(ref, 'activities')), {
      kind: 'created',
      note: 'Prospect enregistré',
      by: actor.id,
      byName: actor.name,
      at: f.serverTimestamp(),
    })
    await batch.commit()
    return ref.id
  }
  async change(
    id: string,
    actor: Actor,
    kind:
      | 'edit'
      | 'contacted'
      | 'quote_requested'
      | 'renewed_elsewhere'
      | 'lost'
      | 'assign'
      | 'converted',
    payload: Record<string, unknown>,
  ) {
    const f = await this.getFirestore(),
      ref = f.doc(f.db, PROSPECT_COLLECTION, id)
    const note = String(payload.note || '').trim()
    if (note.length > 2000)
      throw Error('Le motif est limité à 2 000 caractères')
    if (kind !== 'edit' && note.length < 3)
      throw Error('Précisez le résultat ou le motif (3 caractères minimum)')
    await f.runTransaction(f.db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) throw Error('Prospect introuvable')
      const row = snap.data() as InsuranceProspect
      if (
        !actor.admin &&
        ![actor.id, actor.memberId].includes(row.sponsorMemberId)
      )
        throw Error('Accès refusé')
      if (['converted', 'lost'].includes(row.status))
        throw Error('Ce suivi est clôturé')
      const patch: Record<string, unknown> = {
        updatedBy: actor.id,
        updatedAt: f.serverTimestamp(),
      }
      if (kind === 'edit') {
        const data = prospectSchema.parse(payload)
        Object.assign(patch, data, await this.location(data))
      }
      if (kind === 'contacted' || kind === 'quote_requested') {
        patch.status = kind
        patch.followUpDate = payload.followUpDate
          ? civilDate.parse(payload.followUpDate)
          : ''
      }
      if (kind === 'lost') patch.status = 'lost'
      if (kind === 'renewed_elsewhere') {
        const endDate = civilDate.parse(payload.endDate)
        if (endDate <= row.endDate)
          throw Error('La nouvelle échéance doit suivre l’ancienne')
        patch.endDate = endDate
        patch.insuranceCompany = String(payload.insuranceCompany || '').trim()
        if (!patch.insuranceCompany) throw Error('Assureur requis')
        patch.status = 'tracking'
        patch.followUpDate = ''
      }
      if (kind === 'assign') {
        if (!actor.admin) throw Error('Attribution réservée à l’administration')
        const sponsor = String(payload.sponsorMemberId || KARA_SPONSOR_ID)
        let sponsorName = 'LE KARA — Inconnu'
        if (sponsor !== KARA_SPONSOR_ID) {
          const member = await tx.get(f.doc(f.db, 'users', sponsor))
          const staff = member.exists() ? undefined : (await tx.get(f.doc(f.db, 'admins', sponsor))).data()
          const person = member.exists() ? member.data() : staff
          if (!person || (!member.exists() && (!isProspectingAccount(staff) || staff?.isActive === false)))
            throw Error('Parrain ou agent introuvable')
          sponsorName = [person.firstName, person.lastName]
            .filter(Boolean)
            .join(' ')
        }
        Object.assign(patch, { sponsorMemberId: sponsor, sponsorName })
      }
      if (kind === 'converted') {
        if (!actor.admin) throw Error('Validation réservée à l’administration')
        const insuranceId = String(payload.insuranceId || '')
        if (!insuranceId || insuranceId.includes('/'))
          throw Error('Sélectionnez une assurance enregistrée')
        const insuranceRef = f.doc(f.db, 'vehicle-insurances', insuranceId)
        const insurance = await tx.get(insuranceRef)
        const insured = insurance.data()
        if (!insured || !insuranceMatchesProspect({ ...row, id }, insured))
          throw Error(
            'L’assurance doit être validée, correspondre au véhicule et au parrain, couvrir une période après l’ancienne échéance et ne pas être liée à un autre prospect',
          )
        tx.update(insuranceRef, { prospectId: id })
        Object.assign(patch, {
          status: 'converted',
          insuranceId,
          followUpDate: '',
        })
      }
      tx.update(ref, patch)
      tx.set(f.doc(f.collection(ref, 'activities')), {
        kind,
        note: note || 'Informations mises à jour',
        by: actor.id,
        byName: actor.name,
        at: f.serverTimestamp(),
        ...(kind === 'renewed_elsewhere'
          ? {
              previousEndDate: row.endDate,
              endDate: patch.endDate,
              insuranceCompany: patch.insuranceCompany,
            }
          : {}),
        ...(kind === 'assign'
          ? {
              previousSponsorMemberId: row.sponsorMemberId,
              sponsorMemberId: patch.sponsorMemberId,
            }
          : {}),
      })
    })
    if (kind === 'quote_requested') {
      try {
        await f.addDoc(f.collection(f.db, 'notifications'), {
          module: 'vehicule',
          type: 'status_update',
          entityId: id,
          title: 'Prospect : assurance LE KARA demandée',
          message: `${actor.name} demande la prise en charge d’un prospect.`,
          metadata: { prospectId: id, dataset: 'prospects' },
          isRead: false,
          createdAt: f.serverTimestamp(),
        })
      } catch {
        /* Le suivi reste enregistré si la notification échoue. */
      }
    }
  }
  async history(id: string) {
    const f = await this.getFirestore()
    const snap = await f.getDocs(
      f.query(
        f.collection(f.db, PROSPECT_COLLECTION, id, 'activities'),
        f.orderBy('at', 'desc'),
      ),
    )
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }
}
