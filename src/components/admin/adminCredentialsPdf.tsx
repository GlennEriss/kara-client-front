'use client'

import { IdentifiantsMembrePDF } from '@/domains/memberships/components/IdentifiantsMembrePDF'
import routes from '@/constantes/routes'
import { pdf } from '@react-pdf/renderer'

/**
 * Télécharge le PDF des identifiants d'un administrateur (email + mot de passe
 * temporaire), à lui remettre en main propre : même document que pour les membres.
 */
export async function downloadAdminCredentialsPdf(params: {
  matricule: string
  email: string | null
  temporaryPassword: string
}) {
  const loginUrl = typeof window !== 'undefined' ? new URL(routes.public.login, window.location.origin).toString() : undefined
  const blob = await pdf(
    <IdentifiantsMembrePDF
      recipient="administrateur"
      loginUrl={loginUrl}
      data={{
        matricule: params.matricule,
        email: params.email,
        identifiant: params.email || params.matricule,
        motDePasse: params.temporaryPassword,
      }}
    />,
  ).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `identifiants-admin-${params.matricule.replace(/\s+/g, '-')}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
