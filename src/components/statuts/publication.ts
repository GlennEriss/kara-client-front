import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

import { db } from '@/firebase/firestore'
import type { SignataireFillData } from '@/components/statuts/documentFill'

/**
 * Publication des textes institutionnels (Statuts, Règlement Intérieur).
 *
 * Le Comité Exécutif renseigne lieu, date et signataires depuis l'admin, puis
 * publie : l'enregistrement devient la référence lue par l'espace membre, qui
 * affiche alors le document daté et signé au lieu d'un bloc vierge.
 */

export const ASSOCIATION_DOCUMENTS_COLLECTION = 'association-documents'

export type AssociationDocumentId = 'statuts' | 'reglement-interieur'

export interface DocumentPublie extends SignataireFillData {
  /** Version du texte publié, pour tracer ce qui a été adopté. */
  version: string
  publishedAt?: unknown
  publishedBy?: string | null
}

/** Lit la publication en vigueur, ou `null` si le texte n'a jamais été publié. */
export async function lireDocumentPublie(
  documentId: AssociationDocumentId,
): Promise<DocumentPublie | null> {
  if (!db) return null
  const snap = await getDoc(doc(db, ASSOCIATION_DOCUMENTS_COLLECTION, documentId))
  if (!snap.exists()) return null
  return snap.data() as DocumentPublie
}

/**
 * Publie le document aux membres. Écrase la publication précédente : c'est
 * toujours le dernier texte adopté qui fait foi.
 */
export async function publierDocument(
  documentId: AssociationDocumentId,
  fillData: SignataireFillData,
  version: string,
  publishedBy?: string | null,
): Promise<void> {
  if (!db) throw new Error('Firestore indisponible')
  await setDoc(doc(db, ASSOCIATION_DOCUMENTS_COLLECTION, documentId), {
    ...fillData,
    version,
    publishedAt: serverTimestamp(),
    publishedBy: publishedBy ?? null,
  })
}
