'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CharityMediaService } from '@/services/bienfaiteur/CharityMediaService'
import { CharityMedia } from '@/types/types'
import { useAuth } from '@/hooks/useAuth'

/**
 * Hook pour récupérer les médias d'un évènement
 */
export function useCharityMedia(eventId: string) {
  return useQuery({
    queryKey: ['charity-media', eventId],
    queryFn: () => CharityMediaService.getEventMedia(eventId),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook pour créer un média
 */
export function useCreateCharityMedia() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ 
      eventId, 
      file,
      type,
      title,
      description,
      takenAt
    }: { 
      eventId: string
      file: File
      type: 'photo' | 'video'
      title?: string
      description?: string
      takenAt?: Date
    }) => {
      if (!user?.uid) throw new Error('User not authenticated')
      return CharityMediaService.createMedia(eventId, file, type, user.uid, title, description, takenAt)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['charity-media', variables.eventId] })
    },
  })
}

/**
 * Hook pour supprimer un média
 */
export function useDeleteCharityMedia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ eventId, mediaId }: { eventId: string; mediaId: string }) => 
      CharityMediaService.deleteMedia(eventId, mediaId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['charity-media', variables.eventId] })
    },
  })
}

