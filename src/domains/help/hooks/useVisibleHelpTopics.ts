'use client'

import { isOpenToRestrictedRole, requiredViewPermissionForPath } from '@/constantes/permissions'
import { useMyAccess } from '@/hooks/useMyAccess'
import { useMemo } from 'react'
import { HELP_TOPICS } from '../content'
import type { HelpTopic } from '../entities/help.types'

/** Les fiches des sections que l'admin connecté peut ouvrir (même règle que le menu). */
export function useVisibleHelpTopics(): { topics: HelpTopic[]; isLoading: boolean } {
  const { isLoading, isSuperAdmin, isAgent, can } = useMyAccess()

  const topics = useMemo(() => {
    const canSeeUrl = (url: string) => {
      const required = requiredViewPermissionForPath(url)
      if (!required) return !isAgent || isOpenToRestrictedRole(url)
      return can(required)
    }
    return HELP_TOPICS.filter(
      (topic) => (!topic.superAdminOnly || isSuperAdmin) && topic.pages.some((page) => canSeeUrl(page.path))
    )
  }, [isSuperAdmin, isAgent, can])

  return { topics, isLoading }
}
