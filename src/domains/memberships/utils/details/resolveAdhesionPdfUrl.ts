/**
 * Résout l'URL du PDF d'adhésion validé pour une demande approuvée
 * 
 * Stratégie :
 * 1) Si `adhesionPdfURL` est présent sur la demande, retourne cette URL
 * 2) Sinon, cherche dans Firestore collection `documents` (type ADHESION, trié par createdAt desc)
 * 3) Retourne l'URL trouvée ou null si aucun PDF disponible
 * 
 * @param request - Demande d'adhésion avec au minimum { id, matricule, adhesionPdfURL?, status }
 * @returns URL du PDF ou null si non trouvé
 */
import { DocumentRepository } from '@/domains/infrastructure/documents/repositories/DocumentRepository'
import type { MembershipRequest } from '@/types/types'

export interface ResolveAdhesionPdfUrlRequest {
  id: string
  matricule?: string
  adhesionPdfURL?: string | null
  status?: string
}

export async function resolveAdhesionPdfUrl(
  request: ResolveAdhesionPdfUrlRequest
): Promise<string | null> {
  // 1) URL directe sur la demande
  if (request.adhesionPdfURL) {
    return request.adhesionPdfURL
  }

  // 2) Fallback : chercher dans Firestore documents
  try {
    const repo = new DocumentRepository()
    const memberId = request.matricule || request.id

    const result = await repo.getDocuments({
      memberId,
      type: 'ADHESION',
      page: 1,
      pageSize: 1,
      sort: [
        { field: 'createdAt', direction: 'desc' }
      ],
    })

    const doc = result.documents?.[0]
    if (doc?.url) {
      return doc.url
    }

    return null
  } catch (error) {
    console.error('Erreur lors de la récupération du PDF validé depuis Firestore:', error)
    return null
  }
}
