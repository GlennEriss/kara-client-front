import { after, before, test } from 'node:test'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { collection, query, where, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore'

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
      setDoc(doc(db, 'groups/own/contributions/alice-month'), { memberId: 'alice', projectId: 'p1', period: '2026-11', amount: 10000, payments: [] }),
      setDoc(doc(db, 'groups/own/contributions/bob-month'), { memberId: 'bob', projectId: 'p1', period: '2026-11', amount: 10000, payments: [] }),
      setDoc(doc(db, 'groups/other/contributions/alice-other'), { memberId: 'alice', projectId: 'p1', period: '2026-11', amount: 10000, payments: [] }),
      setDoc(doc(db, 'groups/own'), { name: 'Mon groupe', projects: [] }),
      setDoc(doc(db, 'groups/other'), { name: 'Autre groupe', projects: [] }),
      setDoc(doc(db, 'deletedGroupIdentities/deleted'), { name: 'Ancien groupe' }),
      setDoc(doc(db, 'admins/manager'), { roles: ['Admin'] }),
      setDoc(doc(db, 'creditContracts/alice-credit'), { clientId: 'alice', creditType: 'SPECIALE', status: 'ACTIVE' }),
      setDoc(doc(db, 'creditContracts/alice-fixed'), { clientId: 'alice', creditType: 'FIXE', status: 'ACTIVE' }),
      setDoc(doc(db, 'creditContracts/bob-fixed'), { clientId: 'bob', creditType: 'FIXE', status: 'ACTIVE' }),
      setDoc(doc(db, 'creditContracts/bob-credit'), { clientId: 'bob', creditType: 'SPECIALE', status: 'ACTIVE' }),
    ])
  })
})
after(async () => { await env?.cleanup() })

test('le nom d’un groupe supprimé reste une référence privée et non modifiable côté client', async () => {
  const admin = env.authenticatedContext('claim-admin', { role: 'Admin' }).firestore()
  const member = env.authenticatedContext('alice', { role: 'Adherant' }).firestore()
  await assertSucceeds(getDoc(doc(admin, 'deletedGroupIdentities/deleted')))
  await assertFails(getDoc(doc(member, 'deletedGroupIdentities/deleted')))
  await assertFails(setDoc(doc(admin, 'deletedGroupIdentities/fake'), { name: 'Faux groupe' }))
})

test('accords privés : admin gère les accords et index, les membres passent par la projection serveur', async () => {
  const admin = env.authenticatedContext('agreement-admin', { role: 'Admin' }).firestore()
  const paths = ['groups/own/agreements/agreement-1', 'groupAgreementLedgers/own', 'groups/own/agreementOperations/request-1']
  for (const path of paths) {
    await assertSucceeds(setDoc(doc(admin, path), { groupId: 'own', debtorId: 'alice', creditorId: 'bob', partyIds: ['alice', 'bob'], note: 'Privé' }))
    await assertSucceeds(getDoc(doc(admin, path)))
    await assertFails(deleteDoc(doc(admin, path)))
    for (const db of [env.authenticatedContext('alice', { role: 'Adherant' }).firestore(), env.authenticatedContext('bob').firestore(), env.unauthenticatedContext().firestore()]) {
      await assertFails(getDoc(doc(db, path)))
      await assertFails(setDoc(doc(db, path), { note: 'Faux' }))
      await assertFails(deleteDoc(doc(db, path)))
    }
  }
  await assertSucceeds(updateDoc(doc(admin, paths[0]), { title: 'Ventilateur' }))
  await assertSucceeds(updateDoc(doc(admin, paths[1]), { agreementCount: 1 }))
  await assertFails(updateDoc(doc(admin, paths[2]), { signature: 'autre' }))
  const member = env.authenticatedContext('alice').firestore()
  await assertFails(getDocs(query(collection(member, 'groups/own/agreements'), where('partyIds', 'array-contains', 'alice'))))
})

test('les crédits du projet restent privés : seul l’emprunteur ou un admin peut lire le contrat', async () => {
  const db = env.authenticatedContext('alice', { role: 'Adherant' }).firestore()
  await assertSucceeds(getDoc(doc(db, 'creditContracts/alice-credit')))
  await assertFails(getDoc(doc(db, 'creditContracts/bob-credit')))
  await assertFails(updateDoc(doc(db, 'creditContracts/alice-credit'), { groupProject: { groupId: 'own', projectId: 'p1' } }))
})
test('un membre peut demander un crédit mais ne peut pas s’attribuer un financement de projet', async () => {
  const db = env.authenticatedContext('alice', { role: 'Adherant' }).firestore()
  const demand = { clientId: 'alice', clientFirstName: 'Alice', clientLastName: 'Ondo', creditType: 'SPECIALE', amount: 100000, desiredDate: '2026-11-10', cause: 'Financement de matériel pour mon activité', status: 'PENDING', createdBy: 'alice', createdAt: Timestamp.now(), updatedAt: Timestamp.now() }
  await assertSucceeds(setDoc(doc(db, 'creditDemands/own-request'), demand))
  await assertFails(setDoc(doc(db, 'creditDemands/forged-project-request'), { ...demand, groupProject: { groupId: 'own', projectId: 'p1' } }))
  await assertFails(updateDoc(doc(db, 'creditDemands/own-request'), { status: 'CANCELED', groupProject: { groupId: 'own', projectId: 'p1' } }))
  const admin = env.authenticatedContext('claim-admin', { role: 'Admin' }).firestore()
  await assertSucceeds(setDoc(doc(admin, 'creditDemands/project-request'), { ...demand, createdBy: 'claim-admin', groupProject: { groupId: 'own', projectId: 'p1' } }))
  await assertSucceeds(updateDoc(doc(admin, 'creditContracts/alice-credit'), { groupProject: { groupId: 'own', projectId: 'p1' } }))
})

