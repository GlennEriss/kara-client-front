import { after, before, test } from 'node:test'
import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { ref, uploadBytes, getMetadata, deleteObject } from 'firebase/storage'

let env
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-kara-groups',
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
    storage: { rules: readFileSync(new URL('../../storage.rules', import.meta.url), 'utf8') },
  })
})
after(async () => { await env?.cleanup() })
test('justificatifs : admin seul, formats et taille contrôlés, sans remplacement ni suppression', async () => {
  const admin = env.authenticatedContext('agreement-admin', { role: 'Admin' }).storage()
  const path = 'group-agreements/group-1/agreement-1/payment-1/proof.pdf'
  const document = ref(admin, path)
  await assertSucceeds(uploadBytes(document, new Uint8Array([1, 2, 3]), { contentType: 'application/pdf' }))
  await assertSucceeds(getMetadata(document))
  await assertFails(uploadBytes(document, new Uint8Array([4]), { contentType: 'application/pdf' }))
  await assertFails(deleteObject(document))
  await assertFails(uploadBytes(ref(admin, 'group-agreements/group-1/agreement-1/payment-1/script.html'), new Uint8Array([1]), { contentType: 'text/html' }))
  await assertFails(uploadBytes(ref(admin, 'group-agreements/group-1/agreement-1/payment-1/big.pdf'), new Uint8Array(5 * 1024 * 1024 + 1), { contentType: 'application/pdf' }))
  for (const storage of [env.authenticatedContext('buyer', { role: 'Adherant' }).storage(), env.unauthenticatedContext().storage()]) {
    await assertFails(getMetadata(ref(storage, path)))
    await assertFails(uploadBytes(ref(storage, 'group-agreements/group-1/agreement-1/payment-2/fake.pdf'), new Uint8Array([1]), { contentType: 'application/pdf' }))
  }
})
