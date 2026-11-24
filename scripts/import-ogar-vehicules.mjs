import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { cert, initializeApp, deleteApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const projects = {
  dev: { id: 'kara-gabon-dev', bucket: 'kara-gabon-dev.firebasestorage.app' },
  prod: { id: 'kara-gabon', bucket: 'kara-gabon.appspot.com' },
}
const [target, fileName] = process.argv.slice(2)
const project = projects[target]
if (
  !project ||
  !fileName ||
  project.id !== process.env.FIREBASE_PROJECT_ID ||
  project.bucket !== process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
) throw Error('Indiquez dev ou prod, la source PDF et les identifiants Firebase du même environnement.')

const pdf = await readFile(fileName)
if (pdf.subarray(0, 5).toString() !== '%PDF-' || pdf.length > 10 * 1024 * 1024)
  throw Error('Le fichier source doit être un PDF de 10 Mo maximum.')

const sha256 = createHash('sha256').update(pdf).digest('hex')
const collection = 'insurance-reference-documents'
const id = 'ogar-vehicules'
const storagePath = `${collection}/${id}.pdf`

const app = initializeApp({
  projectId: project.id,
  credential: cert({
    projectId: project.id,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
})
try {
  const ref = getFirestore(app).collection(collection).doc(id)
  const stored = (await ref.get()).data()
  if (stored && (stored.sha256 !== sha256 || stored.storagePath !== storagePath))
    throw Error('Un autre barème OGAR est déjà enregistré dans cette base.')

  const file = getStorage(app).bucket(project.bucket).file(storagePath)
  try {
    await file.save(pdf, {
      resumable: false,
      metadata: { contentType: 'application/pdf', cacheControl: 'private, no-store' },
      preconditionOpts: { ifGenerationMatch: 0 },
    })
  } catch (error) {
    if (Number(error.code) !== 412) throw error
  }

  const [downloaded] = await file.download()
  if (createHash('sha256').update(downloaded).digest('hex') !== sha256)
    throw Error('Le barème déjà stocké diffère du fichier source.')

  if (!stored) {
    try {
      await ref.create({
        title: 'Barème OGAR des assurances automobiles',
        insurer: 'OGAR',
        filename: 'OGAR-VEHICULES.pdf',
        contentType: 'application/pdf',
        size: pdf.length,
        sha256,
        storagePath,
        importedAt: FieldValue.serverTimestamp(),
      })
    } catch (error) {
      if (Number(error.code) !== 6) throw error
    }
  }
  const verified = (await ref.get()).data()
  if (verified?.sha256 !== sha256 || verified?.storagePath !== storagePath)
    throw Error('La référence Firestore ne correspond pas au PDF vérifié.')
  process.stdout.write(`${project.id} · PDF et référence Firestore vérifiés (${pdf.length} octets)\n`)
} finally {
  await deleteApp(app)
}
