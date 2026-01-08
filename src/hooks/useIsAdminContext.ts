import { usePathname } from 'next/navigation'

/**
 * Hook pour détecter si on est dans le contexte admin (page /memberships/add)
 * vs le contexte public (page /register)
 */
export function useIsAdminContext() {
  const pathname = usePathname()
  return pathname?.startsWith('/memberships/add') ?? false
}