test('les crédits fixes du projet restent privés : seul l’emprunteur ou un admin peut lire le contrat', async () => {
  const db = env.authenticatedContext('alice', { role: 'Adherant' }).firestore()
  await assertSucceeds(getDoc(doc(db, 'creditContracts/alice-fixed')))
  await assertFails(getDoc(doc(db, 'creditContracts/bob-fixed')))
  await assertFails(updateDoc(doc(db, 'creditContracts/alice-fixed'), { groupProject: { groupId: 'own', projectId: 'p1' } }))
})
test('un membre peut demander un crédit fixe mais ne peut pas s’attribuer un financement de projet', async () => {
  const db = env.authenticatedContext('alice', { role: 'Adherant' }).firestore()
  const demand = { clientId: 'alice', clientFirstName: 'Alice', clientLastName: 'Ondo', creditType: 'FIXE', amount: 100000, desiredDate: '2026-11-10', cause: 'Financement de matériel pour mon activité', status: 'PENDING', createdBy: 'alice', createdAt: Timestamp.now(), updatedAt: Timestamp.now() }
  await assertSucceeds(setDoc(doc(db, 'creditDemands/own-fixed-request'), demand))
  await assertFails(setDoc(doc(db, 'creditDemands/forged-fixed-project-request'), { ...demand, groupProject: { groupId: 'own', projectId: 'p1' } }))
  await assertFails(updateDoc(doc(db, 'creditDemands/own-fixed-request'), { status: 'CANCELED', groupProject: { groupId: 'own', projectId: 'p1' } }))
  const admin = env.authenticatedContext('claim-admin', { role: 'Admin' }).firestore()
  await assertSucceeds(setDoc(doc(admin, 'creditDemands/fixed-project-request'), { ...demand, createdBy: 'claim-admin', groupProject: { groupId: 'own', projectId: 'p1' } }))
  await assertSucceeds(updateDoc(doc(admin, 'creditContracts/alice-fixed'), { groupProject: { groupId: 'own', projectId: 'p1' } }))
})

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
    await assertFails(deleteDoc(doc(db, 'groups/admin-created')))
  }
})

test('un groupe en suppression ne reçoit plus de projets, accords, cotisations ni remises', async () => {
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'groups/deleting-group'), { name: 'Suppression', deletionInProgress: true })
  })
  const admin = env.authenticatedContext('claim-admin', { role: 'Admin' }).firestore()
  await assertFails(updateDoc(doc(admin, 'groups/deleting-group'), { name: 'Réouverture' }))
  await assertFails(updateDoc(doc(admin, 'groups/deleting-group'), { deletionInProgress: false }))
  await assertFails(setDoc(doc(admin, 'groups/deleting-group/contributions/new'), { memberId: 'alice' }))
  await assertFails(setDoc(doc(admin, 'groups/deleting-group/agreements/new'), { title: 'Interdit' }))
  await assertFails(setDoc(doc(admin, 'groupAgreementLedgers/deleting-group'), { agreementCount: 1 }))
  await assertFails(setDoc(doc(admin, 'groupPayouts/deleting-group-payout'), { groupId: 'deleting-group' }))
})


test('cotisations : un membre lit uniquement ses mois dans ses groupes et ne peut rien écrire', async () => {
 const db = env.authenticatedContext('alice', {role: 'Adherant'}).firestore()
 await assertSucceeds(getDoc(doc(db,'groups/own/contributions/alice-month')))
 await assertSucceeds(getDocs(query(collection(db,'groups/own/contributions'),where('memberId','==','alice'))))
 await assertFails(getDoc(doc(db,'groups/own/contributions/bob-month')))
 await assertFails(getDoc(doc(db,'groups/other/contributions/alice-other')))
 await assertFails(getDocs(collection(db,'groups/own/contributions')))
 await assertFails(updateDoc(doc(db,'groups/own/contributions/alice-month'),{payments:[{amount:10000,source:'CREDIT_FIXE'}]}))
 await assertFails(setDoc(doc(db,'groups/own/contributions/forged'),{memberId:'alice',amount:10000,payments:[]}))
 await assertFails(deleteDoc(doc(db,'groups/own/contributions/alice-month')))
 const admin = env.authenticatedContext('claim-admin',{role:'Admin'}).firestore()
 await assertSucceeds(updateDoc(doc(admin,'groups/own/contributions/alice-month'),{updatedBy:'claim-admin'}))
})


test('les remises sont privées, réservées à l’admin et immuables après enregistrement', async () => {
  const admin = env.authenticatedContext('manager').firestore();
  const alice = env.authenticatedContext('alice', { role:'Adherant' }).firestore();
  const record = { groupId:'own',projectId:'p1',beneficiaryId:'alice',grossAmount:50000,feeAmount:1000,netAmount:49000,note:'Note administrative' };
  await assertSucceeds(setDoc(doc(admin,'groupPayouts/receipt'),record));
  await assertSucceeds(getDoc(doc(admin,'groupPayouts/receipt')));
  await assertFails(getDoc(doc(alice,'groupPayouts/receipt')));
  await assertFails(getDocs(collection(alice,'groupPayouts')));
  await assertFails(setDoc(doc(alice,'groupPayouts/forged'),record));
  await assertFails(updateDoc(doc(admin,'groupPayouts/receipt'),{feeAmount:2000}));
  await assertFails(deleteDoc(doc(admin,'groupPayouts/receipt')));
});
