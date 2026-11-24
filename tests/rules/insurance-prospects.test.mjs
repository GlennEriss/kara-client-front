import { before, after, test } from 'node:test'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, getDocs, collection, query, where, setDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
let env
const row = (sponsorMemberId = 'M001') => ({ ownerName: 'Contact fictif', phone: '077000000', whatsapp: '', plateNumber: 'TEST-123', vehicleType: 'car', vehicleDescription: '',
  city: 'Libreville', locationType: 'quarter', quarter: 'Awendjé', locationDetails: '', insuranceCompany: 'Autre assureur', endDate: '2026-12-20', notes: '',
  status: 'tracking', sponsorMemberId, sponsorName: 'Fictif', source: 'member', createdBy: 'alice', updatedBy: 'alice', createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-kara-prospects', firestore: { host: '127.0.0.1', port: 8088, rules: readFileSync(process.env.KARA_FIRESTORE_RULES_PATH || new URL('../../firestore.rules', import.meta.url), 'utf8') } })
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore()
    await Promise.all([
      setDoc(doc(db, 'quarters/Q1'), { name: 'Awendjé', districtId: 'D1' }),
      setDoc(doc(db, 'districts/D1'), { name: '3e', communeId: 'C1' }),
      setDoc(doc(db, 'communes/C1'), { name: 'Libreville', departmentId: 'DEP1' }),
    ])
    await Promise.all([setDoc(doc(db, 'users/alice'), { matricule: 'M001' }), setDoc(doc(db, 'users/bob'), { matricule: 'M002' }),
      setDoc(doc(db, 'admins/manager'), { roles: ['Admin'] }), setDoc(doc(db, 'insurance-prospects/own'), row()),
      setDoc(doc(db, 'insurance-prospects/other'), row('M002')), setDoc(doc(db, 'insurance-prospects/closed'), { ...row(), status: 'converted', insuranceId: 'i1' })])
  })
})
after(async () => { await env?.cleanup() })
const db = (uid = 'alice') => env.authenticatedContext(uid).firestore()
test('un membre crée son prospect et son historique dans un même lot', async () => {
  const f = db(), batch = writeBatch(f)
  batch.set(doc(f, 'insurance-prospects/new'), row())
  batch.set(doc(f, 'insurance-prospects/new/activities/created'), { kind: 'created', note: 'Création', by: 'alice', byName: 'Fictif', at: serverTimestamp() })
  await assertSucceeds(batch.commit())
})
test('les données des autres parrains et les requêtes sans filtre sont interdites', async () => {
  await assertSucceeds(getDoc(doc(db(), 'insurance-prospects/own')))
  await assertFails(getDoc(doc(db(), 'insurance-prospects/other')))
  await assertFails(getDocs(collection(db(), 'insurance-prospects')))
  await assertSucceeds(getDocs(query(collection(db(), 'insurance-prospects'), where('sponsorMemberId', '==', 'M001'))))
  await assertSucceeds(getDocs(query(collection(db(), 'insurance-prospects'), where('sponsorMemberId', 'in', ['alice', 'M001']))))
})
test('un membre ne peut ni attribuer à autrui ni créer une assurance confirmée', async () => {
  await assertFails(setDoc(doc(db(), 'insurance-prospects/spoofed'), row('M002')))
  await assertFails(setDoc(doc(db(), 'insurance-prospects/converted'), { ...row(), status: 'converted', insuranceId: 'fake' }))
  await assertFails(setDoc(doc(db(), 'insurance-prospects/spoof-admin'), { ...row(), source: 'admin' }))
})
test('un quartier ou un autre emplacement précis est obligatoire', async () => {
  await assertFails(setDoc(doc(db(), 'insurance-prospects/no-quarter'), { ...row(), quarter: '' }))
  await assertFails(setDoc(doc(db(), 'insurance-prospects/no-location'), { ...row(), locationType: 'other' }))
  await assertSucceeds(setDoc(doc(db(), 'insurance-prospects/other-location'), { ...row(), locationType: 'other', locationDetails: 'Parking marché' }))
})
test('les relances sont permises mais le parrain, le créateur et la conversion sont protégés', async () => {
  await assertSucceeds(updateDoc(doc(db(), 'insurance-prospects/own'), { status: 'contacted', updatedAt: serverTimestamp(), updatedBy: 'alice' }))
  await assertFails(updateDoc(doc(db(), 'insurance-prospects/own'), { sponsorMemberId: 'M002', updatedAt: serverTimestamp(), updatedBy: 'alice' }))
  await assertFails(updateDoc(doc(db(), 'insurance-prospects/own'), { createdBy: 'bob', updatedAt: serverTimestamp(), updatedBy: 'alice' }))
  await assertFails(updateDoc(doc(db(), 'insurance-prospects/own'), { status: 'converted', insuranceId: 'fake', updatedAt: serverTimestamp(), updatedBy: 'alice' }))
})
test('l’historique est personnel, attribué au bon auteur et immuable', async () => {
  const ref = doc(db(), 'insurance-prospects/own/activities/call')
  await assertSucceeds(setDoc(ref, { kind: 'contacted', note: 'Appel effectué', by: 'alice', byName: 'Fictif', at: serverTimestamp() }))
  await assertFails(setDoc(doc(db(), 'insurance-prospects/own/activities/spoof'), { kind: 'contacted', note: 'Test', by: 'bob', at: serverTimestamp() }))
  await assertFails(updateDoc(ref, { note: 'Effacé' }))
  await assertFails(deleteDoc(ref))
  await assertFails(getDocs(collection(db('bob'), 'insurance-prospects/own/activities')))
})
test('un suivi clôturé ne peut plus être modifié par son membre', async () => {
  await assertFails(updateDoc(doc(db(), 'insurance-prospects/closed'), { status: 'tracking', updatedAt: serverTimestamp(), updatedBy: 'alice' }))
  await assertFails(deleteDoc(doc(db(), 'insurance-prospects/closed')))
})
test('l’admin voit et réattribue les prospects ; un visiteur anonyme ne les voit pas', async () => {
  await assertSucceeds(getDocs(collection(db('manager'), 'insurance-prospects')))
  await assertSucceeds(updateDoc(doc(db('manager'), 'insurance-prospects/other'), { sponsorMemberId: '2548.MK.290126', sponsorName: 'LE KARA — Inconnu' }))
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'insurance-prospects/own')))
})

