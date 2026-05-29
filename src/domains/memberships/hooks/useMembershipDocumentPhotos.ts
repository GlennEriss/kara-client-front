/**
 * Resolves document photo URLs (recto/verso) for a membership request.
 *
 * Reads URLs from Firestore first. If absent, falls back to scanning
 * Firebase Storage by matricule + candidate identifiers (email/contacts),
 * recovering photos for requests whose upload patch failed.
 */

import { useEffect, useState } from 'react'
import { getDownloadURL, listAll, ref } from 'firebase/storage'
import { getStorageInstance } from '@/firebase/storage'
import type { MembershipRequest } from '../entities'

interface DocumentPhotos {
  frontURL: string | null
  backURL: string | null
  isLoading: boolean
}

function buildSafeUserId(identifier: string): string {
  return encodeURIComponent(identifier).replace(/%[0-9A-F]{2}/g, '_')
}

function getCandidateIdentifiers(request: MembershipRequest): string[] {
  const candidates = new Set<string>()
  if (request.identity?.email) candidates.add(request.identity.email)
  for (const contact of request.identity?.contacts ?? []) {
    if (contact) candidates.add(contact)
  }
  return [...candidates]
}

async function findFirstUrl(category: string, safeUserId: string, matricule: string): Promise<string | null> {
  try {
    const storage = getStorageInstance()
    const folderRef = ref(storage, `${category}/${safeUserId}/${matricule}`)
    const result = await listAll(folderRef)
    if (result.items.length === 0) return null
    return await getDownloadURL(result.items[0])
  } catch {
    return null
  }
}

export function useMembershipDocumentPhotos(request: MembershipRequest | undefined | null): DocumentPhotos {
  const [frontURL, setFrontURL] = useState<string | null>(null)
  const [backURL, setBackURL] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!request) {
      setFrontURL(null)
      setBackURL(null)
      return
    }

    const storedFront = request.documents?.documentPhotoFrontURL || null
    const storedBack = request.documents?.documentPhotoBackURL || null

    setFrontURL(storedFront)
    setBackURL(storedBack)

    if (storedFront && storedBack) return

    let cancelled = false
    setIsLoading(true)

    void (async () => {
      try {
        const candidates = getCandidateIdentifiers(request)
        for (const candidate of candidates) {
          const safeUserId = buildSafeUserId(candidate)

          const [front, back] = await Promise.all([
            storedFront ? Promise.resolve(storedFront) : findFirstUrl('membership-request-document-front', safeUserId, request.matricule),
            storedBack ? Promise.resolve(storedBack) : findFirstUrl('membership-request-document-back', safeUserId, request.matricule),
          ])

          if (cancelled) return

          if (front && !storedFront) setFrontURL(front)
          if (back && !storedBack) setBackURL(back)

          if ((front || storedFront) && (back || storedBack)) break
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [request])

  return { frontURL, backURL, isLoading }
}
