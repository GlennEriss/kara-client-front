export const PROSPECTING_ROLE = 'AgentProspection'

export function isProspectingAccount(data: Record<string, unknown> | undefined) {
  return data?.role === PROSPECTING_ROLE ||
    (Array.isArray(data?.roles) && data.roles.includes(PROSPECTING_ROLE))
}