test('un quartier rattaché doit correspondre au référentiel et au bon parent', async () => {
  const location = { quarterId: 'Q1', quarter: 'Awendjé', districtId: 'D1', communeId: 'C1', city: 'Libreville' }
  await assertSucceeds(setDoc(doc(db(), 'insurance-prospects/geography'), { ...row(), ...location }))
  await assertFails(setDoc(doc(db(), 'insurance-prospects/bad-geography'), { ...row(), ...location, quarterId: 'absent' }))
  await assertFails(setDoc(doc(db(), 'insurance-prospects/bad-parent'), { ...row(), ...location, communeId: 'other-city' }))
  await assertFails(setDoc(doc(db(), 'insurance-prospects/bad-label'), { ...row(), ...location, quarter: 'Faux nom' }))
})

test('le catalogue est administré par le back-office et les membres peuvent choisir les types proposés', async () => {
  const path = 'settings/insuranceAssetTypes'
  const values = ['custom:Vitrine réfrigérée']
  await assertFails(setDoc(doc(db(), path), { values }))
  await assertSucceeds(setDoc(doc(db('manager'), path), { values }))
  await assertSucceeds(getDoc(doc(db(), path)))
  await assertSucceeds(setDoc(doc(db(), 'insurance-prospects/building'), { ...row(), vehicleType: 'apartment' }))
  await assertSucceeds(setDoc(doc(db(), 'insurance-prospects/custom'), { ...row(), vehicleType: values[0] }))
  await assertFails(setDoc(doc(db(), 'insurance-prospects/unknown'), { ...row(), vehicleType: 'custom:Choix non publié' }))
  await assertFails(setDoc(doc(db(), 'insurance-prospects/free'), { ...row(), vehicleType: 'other' }))
  await assertSucceeds(setDoc(doc(db(), 'insurance-prospects/free'), { ...row(), vehicleType: 'other', vehicleDescription: 'Scène mobile' }))
  const draft = { holderType: 'member', memberId: 'M001', status: 'active', declarationStatus: 'draft' }
  const insurance = doc(db(), 'vehicle-insurances/custom-draft')
  await assertSucceeds(setDoc(insurance, { ...draft, vehicleType: values[0] }))
  await assertFails(updateDoc(insurance, { vehicleType: 'other' }))
  await assertSucceeds(updateDoc(insurance, { vehicleType: 'other', vehicleDescription: 'Scène mobile' }))
  const settings = doc(db('manager'), path)
  await assertFails(setDoc(settings, { values, inactive: ['other'] }))
  await assertSucceeds(setDoc(settings, { values, inactive: [values[0], 'apartment'] }))
  await assertFails(setDoc(settings, { values }))
  await assertFails(setDoc(doc(db(), 'insurance-prospects/retired-building'), { ...row(), vehicleType: 'apartment' }))
  await assertFails(updateDoc(insurance, { vehicleType: values[0] }))
  await assertFails(setDoc(doc(db(), 'vehicle-insurances/retired-draft'), { ...draft, vehicleType: values[0] }))
  await assertSucceeds(updateDoc(doc(db(), 'insurance-prospects/custom'), { status: 'contacted', updatedBy: 'alice', updatedAt: serverTimestamp() }))
  await assertSucceeds(setDoc(settings, { values, inactive: ['apartment'] }))
  await assertSucceeds(setDoc(doc(db(), 'vehicle-insurances/restored-draft'), { ...draft, vehicleType: values[0] }))
})


