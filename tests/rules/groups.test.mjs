import { after, before, test } from 'node:test'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'

let env
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-kara-groups',
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
  })
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await Promise.all([
      setDoc(doc(db, 'users/alice'), { groupIds: ['own'], matricule: 'M001' }),
      setDoc(doc(db, 'users/bob'), { groupIds: ['other'] }),
      setDoc(doc(db, 'users/legacy'), { matricule: 'M003' }),
      setDoc(doc(db, 'groups/own'), { name: 'Mon groupe', projects: [] }),
      setDoc(doc(db, 'groups/other'), { name: 'Autre groupe', projects: [] }),
      setDoc(doc(db, 'admins/manager'), { roles: ['Admin'] }),
    ])
  })
})
after(async () => { await env?.cleanup() })

test('un membre lit son groupe mais pas un groupe étranger', async () => {
  const db = env.authenticatedContext('alice', { role: 'Adherant' }).firestore()
  await assertSucceeds(getDoc(doc(db, 'groups/own')))
  await assertFails(getDoc(doc(db, 'groups/other')))
})
test('sans custom claim, l’appartenance continue à autoriser la lecture', async () => {
  await assertSucceeds(getDoc(doc(env.authenticatedContext('alice').firestore(), 'groups/own')))
})
test('un membre ne peut pas énumérer tous les groupes', async () => {
  await assertFails(getDocs(collection(env.authenticatedContext('alice').firestore(), 'groups')))
})
test('les visiteurs, comptes inconnus et anciens profils sans groupIds sont refusés', async () => {
  for (const db of [env.unauthenticatedContext().firestore(), env.authenticatedContext('unknown').firestore(), env.authenticatedContext('legacy').firestore()]) {
    await assertFails(getDoc(doc(db, 'groups/own')))
  }
})
test('un membre ne peut ni créer, ni modifier, ni supprimer un groupe ou un projet', async () => {
  const db = env.authenticatedContext('alice', { role: 'Adherant' }).firestore()
  await assertFails(setDoc(doc(db, 'groups/new'), { name: 'Interdit' }))
  await assertFails(updateDoc(doc(db, 'groups/own'), { projects: [{ id: 'fake' }] }))
  await assertFails(deleteDoc(doc(db, 'groups/own')))
})
test('un membre ne peut pas s’attribuer un groupe dans son profil', async () => {
  const db = env.authenticatedContext('alice', { role: 'Adherant' }).firestore()
  await assertFails(updateDoc(doc(db, 'users/alice'), { groupIds: ['own', 'other'] }))
})
test('le retrait du groupe par l’admin retire immédiatement la lecture', async () => {
  const db = env.authenticatedContext('bob', { role: 'Adherant' }).firestore()
  await assertSucceeds(getDoc(doc(db, 'groups/other')))
  await env.withSecurityRulesDisabled((context) => updateDoc(doc(context.firestore(), 'users/bob'), { groupIds: [] }))
  await assertFails(getDoc(doc(db, 'groups/other')))
})
test('un admin conserve la liste et la gestion des groupes, via claim ou document admin', async () => {
  for (const db of [env.authenticatedContext('claim-admin', { role: 'Admin' }).firestore(), env.authenticatedContext('manager').firestore()]) {
    await assertSucceeds(getDocs(collection(db, 'groups')))
    await assertSucceeds(setDoc(doc(db, 'groups/admin-created'), { name: 'Groupe admin' }))
    await assertSucceeds(updateDoc(doc(db, 'groups/admin-created'), { projects: [{ id: 'p1', status: 'ACTIVE' }] }))
    await assertSucceeds(updateDoc(doc(db, 'users/alice'), { groupIds: ['own'] }))
    await assertSucceeds(deleteDoc(doc(db, 'groups/admin-created')))
  }
})