test('le gestionnaire assurances et prospections ne peut pas gérer les autres modules', async () => {
  await env.withSecurityRulesDisabled(async context => {
    const firestore = context.firestore()
    await Promise.all([
      setDoc(doc(firestore, 'admins/insurance-only'), { roles: ['GestionnaireVehicules'] }),
      setDoc(doc(firestore, 'shops/private'), { status: 'pending', submittedBy: 'alice' }),
      setDoc(doc(firestore, 'contractsCI/private'), { memberId: 'M001' }),
      setDoc(doc(firestore, 'notifications/private'), { module: 'boutique', isRead: false }),
    ])
  })
  for (const account of [
    db('insurance-only'),
    env.authenticatedContext('insurance-claim', { role: 'GestionnaireVehicules' }).firestore(),
  ]) {
    await assertSucceeds(getDocs(collection(account, 'insurance-prospects')))
    await assertSucceeds(getDocs(collection(account, 'vehicle-insurances')))
    await assertFails(getDoc(doc(account, 'shops/private')))
    await assertFails(updateDoc(doc(account, 'shops/private'), { status: 'approved' }))
    await assertFails(getDoc(doc(account, 'contractsCI/private')))
    await assertFails(updateDoc(doc(account, 'notifications/private'), { isRead: true }))
  }
  await assertSucceeds(getDoc(doc(db('manager'), 'shops/private')))
})

test('un agent de prospection actif accède à ses seuls dossiers et ne reçoit aucun droit admin', async () => {
  await env.withSecurityRulesDisabled(async context => {
    const firestore = context.firestore()
    await Promise.all([
      setDoc(doc(firestore, 'admins/agent'), { roles: ['AgentProspection'], isActive: true }),
      setDoc(doc(firestore, 'insurance-prospects/agent-own'), { ...row('agent'), createdBy: 'agent', updatedBy: 'agent' }),
      setDoc(doc(firestore, 'vehicle-insurances/agent-own'), { memberId: 'agent', declarationStatus: 'pending' }),
      setDoc(doc(firestore, 'vehicle-insurances/other-owner'), { memberId: 'M001' }),
      setDoc(doc(firestore, 'shops/agent-unrelated'), { status: 'pending', submittedBy: 'alice' }),
    ])
  })
  const f = env.authenticatedContext('agent', { role: 'AgentProspection' }).firestore()
  await assertSucceeds(getDocs(query(collection(f, 'insurance-prospects'), where('sponsorMemberId', '==', 'agent'))))
  await assertSucceeds(getDocs(query(collection(f, 'vehicle-insurances'), where('memberId', '==', 'agent'))))
  await assertSucceeds(setDoc(doc(f, 'insurance-prospects/agent-created'), { ...row('agent'), createdBy: 'agent', updatedBy: 'agent' }))
  await assertFails(setDoc(doc(f, 'insurance-prospects/agent-spoofed'), { ...row('M001'), createdBy: 'agent', updatedBy: 'agent' }))
  await assertFails(getDocs(collection(f, 'insurance-prospects')))
  await assertFails(getDoc(doc(f, 'insurance-prospects/own')))
  await assertFails(getDoc(doc(f, 'vehicle-insurances/other-owner')))
  await assertFails(updateDoc(doc(f, 'vehicle-insurances/agent-own'), { declarationStatus: 'validated' }))
  await assertFails(getDoc(doc(f, 'shops/agent-unrelated')))
  await env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), 'admins/agent'), { isActive: false }))
  await assertFails(getDoc(doc(f, 'insurance-prospects/agent-own')))
})
